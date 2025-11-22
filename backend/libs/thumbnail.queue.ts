import { Queue, Worker } from 'bullmq';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import config from '../config/config.js';

const prisma = new PrismaClient();
const connection = { /* ... your Redis connection ... */ };

export const thumbnailQueue = new Queue('thumbnail-generation', { connection });

const s3 = new S3Client({ /* ... your S3 config ... */ });

// The worker that processes the job
new Worker('thumbnail-generation', async job => {
  const { photoId, s3Key, s3Bucket } = job.data;

  try {
    // 1. Download full-size image from S3
    const getCommand = new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key });
    const response = await s3.send(getCommand);
    const imageBuffer = await response.Body.transformToByteArray();

    // 2. Resize with Sharp
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize({ width: 400 }) // Resize to 400px wide, auto-height
      .jpeg({ quality: 80 })
      .toBuffer();

    // 3. Upload new thumbnail to S3
    const thumbnailKey = s3Key.replace('photos/', 'thumbnails/'); 
    const putCommand = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
      // ACL: 'public-read' // If your assets are public
    });
    await s3.send(putCommand);

    // 4. Update the Photo record with the new thumbnailUrl
    const thumbnailUrl = `https://${s3Bucket}.s3.${config.aws.region}.amazonaws.com/${thumbnailKey}`;
    await prisma.photo.update({
      where: { id: photoId },
      data: { thumbnailUrl: thumbnailUrl },
    });

  } catch (error) {
    console.error(`Failed to generate thumbnail for ${photoId}:`, error);
  }
}, { connection });