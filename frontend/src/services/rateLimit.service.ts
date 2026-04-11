import { Database, Q } from '@nozbe/watermelondb';
import PhotoAttempt from '../db/models/PhotoAttempt';
import Photo from '../db/models/Photo';

const UPLOAD_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Checks if a user has exceeded their local upload limit for a gallery.
 * @param database - WatermelonDB instance
 * @param galleryId - Gallery ID
 * @param userId - User ID
 * @param limit - Upload limit per hour (defaults to 10)
 * @returns Object with allowed status, current count, and limit
 */
export async function checkLocalUploadLimit(
  database: Database,
  galleryId: string,
  userId: string,
  limit: number = 200
): Promise<{ allowed: boolean; currentCount: number; limit: number }> {
  const attemptsCollection = database.collections.get<PhotoAttempt>('photo_attempts');
  const now = Date.now();
  const oneHourAgo = now - UPLOAD_WINDOW_MS;

  // Query for attempts within the last hour that aren't rejected
  const attempts = await attemptsCollection
    .query(
      Q.and(
        Q.where('gallery_id', galleryId),
        Q.where('user_id', userId),
        Q.where('attempted_at', Q.gte(oneHourAgo)),
        Q.or(
          Q.where('status', 'pending'),
          Q.where('status', 'confirmed')
        )
      )
    )
    .fetch();

  const currentCount = attempts.length;
  const allowed = currentCount < limit;

  return {
    allowed,
    currentCount,
    limit,
  };
}

/**
 * Records a local upload attempt.
 * @param database - WatermelonDB instance
 * @param galleryId - Gallery ID
 * @param userId - User ID
 * @param photoId - Optional photo ID to link the attempt
 * @returns The created PhotoAttempt record
 */
export async function recordLocalAttempt(
  database: Database,
  galleryId: string,
  userId: string,
  photoId?: string
): Promise<PhotoAttempt> {
  const attemptsCollection = database.collections.get<PhotoAttempt>('photo_attempts');
  
  return database.write(async () => {
    return attemptsCollection.create((record) => {
      record.galleryId = galleryId;
      record.userId = userId;
      record.attemptedAt = Date.now();
      record.status = 'pending';
      if (photoId) {
        record.photoId = photoId;
      }
    });
  });
}

/**
 * Marks an attempt as confirmed (successfully uploaded).
 * @param database - WatermelonDB instance
 * @param attemptId - PhotoAttempt record ID
 * @param photoId - Photo ID to link
 */
export async function markAttemptConfirmed(
  database: Database,
  attemptId: string,
  photoId: string
): Promise<void> {
  const attemptsCollection = database.collections.get<PhotoAttempt>('photo_attempts');
  
  await database.write(async () => {
    const attempt = await attemptsCollection.find(attemptId);
    await attempt.update((record) => {
      record.status = 'confirmed';
      record.photoId = photoId;
    });
  });
}

/**
 * Marks an attempt as rejected by the server.
 * @param database - WatermelonDB instance
 * @param attemptId - PhotoAttempt record ID
 * @param retryAfter - Timestamp when retry is allowed
 */
export async function markAttemptRejected(
  database: Database,
  attemptId: string,
  retryAfter?: number
): Promise<void> {
  const attemptsCollection = database.collections.get<PhotoAttempt>('photo_attempts');
  
  await database.write(async () => {
    const attempt = await attemptsCollection.find(attemptId);
    await attempt.update((record) => {
      record.status = 'rejected';
      record.serverRejected = true;
      if (retryAfter) {
        record.retryAfter = retryAfter;
      }
    });
  });
}

/**
 * Finds a pending attempt linked to a photo.
 * @param database - WatermelonDB instance
 * @param photoId - Photo ID
 * @returns PhotoAttempt or null
 */
export async function findAttemptByPhotoId(
  database: Database,
  photoId: string
): Promise<PhotoAttempt | null> {
  const attemptsCollection = database.collections.get<PhotoAttempt>('photo_attempts');
  
  const attempts = await attemptsCollection
    .query(
      Q.and(
        Q.where('photo_id', photoId),
        Q.where('status', 'pending')
      )
    )
    .fetch();

  return attempts[0] || null;
}

/**
 * Cleanup old attempts (older than 1 hour).
 * Should be run periodically in the background.
 * @param database - WatermelonDB instance
 */
export async function cleanupOldAttempts(database: Database): Promise<void> {
  const attemptsCollection = database.collections.get<PhotoAttempt>('photo_attempts');
  const oneHourAgo = Date.now() - UPLOAD_WINDOW_MS;

  const oldAttempts = await attemptsCollection
    .query(Q.where('attempted_at', Q.lt(oneHourAgo)))
    .fetch();

  if (oldAttempts.length > 0) {
    await database.write(async () => {
      await Promise.all(oldAttempts.map(attempt => attempt.markAsDeleted()));
    });
  }
}

/**
 * Gets remaining upload count for a user in a gallery.
 * @param database - WatermelonDB instance
 * @param galleryId - Gallery ID
 * @param userId - User ID
 * @param limit - Upload limit per hour (defaults to 10)
 * @returns Remaining count
 */
export async function getRemainingUploadCount(
  database: Database,
  galleryId: string,
  userId: string,
  limit: number = 200
): Promise<number> {
  const { currentCount } = await checkLocalUploadLimit(database, galleryId, userId, limit);
  return Math.max(0, limit - currentCount);
}

