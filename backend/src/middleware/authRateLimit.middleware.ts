import type { Request, Response, NextFunction } from 'express';
import { redis } from '../../libs/redis.js';
import { createLogger } from '../../libs/logger.js';

const log = createLogger('authRateLimit');

const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

// Use Express's `req.ip`, which derives the client IP from X-Forwarded-For only
// as far as the trusted proxy hops (see `app.set('trust proxy', ...)`). This is
// not spoofable past our own proxy chain, unlike reading the raw header.
function getClientIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
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
  } catch (error) {
    // Redis failure — fail CLOSED for auth. Unlike the general API limiter
    // (which favours availability), losing brute-force protection on
    // login/reset is a security risk, so we reject rather than silently allow
    // unlimited attempts. Logged at error level so the outage alerts.
    log.error({ err: error }, 'auth rate limiter error — failing closed (503)');
    return res.status(503).json({
      message: 'Service temporarily unavailable. Please try again shortly.',
    });
  }
};
