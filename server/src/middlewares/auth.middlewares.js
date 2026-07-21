const crypto = require('node:crypto');
const { Clerk } = require('@clerk/clerk-sdk-node');
const prisma = require('../config/prisma.js');

const MAX_API_KEYS = 5;

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

function hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

async function upsertUserFromClerk(payload) {
    const clerkId = payload.sub;
    let email = payload.email;
    let name =
        payload.name ||
        [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
        null;
    let image = payload.image_url || payload.picture || null;

    if (!email) {
        const clerkUser = await clerk.users.getUser(clerkId);
        const primaryEmail = clerkUser.emailAddresses.find(
            (entry) => entry.id === clerkUser.primaryEmailAddressId
        );
        email = primaryEmail?.emailAddress;
        name =
            `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
            null;
        image = clerkUser.imageUrl;
    }

    if (!email) {
        throw new Error('Unable to resolve email for Clerk user');
    }

    return prisma.user.upsert({
        where: { clerkId },
        update: { email, name, image },
        create: { clerkId, email, name, image },
    });
}

async function authenticateWithClerk(authHeader) {
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
        return null;
    }

    const payload = await clerk.verifyToken(token);
    const user = await upsertUserFromClerk(payload);
    return { user, authMethod: 'clerk' };
}

async function authenticateWithApiKey(apiKeyHeader) {
    if (!apiKeyHeader) {
        return null;
    }

    const hashedKey = hashApiKey(apiKeyHeader.trim());
    const apiKey = await prisma.apiKey.findUnique({
        where: { hashedKey },
        include: { user: true },
    });

    if (!apiKey) {
        return null;
    }

    await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
    });

    return { user: apiKey.user, authMethod: 'api_key' };
}

const authenticate = async (req, res, next) => {
    try {
        const clerkResult = await authenticateWithClerk(req.headers.authorization);
        if (clerkResult) {
            req.user = clerkResult.user;
            req.authMethod = clerkResult.authMethod;
            return next();
        }

        const apiKeyResult = await authenticateWithApiKey(req.headers['x-api-key']);
        if (apiKeyResult) {
            req.user = apiKeyResult.user;
            req.authMethod = apiKeyResult.authMethod;
            return next();
        }

        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
        });
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
        });
    }
};

const requireClerkAuth = async (req, res, next) => {
    try {
        const clerkResult = await authenticateWithClerk(req.headers.authorization);
        if (!clerkResult) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        req.user = clerkResult.user;
        req.authMethod = clerkResult.authMethod;
        return next();
    } catch (error) {
        console.error('Clerk authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
        });
    }
};

module.exports = {
    authenticate,
    requireClerkAuth,
    hashApiKey,
    MAX_API_KEYS,
};
