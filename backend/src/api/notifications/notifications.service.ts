import admin from 'firebase-admin';
import { Prisma, PrismaClient } from '@prisma/client';
import { photoQueue } from '../../../libs/queue.js';
import { redis } from '../../../libs/redis.js';
import { createLogger } from '../../../libs/logger.js';

const log = createLogger('notifications');

type NotificationType = 'LIKE' | 'COMMENT' | 'INVITE' | 'SYSTEM';

const prisma = new PrismaClient();

// Initialise Firebase Admin once (no-op if already initialised).
// Credential source priority: FIREBASE_SERVICE_ACCOUNT_JSON (base64) > ADC.
// In production we standardize on the base64 env var (no file to mount or leak)
// or Application Default Credentials; the on-disk FIREBASE_SERVICE_ACCOUNT_PATH
// is only honoured outside production for local-dev convenience.
if (!admin.apps.length) {
  const isProduction = process.env.NODE_ENV === 'production';
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountJson) {
    const decoded = Buffer.from(serviceAccountJson, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(decoded) as admin.ServiceAccount;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else if (serviceAccountPath && !isProduction) {
    const serviceAccount = (await import(serviceAccountPath, { assert: { type: 'json' } })).default;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    if (isProduction && serviceAccountPath) {
      // The file path is intentionally ignored in production — warn so a
      // misconfiguration surfaces instead of silently mounting a credential file.
      log.warn(
        'FIREBASE_SERVICE_ACCOUNT_PATH is ignored in production; set FIREBASE_SERVICE_ACCOUNT_JSON (base64) or use ADC. Falling back to Application Default Credentials.',
      );
    }
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var or GCP metadata server
    admin.initializeApp();
  }
}

/**
 * Creates a notification record in the database.
 */
export async function createNotificationRecord(
  recipientId: string,
  actorId: string,
  type: NotificationType,
  data?: Record<string, unknown>,
  referenceId?: string,
  referenceType?: string
) {
  return await prisma.notification.create({
    data: {
      recipientId,
      actorId,
      type,
      data: data !== undefined ? (data as Prisma.InputJsonValue) : Prisma.DbNull,
      referenceId: referenceId || null,
      referenceType: referenceType || null,
    },
  });
}

/**
 * Sends push notifications via FCM and returns a list of invalid tokens
 * that should be removed from the Device table.
 */
export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<string[]> {
  if (tokens.length === 0) return [];

  const invalidTokens: string[] = [];

  // FCM sendEachForMulticast handles up to 500 tokens per call
  const CHUNK_SIZE = 500;
  for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + CHUNK_SIZE);
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        apns: { payload: { aps: { sound: 'default' } } },
        android: { priority: 'high' },
      });

      response.responses.forEach((res, index) => {
        if (!res.success) {
          const code = res.error?.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(chunk[index]!);
          } else {
            log.error({ token: chunk[index], err: res.error }, 'FCM error for token');
          }
        }
      });
    } catch (error) {
      log.error({ err: error }, 'FCM sendEachForMulticast error');
    }
  }

  return invalidTokens;
}

const BUFFER_DELAY_MS = 60_000; // 60s quiet period after the last upload

/**
 * Throttle-aware enqueue for new photo notifications, keyed per gallery.
 * - First upload in a gallery window: send an immediate notification.
 * - Subsequent uploads within the window: buffer the count and debounce the
 *   trailing check. The "X more photos" notification fires 60s after the LAST
 *   upload in the gallery, preventing per-uploader notification storms.
 */
export async function smartThrottleNewPhoto(
  galleryId: string,
  uploaderName: string,
  galleryName?: string,
  photoId?: string,
) {
  // Keys are per-gallery so all uploaders share one throttle window per gallery.
  const lockKey  = `photo:lock:${galleryId}`;
  const bufferKey = `photo:buffer:${galleryId}`;
  const jobIdKey  = `photo:buffer:job:${galleryId}`;
  const jobPayload = { galleryId, galleryName: galleryName || '' };

  const isLocked = await redis.get(lockKey);

  if (!isLocked) {
    // First upload in this gallery window — send immediately and open the window.
    await photoQueue.add('process-new-photo', {
      galleryId,
      photo: { id: photoId, uploaderName, galleryName: galleryName || '' },
    });

    await redis.set(lockKey, '1', 'EX', Math.ceil(BUFFER_DELAY_MS / 1000) + 10);

    const job = await photoQueue.add('check-buffer', jobPayload, { delay: BUFFER_DELAY_MS });
    await redis.set(jobIdKey, job.id as string, 'EX', 3600);
  } else {
    // Subsequent upload — increment gallery buffer and debounce the trailing check.
    const newCount = await redis.incr(bufferKey);
    if (newCount === 1) {
      await redis.expire(bufferKey, 3600);
    }

    await redis.expire(lockKey, Math.ceil(BUFFER_DELAY_MS / 1000) + 10);

    const existingJobId = await redis.get(jobIdKey);
    if (existingJobId) {
      const existingJob = await photoQueue.getJob(existingJobId);
      await existingJob?.remove().catch(() => {});
    }
    const newJob = await photoQueue.add('check-buffer', jobPayload, { delay: BUFFER_DELAY_MS });
    await redis.set(jobIdKey, newJob.id as string, 'EX', 3600);
  }
}

/**
 * Get notifications for a user with pagination and filtering
 */
export async function getNotificationsForUser(
  userId: string,
  filters: {
    limit?: number;
    offset?: number;
    isRead?: boolean;
  }
) {
  const { limit = 20, offset = 0, isRead } = filters;

  const where: any = {
    recipientId: userId,
  };

  if (isRead !== undefined) {
    where.isRead = isRead;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + notifications.length < total,
    },
  };
}

/**
 * Mark a notification as read
 */
export async function markAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      recipientId: userId,
    },
  });

  if (!notification) {
    return null;
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarUrl: true,
        },
      },
    },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      recipientId: userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return result.count;
}
