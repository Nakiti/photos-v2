import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
// Assume you have a push notification service setup
// import { sendPushNotification } from '../services/push.service'; 

const prisma = new PrismaClient();

// This connection object assumes Redis is running on localhost.
// Configure this for your production Redis server.
const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const photoNotificationQueue = new Queue('photo-notifications', { connection });

// --- The Worker Process ---
// This worker runs in the background
new Worker('photo-notifications', async job => {
  const { galleryId, uploaderId, photo } = job.data;
  console.log(`Processing notification job for gallery ${galleryId}`);

  try {
    // 1. Find all members of the gallery
    const memberships = await prisma.membership.findMany({
      where: {
        galleryId: galleryId,
        userId: { not: uploaderId }, // Don't notify the uploader
        isMuted: false, // Don't notify users who muted the gallery
        status: 'ACCEPTED',
      },
      select: {
        userId: true,
      }
    });

    const userIds = memberships.map(m => m.userId);
    if (userIds.length === 0) return;

    // 2. Find all device tokens for those users
    const devices = await prisma.device.findMany({
      where: {
        userId: { in: userIds },
      }
    });

    const tokens = devices.map(d => d.token);
    if (tokens.length === 0) return;

    // 3. Send the push notification
    const payload = {
      title: photo.galleryName || 'New Photo Added',
      body: `${photo.uploaderName} added a new photo!`,
      data: { galleryId, photoId: photo.id }
    };
    
    // await sendPushNotification(tokens, payload); // Implement this service
    console.log(`(Pretend Send) Push sent to ${tokens.length} devices for photo ${photo.id}`);

  } catch (error) {
    console.error('Failed to process photo notification job:', error);
  }
}, { connection });