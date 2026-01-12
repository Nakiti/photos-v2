import type { Request, Response, NextFunction } from 'express';
import { checkUploadLimit } from '../../libs/rateLimiter.js';

/**
 * Middleware to check upload rate limits per user per gallery.
 * Checks if the user has exceeded their hourly upload limit for the gallery.
 * Returns 429 Too Many Requests if limit is exceeded.
 * Note: Uploads are recorded in the service layer after successful upload.
 */
export const checkUploadRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).user?.id as string | undefined;
  const { galleryId } = req.params as { galleryId: string };

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!galleryId) {
    return res.status(400).json({ message: 'Gallery ID is required' });
  }

  try {
    const result = await checkUploadLimit(userId, galleryId);

    if (!result.allowed) {
      // Set Retry-After header (in seconds)
      res.setHeader('Retry-After', '3600'); // 1 hour
      
      return res.status(429).json({
        message: 'Upload limit exceeded',
        error: 'Too many uploads',
        currentCount: result.currentCount,
        limit: result.limit,
        retryAfter: 3600, // seconds until window resets
      });
    }

    // Attach rate limit info to request for potential logging
    (req as any).rateLimitInfo = {
      currentCount: result.currentCount,
      limit: result.limit,
    };

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // On error, allow the request to proceed (fail open)
    // In production, you might want to fail closed instead
    next();
  }
};

