const fs = require('node:fs/promises');
const { Worker } = require('bullmq');
const redis = require('../config/redis.js');
const prisma = require('../config/prisma.js');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// How many PDFs to process at the same time.
// Keep this at 1 while using local Ollama - it can only really work on one
// thing at a time anyway, so more concurrency just adds memory pressure.
const CONCURRENCY = 1;

/**
 * Send one PDF to the Python AI service, which does the slow work:
 * extract text -> chunk -> embed -> store in Qdrant.
 */
async function sendToAiService(filePath, fileName, qdrantDocId, userId) {
    const fileBuffer = await fs.readFile(filePath);

    // Node 18+ has FormData/Blob built in, so no extra library needed here.
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);
    formData.append('document_id', qdrantDocId);
    // Stamped onto every chunk in Qdrant - this is what search filters on,
    // so getting it wrong would expose one user's document to another.
    formData.append('user_id', userId);

    const response = await fetch(`${AI_SERVICE_URL}/ingest`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        // Throwing here makes BullMQ retry the job (3 attempts, see the queue config).
        const detail = await response.text();
        throw new Error(`AI service returned ${response.status}: ${detail}`);
    }

    return response.json();
}

/**
 * Handle a single job. One job = one PDF.
 * Everything in here used to run inside the upload HTTP request.
 */
async function processDocument(job) {
    const { documentId, qdrantDocId, filePath, fileName, userId } = job.data;

    console.log(`[worker] started "${fileName}" (document ${documentId})`);

    // 0. The same job can be delivered twice. If the worker is killed after
    //    finishing but before BullMQ records the completion, the job counts as
    //    "stalled" and gets retried. Re-running it would hit the temp file we
    //    already deleted, and mark a perfectly good document as FAILED.
    //    So check the current state before doing anything destructive.
    const existing = await prisma.document.findUnique({
        where: { id: documentId },
        select: { status: true },
    });

    if (!existing) {
        console.log(`[worker] document ${documentId} no longer exists, skipping`);
        return;
    }

    if (existing.status === 'READY') {
        console.log(`[worker] "${fileName}" is already READY, skipping duplicate job`);
        return;
    }

    // 1. Mark PROCESSING so a polling client can see it moved off the queue.
    await prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
    });

    // 2. The slow part. Takes seconds to minutes for a large PDF.
    await sendToAiService(filePath, fileName, qdrantDocId, userId);

    // 3. Mark READY - the document can now be queried.
    await prisma.document.update({
        where: { id: documentId },
        data: {
            status: 'READY',
            processedAt: new Date(),
            errorMessage: null,
        },
    });

    // 4. The uploaded temp file has been embedded, so it is no longer needed.
    //    force:true means "do not throw if it is already gone".
    await fs.rm(filePath, { force: true });

    console.log(`[worker] finished "${fileName}"`);
}

const documentWorker = new Worker('document-processing', processDocument, {
    connection: redis,
    concurrency: CONCURRENCY,
});

documentWorker.on('completed', (job) => {
    console.log(`[worker] job ${job.id} completed`);
});

documentWorker.on('failed', async (job, err) => {
    if (!job) {
        console.error('[worker] a job failed before it could be loaded:', err);
        return;
    }

    const attemptsAllowed = job.opts.attempts || 1;
    console.error(
        `[worker] job ${job.id} failed (attempt ${job.attemptsMade}/${attemptsAllowed}):`,
        err.message
    );

    // BullMQ fires this event on every failed attempt. Only write FAILED to the
    // database once all the retries are used up - before that it may still succeed.
    if (job.attemptsMade < attemptsAllowed) {
        return;
    }

    try {
        await prisma.document.update({
            where: { id: job.data.documentId },
            data: {
                status: 'FAILED',
                errorMessage: err.message.slice(0, 1000),
            },
        });
    } catch (updateError) {
        console.error('[worker] could not save FAILED status:', updateError);
    }
});

module.exports = documentWorker;
