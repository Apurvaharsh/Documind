const prisma = require('../config/prisma.js');
const { titleFrom } = require('./conversation.controllers.js');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Turns sent to the model for follow-up resolution. Kept small so the history
// does not crowd out the retrieved chunks.
const HISTORY_TURNS = 3;

/**
 * Find the thread this question belongs to, or start one.
 * Checked against userId so a guessed id cannot append to someone else's thread.
 */
async function resolveConversation(userId, conversationId, question, scope) {
    if (conversationId) {
        const existing = await prisma.conversation.findFirst({
            where: { id: conversationId, userId },
        });

        if (!existing) {
            return { error: 'Conversation not found', status: 404 };
        }

        return { conversation: existing };
    }

    const conversation = await prisma.conversation.create({
        data: {
            title: titleFrom(question),
            userId,
            documentId: scope.documentId || null,
            collectionId: scope.collectionId || null,
        },
    });

    return { conversation, isNew: true };
}

/**
 * Work out which documents a question should search.
 *
 * The client can ask in three ways:
 *   { documentId }   -> just that one document
 *   { collectionId } -> every ready document in that collection (cross-document)
 *   neither          -> every ready document the user owns
 *
 * Returns the qdrantDocId values, because that is what is stored in the Qdrant
 * payload as "documentId" - not the Prisma row id.
 */
async function resolveScope(userId, { documentId, collectionId }) {
    if (documentId) {
        const document = await prisma.document.findFirst({
            where: { id: documentId, userId },
        });

        if (!document) {
            return { error: 'Document not found', status: 404 };
        }

        if (document.status !== 'READY') {
            return {
                error: `Document is not ready yet (status: ${document.status})`,
                status: 409,
            };
        }

        return { qdrantDocIds: [document.qdrantDocId], scope: 'document' };
    }

    if (collectionId) {
        const collection = await prisma.collection.findFirst({
            where: { id: collectionId, userId },
            include: { documents: { where: { status: 'READY' } } },
        });

        if (!collection) {
            return { error: 'Collection not found', status: 404 };
        }

        return {
            qdrantDocIds: collection.documents.map((doc) => doc.qdrantDocId),
            scope: 'collection',
        };
    }

    const documents = await prisma.document.findMany({
        where: { userId, status: 'READY' },
        select: { qdrantDocId: true },
    });

    return { qdrantDocIds: documents.map((doc) => doc.qdrantDocId), scope: 'all' };
}

const askQuestion = async (req, res) => {
    try {
        const { question, documentId, collectionId, conversationId } = req.body;

        if (!question || typeof question !== 'string' || !question.trim()) {
            return res.status(400).json({
                success: false,
                message: 'A question is required',
            });
        }

        const scope = await resolveScope(req.user.id, { documentId, collectionId });
        if (scope.error) {
            return res.status(scope.status).json({
                success: false,
                message: scope.error,
            });
        }

        if (!scope.qdrantDocIds.length) {
            return res.status(200).json({
                success: true,
                message: 'Nothing to search',
                text: 'You have no processed documents yet. Upload a PDF and wait for it to reach READY.',
                sources: [],
            });
        }

        const resolved = await resolveConversation(req.user.id, conversationId, question.trim(), {
            documentId,
            collectionId,
        });

        if (resolved.error) {
            return res.status(resolved.status).json({
                success: false,
                message: resolved.error,
            });
        }

        const { conversation } = resolved;

        // Earlier turns, oldest first, so a follow-up can be understood.
        const previous = await prisma.query.findMany({
            where: { conversationId: conversation.id, answer: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: HISTORY_TURNS,
            select: { question: true, answer: true },
        });
        const history = previous.reverse();

        const startedAt = Date.now();

        const aiResponse = await fetch(`${AI_SERVICE_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: question.trim(),
                // Sent as well as the document ids. The Python side always filters
                // on user_id, so even a bug in the id list above cannot return
                // another user's chunks.
                user_id: req.user.id,
                document_ids: scope.qdrantDocIds,
                history,
            }),
        });

        if (!aiResponse.ok) {
            const detail = await aiResponse.text();
            throw new Error(`AI service returned ${aiResponse.status}: ${detail}`);
        }

        const data = await aiResponse.json();
        const responseMs = Date.now() - startedAt;

        // Keep a record of the exchange. Failing to log should not lose the
        // answer the user just waited for, so this is best-effort.
        try {
            await prisma.query.create({
                data: {
                    question: question.trim(),
                    answer: data.text,
                    sources: data.sources || [],
                    responseMs,
                    userId: req.user.id,
                    conversationId: conversation.id,
                    documentId: documentId || null,
                    collectionId: collectionId || null,
                },
            });

            // Bumps updatedAt, which orders the conversation list.
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: { updatedAt: new Date() },
            });
        } catch (logError) {
            console.error('Could not save query history:', logError.message);
        }

        res.status(200).json({
            success: true,
            message: data.message,
            text: data.text,
            sources: data.sources || [],
            scope: scope.scope,
            documentsSearched: scope.qdrantDocIds.length,
            responseMs,
            conversationId: conversation.id,
            conversationTitle: conversation.title,
        });
    } catch (error) {
        console.error('Error answering question:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate an answer',
        });
    }
};

const listQueries = async (req, res) => {
    try {
        const queries = await prisma.query.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        res.status(200).json({ success: true, queries });
    } catch (error) {
        console.error('Error listing queries:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list queries',
        });
    }
};

module.exports = {
    askQuestion,
    listQueries,
};
