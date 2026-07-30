const crypto = require('node:crypto');
const prisma = require('../config/prisma.js');
const { hashApiKey, MAX_API_KEYS } = require('../middlewares/auth.middlewares.js');

function generateApiKey() {
    return `cwp_${crypto.randomBytes(32).toString('hex')}`;
}

const createApiKey = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Key name is required',
            });
        }

        const existingCount = await prisma.apiKey.count({
            where: { userId: req.user.id },
        });

        if (existingCount >= MAX_API_KEYS) {
            return res.status(400).json({
                success: false,
                message: `Maximum of ${MAX_API_KEYS} API keys allowed`,
            });
        }

        const rawKey = generateApiKey();
        const apiKey = await prisma.apiKey.create({
            data: {
                name: name.trim(),
                hashedKey: hashApiKey(rawKey),
                // The hash cannot be reversed, so keep the last 4 characters
                // now - it is the only way to identify a key in the UI later.
                maskedKey: `cwp_******${rawKey.slice(-4)}`,
                userId: req.user.id,
            },
            select: {
                id: true,
                name: true,
                maskedKey: true,
                createdAt: true,
            },
        });

        return res.status(201).json({
            success: true,
            message: 'API key created. Store it securely — it will not be shown again.',
            key: rawKey,
            apiKey,
        });
    } catch (error) {
        console.error('Error creating API key:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create API key',
        });
    }
};

const listApiKeys = async (req, res) => {
    try {
        const apiKeys = await prisma.apiKey.findMany({
            where: { userId: req.user.id },
            select: {
                id: true,
                name: true,
                maskedKey: true,
                createdAt: true,
                lastUsedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({
            success: true,
            apiKeys,
        });
    } catch (error) {
        console.error('Error listing API keys:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to list API keys',
        });
    }
};

const revokeApiKey = async (req, res) => {
    try {
        const { id } = req.params;

        const apiKey = await prisma.apiKey.findFirst({
            where: { id, userId: req.user.id },
        });

        if (!apiKey) {
            return res.status(404).json({
                success: false,
                message: 'API key not found',
            });
        }

        await prisma.apiKey.delete({ where: { id } });

        return res.status(200).json({
            success: true,
            message: 'API key revoked',
        });
    } catch (error) {
        console.error('Error revoking API key:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to revoke API key',
        });
    }
};

module.exports = {
    createApiKey,
    listApiKeys,
    revokeApiKey,
};
