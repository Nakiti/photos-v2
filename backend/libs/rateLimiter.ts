import { redis } from "./redis.js";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getGalleryUploadLimit(galleryId: string): Promise<number> {
  const cacheKey = `gallery:${galleryId}:uploadLimit`;
  const cached = await redis.get(cacheKey);
  if (cached !== null) return parseInt(cached, 10);

  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { uploadLimitPerHour: true },
  });
  const limit = gallery?.uploadLimitPerHour ?? 10;
  await redis.setex(cacheKey, 3600, limit.toString());
  return limit;
}

// Atomically removes stale entries, checks count, and if under limit adds a new entry.
// Returns [allowed (1=yes, 0=no), newCount]
const CHECK_AND_RECORD_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local ttl = tonumber(ARGV[5])

redis.call('zremrangebyscore', key, 0, now - window)
local count = redis.call('zcard', key)

if count < limit then
  redis.call('zadd', key, now, member)
  redis.call('expire', key, ttl)
  return {1, count + 1}
else
  return {0, count}
end
`;

/**
 * Atomically checks the upload limit and records the upload if allowed.
 * Eliminates the TOCTOU race condition between separate check and record operations.
 * This is the authoritative rate-limit gate — use this instead of checkUploadLimit + recordUpload.
 */
export const checkAndRecordUpload = async (
  userId: string,
  galleryId: string,
): Promise<{ allowed: boolean; currentCount: number; limit: number }> => {
  const key = `limit:group:${galleryId}:user:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const ttlSec = Math.ceil(windowMs / 1000) + 60;
  const limit = await getGalleryUploadLimit(galleryId);
  const member = `${now}-${Math.random()}`;

  const result = await redis.eval(
    CHECK_AND_RECORD_LUA,
    1,
    key,
    String(now),
    String(windowMs),
    String(limit),
    member,
    String(ttlSec),
  ) as [number, number];

  return {
    allowed: result[0] === 1,
    currentCount: result[1],
    limit,
  };
};

/**
 * Read-only limit check used by middleware for fast early rejection.
 * Not atomic with recording — use checkAndRecordUpload() as the authoritative gate.
 */
export const checkUploadLimit = async (userId: string, galleryId: string) => {
  const key = `limit:group:${galleryId}:user:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = await getGalleryUploadLimit(galleryId);

  const [, count] = await redis.multi()
    .zremrangebyscore(key, 0, now - windowMs)
    .zcard(key)
    .exec() as [any, number];

  return { allowed: count < limit, currentCount: count, limit };
};
