import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { photoQueue, redisConnection } from '../../../libs/queue.js';

const expo = new Expo();
const prisma = new PrismaClient();
const redis = new Redis(redisConnection);

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