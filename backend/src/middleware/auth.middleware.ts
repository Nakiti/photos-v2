// src/api/middlewares/auth.middleware.ts

import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { PrismaClient } from '@prisma/client';
import config from '../../config/config.js';

const prisma = new PrismaClient();

type CachedUser = { id: string; email: string };

// Short-TTL in-process cache for the per-request user lookup. Every authenticated
// request otherwise hits the DB just to resolve { id, email } from the token's
// userId; under load that is a lot of identical point reads. We cache the
// positive result for a few seconds. Trade-off: a user deleted mid-window stays
// authenticated until the entry expires (TTL kept small to bound that). The cache
// is per-process and not shared across instances — that's fine for this purpose.
const USER_CACHE_TTL_MS =
  (Number(process.env.JWT_USER_CACHE_TTL_SECONDS) || 30) * 1000;

const userCache = new Map<string, { user: CachedUser; expiresAt: number }>();

async function resolveUser(userId: string): Promise<CachedUser | null> {
  const now = Date.now();
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }
  if (cached) {
    // Expired — drop it so the map doesn't accumulate stale entries.
    userCache.delete(userId);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    // Select only necessary fields
    select: { id: true, email: true },
  });

  // Cache positives only; negative results (deleted/unknown user) are not cached
  // so a recreated/restored account isn't shadowed by a "not found" entry.
  if (user) {
    userCache.set(userId, { user, expiresAt: now + USER_CACHE_TTL_MS });
  }
  return user;
}

const jwtOptions = {
  // Tell passport to extract the JWT from the 'Authorization: Bearer <token>' header
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  // Use the secret key from your config to verify the token's signature
  secretOrKey: config.jwtSecret,
};

// Define the JWT strategy
const strategy = new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    // 'payload' contains the decoded JWT content (e.g., { userId: '...' })
    const user = await resolveUser(payload.userId);

    if (user) {
      // If user found, pass the user object to the next middleware/route handler
      return done(null, user);
    } else {
      // If user not found (e.g., deleted after token was issued)
      return done(null, false);
    }
  } catch (error) {
    return done(error, false);
  }
});

/**
 * Removes a user from the auth cache. Call after mutations that should
 * immediately invalidate a session (e.g. account deletion) so the change isn't
 * masked by the short cache window.
 */
export function invalidateUserCache(userId: string): void {
  userCache.delete(userId);
}

// Configure passport to use this strategy
passport.use(strategy);

// Export the middleware function to protect routes
// It uses passport.authenticate with 'jwt' strategy
// session: false means we are not using cookies/sessions, only tokens
export const isAuthenticated = passport.authenticate('jwt', { session: false });

// Export passport itself if needed elsewhere (e.g., initial setup in server.ts)
export { passport };