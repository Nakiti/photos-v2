// src/api/middlewares/auth.middleware.ts

import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { PrismaClient } from '@prisma/client';
import config from '../../config/config.js';

const prisma = new PrismaClient();

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
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      // Select only necessary fields
      select: { id: true, email: true },
    });

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

// Configure passport to use this strategy
passport.use(strategy);

// Export the middleware function to protect routes
// It uses passport.authenticate with 'jwt' strategy
// session: false means we are not using cookies/sessions, only tokens
export const isAuthenticated = passport.authenticate('jwt', { session: false });

// Export passport itself if needed elsewhere (e.g., initial setup in server.ts)
export { passport };