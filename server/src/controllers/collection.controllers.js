const prisma = require('../config/prisma.js');

const createCollection = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Collection name is required',
            });
        }

        const collection = await prisma.collection.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                userId: req.user.id,
            },
        });

        res.status(201).json({ success: true, collection });
    } catch (error) {
        // P2002 = unique constraint, i.e. this user already has a collection
        // with that name (see @@unique([userId, name]) in schema.prisma).
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                message: 'You already have a collection with that name',
            });
        }

        console.error('Error creating collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create collection',
        });
    }
};

const listCollections = async (req, res) => {
    try {
        const collections = await prisma.collection.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                // Handy for the UI: "3 documents, 2 ready"
                _count: { select: { documents: true } },
                documents: {
                    select: { id: true, originalName: true, status: true },
                },
            },
        });

        res.status(200).json({ success: true, collections });
    } catch (error) {
        console.error('Error listing collections:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list collections',
        });
    }
};

// PATCH /collections/:id/documents  { documentIds: [...] }
// Moves documents into this collection. Both the collection and every document
// are checked against req.user.id first.
const addDocumentsToCollection = async (req, res) => {
    try {
        const { id } = req.params;
        const { documentIds } = req.body;

        if (!Array.isArray(documentIds) || !documentIds.length) {
            return res.status(400).json({
                success: false,
                message: 'documentIds must be a non-empty array',
            });
        }

        const collection = await prisma.collection.findFirst({
            where: { id, userId: req.user.id },
        });

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        // updateMany with userId in the where clause means documents that are
        // not this user's are simply not matched, rather than being moved.
        const result = await prisma.document.updateMany({
            where: { id: { in: documentIds }, userId: req.user.id },
            data: { collectionId: id },
        });

        res.status(200).json({
            success: true,
            message: `Added ${result.count} document(s) to '${collection.name}'`,
            added: result.count,
        });
    } catch (error) {
        console.error('Error adding documents to collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add documents to collection',
        });
    }
};

// Deletes the collection only. The documents survive with collectionId = null,
// because onDelete: SetNull is set on the relation in schema.prisma.
const deleteCollection = async (req, res) => {
    try {
        const { id } = req.params;

        const collection = await prisma.collection.findFirst({
            where: { id, userId: req.user.id },
        });

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        await prisma.collection.delete({ where: { id } });

        res.status(200).json({
            success: true,
            message: `Deleted collection '${collection.name}'. Its documents were kept.`,
        });
    } catch (error) {
        console.error('Error deleting collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete collection',
        });
    }
};

module.exports = {
    createCollection,
    listCollections,
    addDocumentsToCollection,
    deleteCollection,
};
