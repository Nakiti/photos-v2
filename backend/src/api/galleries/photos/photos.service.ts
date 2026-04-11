import { PrismaClient } from '@prisma/client';
import config from '../../../../config/config.js';
import { broadcastNewPhoto, broadcastPhotoDeleted, broadcastPhotoUpdated } from '../../../../libs/socket.manager.js';
import { photoQueue } from '../../../../libs/queue.js';
import {v4 as uuidv4} from "uuid"
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { smartThrottleNewPhoto, createNotificationRecord, sendPushNotifications } from '../../notifications/notifications.service.js';
import { checkAndRecordUpload } from '../../../../libs/rateLimiter.js';
import { redis } from '../../../../libs/redis.js';

export class RateLimitError extends Error {
  readonly limit: number;
  readonly currentCount: number;
  constructor(limit: number, currentCount: number) {
    super('Upload rate limit exceeded');
    this.name = 'RateLimitError';
    this.limit = limit;
    this.currentCount = currentCount;
  }
}

const prisma = new PrismaClient();

const s3ClientV3 = new S3Client({
  credentials: {
    accessKeyId: config.aws.accessKeyId!,
    secretAccessKey: config.aws.secretAccessKey!,
  },
  region: config.aws.region!,
});

export async function listPhotos(galleryId: string, page: number, limit: number, tagId?: string, userId?: string, since?: string) {
  const skip = (page - 1) * limit;
  
  // Parallelise the two permission checks — they have no dependency on each other.
  const [gallery, membership] = await Promise.all([
    prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { ownerId: true },
    }),
    userId
      ? prisma.membership.findFirst({
          where: { galleryId, userId, status: 'ACCEPTED' },
          select: { role: true },
        })
      : null,
  ]);

  const isOwner = gallery?.ownerId === userId;
  const isAdmin = membership?.role === 'ADMIN';

  // Build where clause
  const where: any = { galleryId, deletedAt: null };
  if (tagId) {
    where.photoTags = { some: { tagId } };
  }
  if (since) {
    where.createdAt = { gt: new Date(since) };
  }

  const [items, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        s3Url: true,
        thumbnailUrl: true,
        uploaderId: true,
        galleryId: true,
        visible: true,
        createdAt: true,
        photoTags: {
          select: {
            tagId: true,
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
    }),
    prisma.photo.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function getPhotoIdsForGallery(galleryId: string) {
  const photos = await prisma.photo.findMany({
    where: { galleryId, deletedAt: null },
    select: { id: true },
  });
  return photos.map((p) => p.id);
}

/**
 * Returns photo IDs soft-deleted in this gallery at or after `since`.
 * Used by clients for delta reconciliation instead of full ID scan.
 */
export async function getDeletedPhotoIdsSince(galleryId: string, since: string) {
  const photos = await prisma.photo.findMany({
    where: {
      galleryId,
      deletedAt: { gte: new Date(since) },
    },
    select: { id: true },
  });
  return photos.map((p) => p.id);
}

export const createPresignedUploadUrls = async (galleryId: string, contentType: string, userId: string, clientId?: string) => {
  console.log(`[Photos][presign] gallery=${galleryId} user=${userId} clientId=${clientId ?? 'none'}`);

  // Return cached response for same clientId to deduplicate rapid duplicate requests
  if (clientId) {
    const cacheKey = `presign:${clientId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[Photos][presign] cache hit clientId=${clientId}`);
      return JSON.parse(cached) as ReturnType<typeof buildPresignResult>;
    }
  }

  const membership = await prisma.membership.findFirst({
    where: { galleryId, userId, status: 'ACCEPTED' },
  });
  if (!membership) throw new Error('Forbidden');

  const fileId = uuidv4();
  const expiresIn = 1800; // 30 minutes

  const s3KeyFull = `photos/${galleryId}/${fileId}.jpg`;
  const s3KeyThumb = `thumbnails/${galleryId}/${fileId}.jpg`;

  const commandFull = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3KeyFull,
    ContentType: 'image/jpeg',
  });

  const commandThumb = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3KeyThumb,
    ContentType: 'image/jpeg',
  });

  const [presignedUrlFull, presignedUrlThumb] = await Promise.all([
    getSignedUrl(s3ClientV3, commandFull, { expiresIn }),
    getSignedUrl(s3ClientV3, commandThumb, { expiresIn }),
  ]);

  const finalUrlFull = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${s3KeyFull}`;
  const finalUrlThumb = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${s3KeyThumb}`;

  const result = buildPresignResult(presignedUrlFull, s3KeyFull, finalUrlFull, presignedUrlThumb, s3KeyThumb, finalUrlThumb);
  console.log(`[Photos][presign] generated full=${s3KeyFull} thumb=${s3KeyThumb}`);

  if (clientId) {
    await redis.set(`presign:${clientId}`, JSON.stringify(result), 'EX', expiresIn);
  }

  return result;
};

function buildPresignResult(
  presignedUrlFull: string, s3KeyFull: string, finalUrlFull: string,
  presignedUrlThumb: string, s3KeyThumb: string, finalUrlThumb: string,
) {
  return {
    full: { presignedUrl: presignedUrlFull, s3Key: s3KeyFull, finalUrl: finalUrlFull },
    thumb: { presignedUrl: presignedUrlThumb, s3Key: s3KeyThumb, finalUrl: finalUrlThumb },
  };
}

const PHOTO_SELECT = {
  id: true,
  galleryId: true,
  uploaderId: true,
  s3Key: true,
  s3Url: true,
  thumbnailUrl: true,
  thumbnailKey: true,
  visible: true,
  createdAt: true,
} as const;

function deleteS3ObjectsSilently(s3Key: string, thumbnailKey: string | null) {
  const objects: { Key: string }[] = [{ Key: s3Key }];
  if (thumbnailKey) objects.push({ Key: thumbnailKey });
  s3ClientV3.send(new DeleteObjectsCommand({
    Bucket: config.aws.s3Bucket!,
    Delete: { Objects: objects },
  })).catch(() => {});
}

/**
 * Creates a photo and optionally applies tags in a single transaction.
 * - Idempotent: returns the existing record if s3Key was already confirmed.
 * - Atomic rate limit: check and record in a single Redis operation (no TOCTOU).
 * - S3 cleanup: deletes orphaned objects if the DB transaction fails.
 */
export async function confirmUploadedPhoto(
  uploaderId: string,
  galleryId: string,
  s3Key: string,
  thumbnailUrl: string,
  thumbnailKey: string,
  s3Url?: string,
  tagIds?: string[],
  clientId?: string,
) {
  console.log(`[Photos][confirm] start gallery=${galleryId} uploader=${uploaderId} s3Key=${s3Key} clientId=${clientId ?? 'none'}`);

  const resolvedS3Url =
    s3Url ??
    `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;

  // 1. Idempotency: if this s3Key was already confirmed, return the existing record.
  const existing = await prisma.photo.findUnique({
    where: { s3Key },
    select: PHOTO_SELECT,
  });
  if (existing) {
    console.log(`[Photos][confirm] idempotent hit s3Key=${s3Key} photoId=${existing.id}`);
    return existing;
  }

  // 2. Atomic rate limit: check and record in one Redis operation.
  const rateCheck = await checkAndRecordUpload(uploaderId, galleryId);
  if (!rateCheck.allowed) {
    console.log(`[Photos][confirm] rate limit DENIED user=${uploaderId} gallery=${galleryId} count=${rateCheck.currentCount}/${rateCheck.limit}`);
    throw new RateLimitError(rateCheck.limit, rateCheck.currentCount);
  }
  console.log(`[Photos][confirm] rate check OK user=${uploaderId} gallery=${galleryId} count=${rateCheck.currentCount}/${rateCheck.limit}`);

  // 3. Persist the photo record.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let created: any;
  try {
    created = await prisma.$transaction(async (tx) => {
      const photo = await tx.photo.create({
        data: {
          galleryId,
          uploaderId,
          s3Key,
          s3Url: resolvedS3Url,
          thumbnailUrl: thumbnailUrl ?? null,
          thumbnailKey: thumbnailKey ?? null,
          visible: 'VISIBLE' as any,
        },
        select: PHOTO_SELECT,
      });

      await tx.gallery.update({
        where: { id: galleryId },
        data: {
          lastPhotoAt: photo.createdAt,
          photoCount: { increment: 1 },
        },
      });

      if (tagIds && tagIds.length > 0) {
        const uniqueTagIds = Array.from(new Set(tagIds));
        const validTags = await tx.tag.findMany({
          where: { id: { in: uniqueTagIds }, galleryId },
          select: { id: true },
        });
        if (validTags.length > 0) {
          await tx.photoTag.createMany({
            data: validTags.map((t) => ({ photoId: photo.id, tagId: t.id })),
            skipDuplicates: true,
          });
        }
      }

      return photo;
    });
  } catch (err: any) {
    // Narrow race: another concurrent confirm with same s3Key beat us between step 1 and 3.
    if (err?.code === 'P2002') {
      const raceWinner = await prisma.photo.findUnique({
        where: { s3Key },
        select: PHOTO_SELECT,
      });
      if (raceWinner) return raceWinner;
    }

    // Transaction failed for other reasons: clean up the orphaned S3 objects.
    deleteS3ObjectsSilently(s3Key, thumbnailKey);
    throw err;
  }

  console.log(`[Photos][confirm] created photoId=${created!.id} gallery=${galleryId}`);

  // 4. Post-transaction: broadcast and notifications.
  broadcastNewPhoto(galleryId, {
    id: created!.id,
    galleryId: created!.galleryId,
    uploaderId: created!.uploaderId,
    ...(clientId !== undefined ? { clientId } : {}),
  });
  console.log(`[Photos][confirm] broadcast sent gallery=${galleryId} photoId=${created!.id} clientId=${clientId ?? 'none'}`);

  const [uploader, gallery] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uploaderId },
      select: { name: true, handle: true },
    }),
    prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { name: true },
    }),
  ]);

  const uploaderName = (uploader?.name || uploader?.handle || 'A user') as string;
  const galleryName = (gallery?.name || '') as string;

  await smartThrottleNewPhoto(galleryId, uploaderName, galleryName, created!.id);

  return created!;
}

export async function deletePhoto(requesterId: string, galleryId: string, photoId: string) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, galleryId: true, uploaderId: true, s3Key: true, deletedAt: true, gallery: { select: { ownerId: true } } },
  });
  if (!photo || photo.galleryId !== galleryId || photo.deletedAt !== null) return false;
  const isOwner = photo.gallery.ownerId === requesterId;
  const isUploader = photo.uploaderId === requesterId;
  if (!isOwner && !isUploader) return false;

  await prisma.$transaction(async (tx) => {
    await tx.photo.update({
      where: { id: photoId },
      data: { deletedAt: new Date() },
    });
    await tx.gallery.update({
      where: { id: galleryId },
      data: { photoCount: { decrement: 1 } },
    });
  });

  broadcastPhotoDeleted(galleryId, photoId);
  return true;
}

/**
 * Update photo visibility status. Only allowed for gallery owner or admin.
 */

export async function getPhotoLikeStatus(userId: string, galleryId: string, photoId: string) {
  const membership = await prisma.membership.findFirst({
    where: { galleryId, userId, status: 'ACCEPTED' },
  });
  if (!membership) throw new Error('Forbidden');

  const [like, likeCount] = await Promise.all([
    prisma.photoLike.findUnique({ where: { photoId_userId: { photoId, userId } } }),
    prisma.photoLike.count({ where: { photoId } }),
  ]);
  return { liked: !!like, likeCount };
}

export async function likePhoto(userId: string, galleryId: string, photoId: string) {
  const membership = await prisma.membership.findFirst({
    where: { galleryId, userId, status: 'ACCEPTED' },
  });
  if (!membership) throw new Error('Forbidden');

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, galleryId },
    select: { id: true, uploaderId: true, thumbnailUrl: true },
  });
  if (!photo) throw new Error('Not found');

  await prisma.photoLike.upsert({
    where: { photoId_userId: { photoId, userId } },
    update: {},
    create: { photoId, userId },
  });

  const likeCount = await prisma.photoLike.count({ where: { photoId } });

  // Notify the photo uploader (not if they liked their own photo)
  if (photo.uploaderId !== userId) {
    // Dedup: only send one like notification per user per photo per hour
    const { redis } = await import('../../../../libs/redis.js');
    const dedupKey = `like:notif:${photoId}:${userId}`;
    const alreadyNotified = await redis.set(dedupKey, '1', 'EX', 3600, 'NX');

    if (alreadyNotified === 'OK') {
      const liker = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, handle: true },
      });
      const likerName = liker?.name || liker?.handle || 'Someone';

      await createNotificationRecord(
        photo.uploaderId,
        userId,
        'LIKE',
        { likerName, thumbnailUrl: photo.thumbnailUrl, galleryId },
        photoId,
        'photo'
      );

      const devices = await prisma.device.findMany({
        where: { userId: photo.uploaderId },
        select: { token: true },
      });
      if (devices.length > 0) {
        const invalidTokens = await sendPushNotifications(
          devices.map((d) => d.token),
          'New Like',
          `${likerName} liked your photo`,
          { type: 'LIKE', photoId, galleryId }
        );
        if (invalidTokens.length > 0) {
          await prisma.device.deleteMany({ where: { token: { in: invalidTokens } } });
        }
      }
    }
  }

  return { liked: true, likeCount };
}

export async function unlikePhoto(userId: string, galleryId: string, photoId: string) {
  const membership = await prisma.membership.findFirst({
    where: { galleryId, userId, status: 'ACCEPTED' },
  });
  if (!membership) throw new Error('Forbidden');

  await prisma.photoLike.deleteMany({ where: { photoId, userId } });
  const likeCount = await prisma.photoLike.count({ where: { photoId } });
  return { liked: false, likeCount };
}





