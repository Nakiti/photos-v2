import type { Request, Response, NextFunction } from 'express';
import { redis } from '../../libs/redis.js';
import { createLogger } from '../../libs/logger.js';

const log = createLogger('apiRateLimit');

// Baseline, coarse safety net applied to every API route. Stricter, more
// specific limiters still apply on top of this (auth routes, upload confirm).
const WINDOW_SECONDS = Number(process.env.API_RATE_LIMIT_WINDOW_SECONDS) || 60;
const MAX_REQUESTS = Number(process.env.API_RATE_LIMIT_MAX) || 300;

// Mirrors authRateLimit.middleware.ts. Uses `req.ip`, which respects the
// configured `trust proxy` hop count and so isn't spoofable past our own proxy
// chain (HARD-4).
function getClientIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

// Prefer a stable per-user identity when the request is authenticated so a
// single user behind a shared NAT/IP isn't throttled by their neighbours;
// fall back to IP for unauthenticated traffic.
function getIdentifier(req: Request): string {
  const userId = (req as any).user?.id as string | undefined;
  if (userId) return `user:${userId}`;
  return `ip:${getClientIp(req)}`;
}

export const apiRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const key = `api:ratelimit:${getIdentifier(req)}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      // First request in this window — set the expiry.
      await redis.expire(key, WINDOW_SECONDS);
    }

    if (count > MAX_REQUESTS) {
      const ttl = await redis.ttl(key);
      const retryAfter = ttl > 0 ? ttl : WINDOW_SECONDS;
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        message: 'Too many requests. Please slow down and try again later.',
        retryAfterSeconds: retryAfter,
      });
    }

    next();
  } catch (error) {
    // Redis failure — fail open so the API stays available if Redis is down.
    log.error({ err: error }, 'api rate limiter error, failing open');
    next();
  }
};
