const redis = require('../config/redis.js');

/**
 * Fixed-window rate limit, counted per user in Redis.
 *
 * Redis rather than memory because the limit has to hold across restarts and
 * across more than one API process - an in-memory counter would reset on every
 * deploy and be trivially bypassed by a second instance.
 *
 * Applied to the expensive routes: a query occupies the AI service for tens of
 * seconds, and an upload puts real work on the queue.
 */
function rateLimit({ name, limit, windowSeconds }) {
    return async (req, res, next) => {
        // Rate limiting must never take the API down. If Redis is unreachable
        // the request is allowed through - a brief lapse in limiting is much
        // cheaper than refusing every request.
        try {
            const window = Math.floor(Date.now() / 1000 / windowSeconds);
            const key = `ratelimit:${name}:${req.user.id}:${window}`;

            const used = await redis.incr(key);
            if (used === 1) {
                await redis.expire(key, windowSeconds);
            }

            const remaining = Math.max(0, limit - used);
            res.header('X-RateLimit-Limit', String(limit));
            res.header('X-RateLimit-Remaining', String(remaining));

            if (used > limit) {
                const retryAfter = windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds);
                res.header('Retry-After', String(retryAfter));
                return res.status(429).json({
                    success: false,
                    message: `Too many requests. Try again in ${retryAfter}s.`,
                });
            }

            return next();
        } catch (error) {
            console.error('Rate limit check failed, allowing request:', error.message);
            return next();
        }
    };
}

// A query holds the AI service for 20s or more, so this is about protecting
// the service, not metering usage - quotas live in usage.controllers.
const queryLimiter = rateLimit({ name: 'query', limit: 20, windowSeconds: 60 });
const uploadLimiter = rateLimit({ name: 'upload', limit: 30, windowSeconds: 3600 });

module.exports = { rateLimit, queryLimiter, uploadLimiter };
