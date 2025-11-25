import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../../libs/queue.js';
import { sendPushNotifications } from '../api/notifications/notifications.service.js';
import { Redis } from 'ioredis';

const prisma = new PrismaClient()
const redis = new Redis(redisConnection);

export const worker = new Worker('photo-notifications', async (job) => {
    console.log(`Job ${job.id}: ${job.name}`);

    if (job.name === 'check-buffer') {
        const { galleryId, uploaderId, uploaderName, galleryName } = job.data;
        const bufferKey = `photo:buffer:${galleryId}:${uploaderId}`;
        const raw = await redis.get(bufferKey);
        const count = raw ? parseInt(raw, 10) : 0;
        if (count > 0) {
            // Reset buffer first to avoid double sends
            await redis.del(bufferKey);

            const memberships = await prisma.membership.findMany({
                where: {
                galleryId,
                userId: { not: uploaderId },
                status: 'ACCEPTED',
                isMuted: false
                },
                include: { user: { include: { devices: true } } }
            });

            const tokens = memberships.flatMap(m => m.user.devices).map(d => d.token);
            if (tokens.length === 0) return;

            const deadTokens = await sendPushNotifications(
                tokens,
                galleryName || 'New Photos',
                `${uploaderName} added ${count} photo${count === 1 ? '' : 's'} to ${galleryName || 'the gallery'}`,
                { galleryId }
            );

            if (deadTokens.length > 0) {
                await prisma.device.deleteMany({
                where: { token: { in: deadTokens } }
                });
            }
        }
        return;
    }

    // Default immediate processing for 'process-new-photo'
    const { galleryId, uploaderId, photo } = job.data;

    // 1. Find who to notify
    const members = await prisma.membership.findMany({
        where: { 
        galleryId,
        userId: { not: uploaderId }, // Don't notify self
        status: 'ACCEPTED',
        isMuted: false
        },
        include: { user: { include: { devices: true } } }
    });

    // 2. Extract tokens
    const tokens = members
        .flatMap(m => m.user.devices)
        .map(d => d.token);

    if (tokens.length === 0) return;

  // 3. Send Push (The expensive network call)
    console.log(`Sending push to ${tokens.length} devices...`);
    const deadTokens = await sendPushNotifications(
        tokens, 
        photo.galleryName || 'New Photo', 
        `${photo.uploaderName} added a photo to ${photo.galleryName || 'the gallery'}`,
        { galleryId, photoId: photo.id }
    );
    
    // 4. Cleanup (Maintenance)
    if (deadTokens.length > 0) {
        console.log(`Removing ${deadTokens.length} dead tokens...`);
        await prisma.device.deleteMany({
        where: {
            token: { in: deadTokens }
        }
        });
    }

}, { 
  connection: redisConnection // Connect to same Redis
});