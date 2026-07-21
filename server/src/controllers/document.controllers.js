const crypto = require('node:crypto');
const Qdrant = require('../config/qdrant.js');
const documentQueue = require('../queues/document.queue.js');
const prisma = require('../config/prisma.js');

const home = (req, res) => {
    res.send("Welcome to documind");
};

const createCollection = async (req, res) => {
    try {
        const exists = await Qdrant.collectionExists("pdf-docs");
        if (exists.exists) {
            return res.status(200).json({
                success: true,
                message: "Collection already exists",
            });
        }

        await Qdrant.createCollection("pdf-docs", {
            vectors: {
                size: 768,
                distance: "Cosine"
            }
        });
        res.status(200).json({
            success: true,
            message: "Collection created successfully",
        });
    } catch (error) {
        console.error("Error creating collection:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create collection",
        });
    }
};

const uploadDocument = async (req, res) => {
    try {
        if (!req.files?.length) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded',
            });
        }

        const queuedDocuments = [];

        for (const file of req.files) {
            const document = await prisma.document.create({
                data: {
                    title: file.originalname,
                    originalName: file.originalname,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                    qdrantDocId: crypto.randomUUID(),
                    userId: req.user.id,
                },
            });

            const job = await documentQueue.add('ingest-document', {
                documentId: document.id,
                qdrantDocId: document.qdrantDocId,
                filePath: file.path,
                fileName: file.originalname,
            });

            queuedDocuments.push({
                id: document.id,
                title: document.title,
                originalName: document.originalName,
                status: document.status,
                jobId: job.id,
            });
        }

        // 202 Accepted = "I took your files, but I am not done with them yet".
        // The client should now poll GET /documents/:id until status is READY.
        res.status(202).json({
            success: true,
            message: 'Documents queued for processing',
            documents: queuedDocuments,
        });
    } catch (error) {
        console.error("Error is:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// GET /documents/:id
// The client calls this on a timer after uploading, until status is READY or FAILED.
const getDocumentStatus = async (req, res) => {
    try {
        const document = await prisma.document.findFirst({
            // userId in the filter matters: without it, anyone could read
            // the status of anyone else's document just by guessing an id.
            where: { id: req.params.id, userId: req.user.id },
            select: {
                id: true,
                title: true,
                originalName: true,
                status: true,
                errorMessage: true,
                uploadedAt: true,
                processedAt: true,
            },
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found',
            });
        }

        res.status(200).json({ success: true, document });
    } catch (error) {
        console.error('Error fetching document status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch document status',
        });
    }
};

// GET /documents
const listDocuments = async (req, res) => {
    try {
        const documents = await prisma.document.findMany({
            where: { userId: req.user.id },
            select: {
                id: true,
                title: true,
                originalName: true,
                fileSize: true,
                status: true,
                errorMessage: true,
                uploadedAt: true,
                processedAt: true,
            },
            orderBy: { uploadedAt: 'desc' },
        });

        res.status(200).json({ success: true, documents });
    } catch (error) {
        console.error('Error listing documents:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list documents',
        });
    }
};

module.exports = {
    createCollection,
    uploadDocument,
    getDocumentStatus,
    listDocuments,
    home
};
