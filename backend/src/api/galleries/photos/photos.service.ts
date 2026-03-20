import { PrismaClient } from '@prisma/client';
import AWS from 'aws-sdk';
import config from '../../../../config/config.js';
import { broadcastNewPhoto, broadcastPhotoDeleted, broadcastPhotoUpdated } from '../../../../libs/socket.manager.js';
import { photoQueue } from '../../../../libs/queue.js';
import {v4 as uuidv4} from "uuid"
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { smartThrottleNewPhoto } from '../../notifications/notifications.service.js';
import { recordUpload } from '../../../../libs/rateLimiter.js';

const prisma = new PrismaClient();

AWS.config.update({
  accessKeyId: config.aws.accessKeyId!,
  secretAccessKey: config.aws.secretAccessKey!,
  region: config.aws.region!,
});

const s3 = new AWS.S3();
const s3v3 = new AWS.S3(); // placeholder to keep name alignment; real v3 client below
import { S3Client } from '@aws-sdk/client-s3';
const s3ClientV3 = new S3Client({
  credentials: {
    accessKeyId: config.aws.accessKeyId!,
    secretAccessKey: config.aws.secretAccessKey!,
  },
  region: config.aws.region!,
});

export async function listPhotos(galleryId: string, page: number, limit: number, tagId?: string, userId?: string) {
  const skip = (page - 1) * limit;
  
  // Get gallery and user membership to determine visibility permissions
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { ownerId: true },
  });

  const membership = userId ? await prisma.membership.findFirst({
    where: {
      galleryId,
      userId,
      status: 'ACCEPTED',
    },
    select: { role: true },
  }) : null;

  const isOwner = gallery?.ownerId === userId;
  const isAdmin = membership?.role === 'ADMIN';

  // Build where clause
  const where: any = { galleryId };
  if (tagId) {
    where.photoTags = { some: { tagId } };
  }

  // Filter by visibility: show VISIBLE to all, IN_REVIEW only to uploader, owner, or admin
  if (userId && (isOwner || isAdmin)) {
    // Owner or admin can see all photos
    // No additional filter needed
  } else if (userId) {
    // Regular members: only see VISIBLE photos or their own IN_REVIEW photos
    where.OR = [
      { visible: 'VISIBLE' },
      { visible: 'IN_REVIEW', uploaderId: userId },
    ];
  } else {
    // No user context: only show VISIBLE photos
    where.visible = 'VISIBLE';
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
  const photos = await prisma.photo.findMany({ where: { galleryId }, select: { id: true } });
  return photos.map((p) => p.id);
}

export const createPresignedUploadUrls = async (galleryId: string, contentType: string, userId: string) => {
  // 1. Check if user is an accepted member of the gallery
  const membership = await prisma.membership.findFirst({
    where: {
      galleryId,
      userId,
      status: 'ACCEPTED', // Ensure they are an accepted member
      // TODO: Add check for gallery.postPermission
    },
  });

  if (!membership) {
    throw new Error('Forbidden');
  }

  // 2. Generate a single UUID for both files
  const fileId = uuidv4();
  const expiresIn = 300; // 5 minutes

  // 3. Define keys and commands for BOTH files
  const s3KeyFull = `photos/${galleryId}/${fileId}.jpg`;
  const s3KeyThumb = `thumbnails/${galleryId}/${fileId}.jpg`;

  const commandFull = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3KeyFull,
    ContentType: contentType || 'image/jpeg',
  });

  const commandThumb = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3KeyThumb,
    ContentType: contentType || 'image/jpeg',
  });

  // 4. Get both presigned URLs in parallel
  const [presignedUrlFull, presignedUrlThumb] = await Promise.all([
    getSignedUrl(s3ClientV3, commandFull, { expiresIn }),
    getSignedUrl(s3ClientV3, commandThumb, { expiresIn })
  ]);

  // 5. Define the final, permanent URLs
  const finalUrlFull = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${s3KeyFull}`;
  const finalUrlThumb = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${s3KeyThumb}`;

  // 6. Return all data to the client
  return {
    full: {
      presignedUrl: presignedUrlFull,
      s3Key: s3KeyFull,
      finalUrl: finalUrlFull,
    },
    thumb: {
      presignedUrl: presignedUrlThumb,
      s3Key: s3KeyThumb,
      finalUrl: finalUrlThumb,
    },
  };
};

/**
 * Creates a photo and optionally applies tags in a single transaction.
 * If s3Url is not provided, derive it from the s3Key.
 */
export async function confirmUploadedPhoto(
  uploaderId: string,
  galleryId: string,
  s3Key: string,
  thumbnailUrl: string,
  thumbnailKey: string,
  s3Url?: string,
  tagIds?: string[],
) {
  const resolvedS3Url =
    s3Url ??
    `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;

  const created = await prisma.$transaction(async (tx) => {
    // Get gallery to check requirePictureReview setting
    const gallery = await tx.gallery.findUnique({
      where: { id: galleryId },
      select: { requirePictureReview: true },
    });

    // Determine visibility based on gallery setting
    const visible = gallery?.requirePictureReview ? 'IN_REVIEW' : 'VISIBLE';

    // Create the photo first
    const photo = await tx.photo.create({
      data: {
        galleryId,
        uploaderId,
        s3Key,
        s3Url: resolvedS3Url,
        thumbnailUrl: thumbnailUrl ?? null,
        thumbnailKey: thumbnailKey ?? null,
        visible: visible as any,
      },
      select: {
        id: true,
        galleryId: true,
        uploaderId: true,
        s3Key: true,
        s3Url: true,
        thumbnailUrl: true,
        thumbnailKey: true,
        visible: true,
        createdAt: true,
      },
    });

    // Update the gallery's lastPhotoAt and increment photoCount
    await tx.gallery.update({
      where: { id: galleryId },
      data: { 
        lastPhotoAt: photo.createdAt,
        photoCount: {
          increment: 1,
        },
      },
    });

    // If tagIds provided, restrict to tags belonging to this gallery and create associations
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

  // Notify sockets and queues (outside the transaction)
  const uploader = await prisma.user.findUnique({
    where: { id: uploaderId },
    select: { name: true, handle: true },
  });
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { name: true },
  });

  const socketPayload = {
    id: created.id,
    s3Url: created.s3Url,
    thumbnailUrl: created.thumbnailUrl,
    createdAt: created.createdAt,
    galleryId: created.galleryId,
    uploader: uploader,
  };
  broadcastNewPhoto(galleryId, socketPayload);

  const uploaderName = (uploader?.name || uploader?.handle || 'A user') as string;
  const galleryName = (gallery?.name || '') as string;
  
  // Record the upload for rate limiting (only after successful creation)
  await recordUpload(uploaderId, galleryId);
  
  await smartThrottleNewPhoto(
    galleryId,
    uploaderId,
    uploaderName,
    galleryName,
    created.id
  );

  return created; // includes s3Key and thumbnailUrl
}

export async function deletePhoto(requesterId: string, galleryId: string, photoId: string) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, galleryId: true, uploaderId: true, s3Key: true, gallery: { select: { ownerId: true } } },
  });
  if (!photo || photo.galleryId !== galleryId) return false;
  const isOwner = photo.gallery.ownerId === requesterId;
  const isUploader = photo.uploaderId === requesterId;
  if (!isOwner && !isUploader) return false;

  // Best-effort delete from S3, but don't fail the API if S3 delete fails
  try {
    await s3
      .deleteObject({ Bucket: config.aws.s3Bucket!, Key: photo.s3Key })
      .promise();
  } catch (_) {
    // ignore
  }

  // Use transaction to delete photo and decrement gallery photoCount
  await prisma.$transaction(async (tx) => {
    await tx.photo.delete({ where: { id: photoId } });
    
    // Decrement photoCount
    await tx.gallery.update({
      where: { id: galleryId },
      data: {
        photoCount: {
          decrement: 1,
        },
      },
    });
  });
  
  // Broadcast photo deletion to gallery room
  broadcastPhotoDeleted(galleryId, photoId);
  
  return true;
}

/**
 * Update photo visibility status. Only allowed for gallery owner or admin.
 */
export async function updatePhotoVisibility(
  requesterId: string,
  galleryId: string,
  photoId: string,
  visible: 'IN_REVIEW' | 'VISIBLE'
) {
  // Check if photo exists and belongs to gallery
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, galleryId: true, gallery: { select: { ownerId: true } } },
  });

  if (!photo || photo.galleryId !== galleryId) {
    return null;
  }

  // Check if requester is owner or admin
  const isOwner = photo.gallery.ownerId === requesterId;
  const membership = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId: requesterId, galleryId } },
    select: { status: true, role: true } as any,
  });
  const isAdmin = membership?.status === 'ACCEPTED' && membership?.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return null; // Not authorized
  }

  // Update photo visibility
  const updated = await prisma.photo.update({
    where: { id: photoId },
    data: { visible: visible as any },
    select: {
      id: true,
      galleryId: true,
      uploaderId: true,
      s3Key: true,
      s3Url: true,
      thumbnailUrl: true,
      thumbnailKey: true,
      visible: true,
      createdAt: true,
    },
  });

  // Broadcast photo update to gallery room
  broadcastPhotoUpdated(galleryId, updated);

  return updated;
}

/**
 * Approve multiple photos at once. Only allowed for gallery owner or admin.
 */
export async function approvePhotos(
  requesterId: string,
  galleryId: string,
  photoIds: string[]
) {
  // Check if requester is owner or admin
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { ownerId: true },
  });

  if (!gallery) return null;

  const isOwner = gallery.ownerId === requesterId;
  const membership = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId: requesterId, galleryId } },
    select: { status: true, role: true } as any,
  });
  const isAdmin = membership?.status === 'ACCEPTED' && membership?.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return null; // Not authorized
  }

  // Update all photos to VISIBLE
  const updated = await prisma.photo.updateMany({
    where: {
      id: { in: photoIds },
      galleryId: galleryId,
      visible: 'IN_REVIEW',
    },
    data: { visible: 'VISIBLE' as any },
  });

  // Fetch updated photos to broadcast
  const updatedPhotos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, galleryId: galleryId },
    select: {
      id: true,
      galleryId: true,
      uploaderId: true,
      s3Key: true,
      s3Url: true,
      thumbnailUrl: true,
      thumbnailKey: true,
      visible: true,
      createdAt: true,
    },
  });

  // Broadcast each photo update
  updatedPhotos.forEach(photo => {
    broadcastPhotoUpdated(galleryId, photo);
  });

  return { count: updated.count };
}

/**
 * Approve all in-review photos in a gallery. Only allowed for gallery owner or admin.
 */
export async function approveAllInReviewPhotos(
  requesterId: string,
  galleryId: string
) {
  // Check if requester is owner or admin
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { ownerId: true },
  });

  if (!gallery) return null;

  const isOwner = gallery.ownerId === requesterId;
  const membership = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId: requesterId, galleryId } },
    select: { status: true, role: true } as any,
  });
  const isAdmin = membership?.status === 'ACCEPTED' && membership?.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return null; // Not authorized
  }

  // Find all in-review photos
  const inReviewPhotos = await prisma.photo.findMany({
    where: {
      galleryId: galleryId,
      visible: 'IN_REVIEW',
    },
    select: { id: true },
  });

  if (inReviewPhotos.length === 0) {
    return { count: 0 };
  }

  const photoIds = inReviewPhotos.map(p => p.id);

  // Update all photos to VISIBLE
  const updated = await prisma.photo.updateMany({
    where: {
      id: { in: photoIds },
      galleryId: galleryId,
    },
    data: { visible: 'VISIBLE' as any },
  });

  // Fetch updated photos to broadcast
  const updatedPhotos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, galleryId: galleryId },
    select: {
      id: true,
      galleryId: true,
      uploaderId: true,
      s3Key: true,
      s3Url: true,
      thumbnailUrl: true,
      thumbnailKey: true,
      visible: true,
      createdAt: true,
    },
  });

  // Broadcast each photo update
  updatedPhotos.forEach(photo => {
    broadcastPhotoUpdated(galleryId, photo);
  });

  return { count: updated.count };
}




