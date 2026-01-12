import { useDatabase } from '@nozbe/watermelondb/react';
import { useEffect, useState, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import Gallery from '../db/models/Gallery';
import PhotoAttempt from '../db/models/PhotoAttempt';
import { checkLocalUploadLimit, getRemainingUploadCount } from '../services/rateLimit.service';
import { useAuth } from './useAuth';

/**
 * Hook to check upload rate limits for a gallery.
 * Observes gallery settings and local attempts in real-time.
 * @param galleryId - Gallery ID
 * @returns Rate limit state and info
 */
export function useUploadRateLimit(galleryId: string | null) {
  const database = useDatabase();
  const { user } = useAuth();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [attempts, setAttempts] = useState<PhotoAttempt[]>([]);
  const [canUpload, setCanUpload] = useState(true);
  const [currentCount, setCurrentCount] = useState(0);
  const [retryAfter, setRetryAfter] = useState<number | undefined>();

  // Observe gallery for rate limit settings
  useEffect(() => {
    if (!galleryId) {
      setGallery(null);
      return;
    }

    const galleriesCollection = database.collections.get<Gallery>('galleries');
    const subscription = galleriesCollection
      .findAndObserve(galleryId)
      .subscribe(setGallery);

    return () => subscription.unsubscribe();
  }, [database, galleryId]);

  // Observe attempts for this user/gallery
  useEffect(() => {
    if (!galleryId || !user?.id) {
      setAttempts([]);
      return;
    }

    const attemptsCollection = database.collections.get<PhotoAttempt>('photo_attempts');
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const subscription = attemptsCollection
      .query(
        Q.and(
          Q.where('gallery_id', galleryId),
          Q.where('user_id', user.id),
          Q.where('attempted_at', Q.gte(oneHourAgo))
        )
      )
      .observe()
      .subscribe(setAttempts);

    return () => subscription.unsubscribe();
  }, [database, galleryId, user?.id]);

  // Calculate rate limit state
  useEffect(() => {
    if (!galleryId || !user?.id || !gallery) {
      setCanUpload(true);
      setCurrentCount(0);
      return;
    }

    const limit = gallery.uploadLimitPerHour || 10;
    const pendingAttempts = attempts.filter(
      (a) => a.status === 'pending' || a.status === 'confirmed'
    );
    const rejectedAttempts = attempts.filter((a) => a.status === 'rejected');

    const count = pendingAttempts.length;
    const allowed = count < limit;

    // Find the earliest retry time from rejected attempts
    const retryTimes = rejectedAttempts
      .filter((a) => a.retryAfter)
      .map((a) => a.retryAfter!)
      .filter((t) => t > Date.now());

    const minRetryAfter = retryTimes.length > 0 ? Math.min(...retryTimes) : undefined;

    setCanUpload(allowed);
    setCurrentCount(count);
    setRetryAfter(minRetryAfter);
  }, [galleryId, user?.id, gallery, attempts]);

  const limit = gallery?.uploadLimitPerHour || 10;
  const remainingCount = Math.max(0, limit - currentCount);

  // Calculate minutes until retry
  const retryAfterMinutes = retryAfter
    ? Math.ceil((retryAfter - Date.now()) / 60000)
    : undefined;

  return {
    canUpload,
    currentCount,
    remainingCount,
    limit,
    retryAfter,
    retryAfterMinutes,
    isLoading: !gallery && !!galleryId,
  };
}

