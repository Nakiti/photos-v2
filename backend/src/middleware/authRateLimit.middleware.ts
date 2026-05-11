import type { Request, Response, NextFunction } from 'express';
import { redis } from '../../libs/redis.js';

const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return (forwarded.split(',')[0] ?? forwarded).trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

export const authRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const ip = getClientIp(req);
  const key = `auth:ratelimit:${ip}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      // First request in this window — set the expiry
      await redis.expire(key, WINDOW_SECONDS);
    }
    if (count > MAX_ATTEMPTS) {
      const ttl = await redis.ttl(key);
      res.setHeader('Retry-After', String(ttl));
      return res.status(429).json({
        message: 'Too many attempts. Please try again later.',
        retryAfterSeconds: ttl,
      });
    }
    next();
  } catch {
    // Redis failure — fail open so auth still works if Redis is down
    next();
  }
};
