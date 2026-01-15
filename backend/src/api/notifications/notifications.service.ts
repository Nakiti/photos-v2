import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';
import { photoQueue } from '../../../libs/queue.js';
import { redis } from '../../../libs/redis.js';

type NotificationType = 'LIKE' | 'COMMENT' | 'INVITE' | 'SYSTEM';

const expo = new Expo();
const prisma = new PrismaClient();

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
      data: data ? (data as any) : null,
      referenceId: referenceId || null,
      referenceType: referenceType || null,
    },
  });
}

/**
 * Sends push notifications via Expo and returns a list of invalid tokens
 * that should be removed from the Device table.
 */
export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<string[]> {
  const invalidTokens: string[] = [];

  // Validate tokens
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (validTokens.length === 0) return invalidTokens;

  // Build messages
  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  // Chunk and send
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      ticketChunk.forEach((ticket, index) => {
        if (ticket.status === 'error') {
          const errorCode = ticket.details && (ticket.details as any).error;
          if (errorCode === 'DeviceNotRegistered') {
            const message = chunk[index];
            if (message && typeof message.to === 'string') {
              invalidTokens.push(message.to);
            }
          }
        }
      });
    } catch (error) {
      console.error('Error sending push notification chunk', error);
    }
  }

  return invalidTokens;
}

/**
 * Throttle-aware enqueue for new photo notifications.
 * - First event in a 60s window enqueues an immediate push job and schedules a trailing check.
 * - Subsequent events within the window only increment a buffer counter.
 */
export async function smartThrottleNewPhoto(
  galleryId: string,
  uploaderId: string,
  uploaderName: string,
  galleryName?: string,
  photoId?: string
) {
  const lockKey = `photo:lock:${galleryId}:${uploaderId}`;
  const bufferKey = `photo:buffer:${galleryId}:${uploaderId}`;

  const isLocked = await redis.get(lockKey);

  if (!isLocked) {
    // Immediate path: enqueue now, set lock, schedule trailing check
    await photoQueue.add('process-new-photo', {
      galleryId,
      uploaderId,
      photo: {
        id: photoId,
        uploaderName,
        galleryName: galleryName || 'New Photo'
      }
    });

    await redis.set(lockKey, '1', 'EX', 60);

    await photoQueue.add(
      'check-buffer',
      { galleryId, uploaderId, uploaderName, galleryName: galleryName || 'New Photos' },
      { delay: 60000 }
    );
  } else {
    // Buffer path: increment counter and ensure it expires eventually
    const newCount = await redis.incr(bufferKey);
    if (newCount === 1) {
      // Set an expiry so buffers don't persist forever
      await redis.expire(bufferKey, 3600);
    }
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
