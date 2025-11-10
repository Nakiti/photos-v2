import { PrismaClient } from '@prisma/client';
import AWS from 'aws-sdk';
import config from '../../../../config/config.js';
import { socketManager } from '../../../../libs/socket.manager.js';
import { photoNotificationQueue } from '../../../../libs/photoNotification.queue.js';
import {v4 as uuidv4} from "uuid"
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { thumbnailQueue } from '../../../../libs/thumbnail.queue.js';

const prisma = new PrismaClient();

AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region,
});

const s3 = new AWS.S3();

export async function listPhotos(galleryId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.photo.findMany({
      where: { galleryId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, s3Url: true, uploaderId: true, createdAt: true },
      skip,
      take: limit,
    }),
    prisma.photo.count({ where: { galleryId } }),
  ]);
  return { items, total, page, limit };
}

export async function getPhotoIdsForGallery(galleryId: string) {
  const photos = await prisma.photo.findMany({ where: { galleryId }, select: { id: true } });
  return photos.map((p) => p.id);
}

export const generatePresignedUrl = async (galleryId: string, userId: string) => {
  const membership = await prisma.membership.findFirst({
    where: {
      galleryId,
      userId,
      status: 'ACCEPTED', 
    },
  });

  if (!membership) {
    throw new Error('Forbidden');
  }


  const s3Key = `photos/${galleryId}/${uuidv4()}.jpg`;
  const expiresIn = 300; // 5 minutes

  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3Key,
    ContentType: 'image/jpeg',
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn });
  const finalUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;

  return { presignedUrl, s3Key, finalUrl };
};

export const confirmUpload = async (data: {
  galleryId: string;
  uploaderId: string;
  s3Key: string;
  s3Url: string;
}) => {
  const { galleryId, uploaderId, s3Key, s3Url } = data;

  const newPhoto = await prisma.photo.create({
    data: {
      galleryId,
      uploaderId,
      s3Key,
      s3Url,
    },
    include: {
      uploader: {
        select: { name: true, handle: true },
      },
      gallery: {
        select: { name: true },
      },
    },
  });

  const uploaderName = newPhoto.uploader?.name || newPhoto.uploader?.handle || 'A user';
  const galleryName = newPhoto.gallery.name;

  const socketPayload = {
    id: newPhoto.id,
    s3Url: newPhoto.s3Url,
    createdAt: newPhoto.createdAt,
    galleryId: newPhoto.galleryId,
    uploader: newPhoto.uploader,
  };
  socketManager.broadcastNewPhoto(galleryId, socketPayload);

  // 3. Add job to queue for offline users
  await photoNotificationQueue.add('send-notification', {
    galleryId,
    uploaderId,
    photo: {
      id: newPhoto.id,
      uploaderName,
      galleryName,
    },
  });

  await thumbnailQueue.add('generate-thumbnail', {
    photoId: newPhoto.id,
    s3Key: newPhoto.s3Key,
    s3Bucket: config.aws.s3Bucket,
  });

  return socketPayload; 
};

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
      .deleteObject({ Bucket: config.aws.s3Bucket, Key: photo.s3Key })
      .promise();
  } catch (_) {
    // ignore
  }

  await prisma.photo.delete({ where: { id: photoId } });
  return true;
}




