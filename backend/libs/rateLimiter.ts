import { redis } from "./redis.js";

/**
 * Checks if a user has exceeded their upload limit for a gallery.
 * Does not record the upload - use recordUpload() separately.
 * @param userId The user ID
 * @param galleryId The gallery ID
 * @returns Object with allowed status, current count, and limit
 */
export const checkUploadLimit = async (userId: string, galleryId: string) => {
    const key = `limit:group:${galleryId}:user:${userId}`;
    const now = Date.now();
    const window = 60 * 60 * 1000; // 1 hour
    const limit = 10; // Default limit (will be configurable per gallery later)
    
    // Clean up old entries and get current count
    const [_, count] = await redis.multi()
        .zremrangebyscore(key, 0, now - window)
        .zcard(key)
        .exec() as [any, number];

    return {
        allowed: count < limit,
        currentCount: count,
        limit
    };
};

/**
 * Records an upload attempt for rate limiting purposes.
 * Should be called after checkUploadLimit() confirms the upload is allowed.
 * @param userId The user ID
 * @param galleryId The gallery ID
 */
export const recordUpload = async (userId: string, galleryId: string) => {
    const key = `limit:group:${galleryId}:user:${userId}`;
    const now = Date.now();
    
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    // Set expiry on the key (1 hour + some buffer)
    await redis.expire(key, 3600);
};