import { PrismaClient } from '@prisma/client';
import AWS from 'aws-sdk';
import config from '../../../../config/config.js';

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

export async function createPresignedUpload(galleryId: string, contentType: string) {
  const key = `galleries/${galleryId}/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const params = {
    Bucket: config.aws.s3Bucket,
    Key: key,
    Expires: 60 * 5,
    ContentType: contentType,
  } as const;
  const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
  return { uploadUrl, s3Key: key };
}

export async function confirmUploadedPhoto(uploaderId: string, galleryId: string, s3Key: string) {
  const s3Url = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;
  const photo = await prisma.photo.create({
    data: { uploaderId, galleryId, s3Key, s3Url },
    select: { id: true, s3Url: true, uploaderId: true, galleryId: true, createdAt: true },
  });
  return photo;
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
      .deleteObject({ Bucket: config.aws.s3Bucket, Key: photo.s3Key })
      .promise();
  } catch (_) {
    // ignore
  }

  await prisma.photo.delete({ where: { id: photoId } });
  return true;
}




