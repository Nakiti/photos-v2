import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redisConnection, redis } from '../../libs/redis.js';
import { sendPushNotifications, createNotificationRecord } from '../api/notifications/notifications.service.js';

const prisma = new PrismaClient();
const MEMBER_BATCH_SIZE = 100;

type MemberWithDevices = {
  id: string;
  userId: string;
  user: { devices: { token: string }[] };
};

/**
 * Iterates gallery members in batches, filtering out muted and excluded users,
 * creates notification records, and sends push notifications — all without loading
 * the full member list into memory at once.
 */
async function notifyGalleryMembers(
  galleryId: string,
  excludeUserIds: Set<string>,
  title: string,
  body: string,
  pushData: Record<string, unknown>,
  notificationData: Record<string, unknown>,
) {
  let cursor: string | undefined;

  while (true) {
    const batch = (await prisma.membership.findMany({
      where: {
        galleryId,
        userId: { notIn: Array.from(excludeUserIds) },
        status: 'ACCEPTED',
        isMuted: false,
      },
      select: {
        id: true,
        userId: true,
        user: { select: { devices: { select: { token: true } } } },
      },
      take: MEMBER_BATCH_SIZE,
      orderBy: { id: 'asc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    } as any)) as unknown as MemberWithDevices[];

    if (batch.length === 0) break;

    const tokens = batch.flatMap(m => m.user.devices).map(d => d.token);

    if (tokens.length > 0) {
      await Promise.all(
        batch.map(member =>
          createNotificationRecord(
            member.userId,
            member.userId, // actorId not meaningful for system notifications
            'SYSTEM',
            notificationData as any,
            galleryId,
            'Gallery',
          )
        )
      );

      const deadTokens = await sendPushNotifications(tokens, title, body, pushData);
      if (deadTokens.length > 0) {
        await prisma.device.deleteMany({ where: { token: { in: deadTokens } } });
      }
    }

    if (batch.length < MEMBER_BATCH_SIZE) break;
    cursor = batch[batch.length - 1]!.id;
  }
}

export const worker = new Worker('photo-notifications', async (job) => {
  console.log(`Job ${job.id}: ${job.name}`);

  if (job.name === 'check-buffer') {
    const { galleryId, galleryName } = job.data;
    const bufferKey = `photo:buffer:${galleryId}`;
    const jobIdKey  = `photo:buffer:job:${galleryId}`;

    const raw = await redis.get(bufferKey);
    const count = raw ? parseInt(raw, 10) : 0;

    // Clean up the job ID key regardless
    await redis.del(jobIdKey);

    if (count > 0) {
      await redis.del(bufferKey);

      const roomKey = `gallery:${galleryId}:users`;
      const activeUserIds = await redis.hkeys(roomKey);
      const excludeIds = new Set(activeUserIds);

      const photoText = `${count} new photo${count === 1 ? '' : 's'}`;
      await notifyGalleryMembers(
        galleryId,
        excludeIds,
        galleryName || 'New Photos',
        `${photoText} ${count === 1 ? 'was' : 'were'} added to ${galleryName || 'the gallery'}`,
        { galleryId },
        { galleryName: galleryName || 'the gallery', previewText: photoText },
      );
    }
    return;
  }

  if (job.name === 'cleanup-old-notifications') {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
    const { count } = await prisma.notification.deleteMany({
      where: { isRead: true, createdAt: { lt: cutoff } },
    });
    console.log(`[Cleanup] Deleted ${count} old read notifications`);
    return;
  }

  // 'process-new-photo' — immediate notification for the first upload in a window
  const { galleryId, photo } = job.data;
  const { uploaderName, galleryName, id: photoId } = photo;

  const roomKey = `gallery:${galleryId}:users`;
  const activeUserIds = await redis.hkeys(roomKey);
  const excludeIds = new Set(activeUserIds);

  const notificationData = {
    galleryName: galleryName || 'the gallery',
    previewText: `${uploaderName} added a photo`,
  };

  await notifyGalleryMembers(
    galleryId,
    excludeIds,
    galleryName || 'New Photo',
    `${uploaderName} added a photo to ${galleryName || 'the gallery'}`,
    { galleryId, photoId },
    notificationData,
  );
}, {
  connection: redisConnection,
});
