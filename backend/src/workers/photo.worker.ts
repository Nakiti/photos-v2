import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redisConnection, redis } from '../../libs/redis.js';
import { sendPushNotifications } from '../api/notifications/notifications.service.js';

const prisma = new PrismaClient();

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

            // Get users currently in the gallery room (should not receive push notifications)
            const roomKey = `gallery:${galleryId}:users`;
            const activeUserIds = await redis.smembers(roomKey);
            const activeUserIdsSet = new Set(activeUserIds);
            console.log(`[Notification] ${activeUserIds.length} users currently viewing gallery ${galleryId}, excluding from push notifications`);

            const memberships = await prisma.membership.findMany({
                where: {
                galleryId,
                userId: { not: uploaderId },
                status: 'ACCEPTED',
                isMuted: false
                },
                include: { user: { include: { devices: true } } }
            });

            // Filter out members who are currently viewing the gallery
            const membersToNotify = memberships.filter(m => !activeUserIdsSet.has(m.userId));
            console.log(`[Notification] Filtered ${memberships.length} members to ${membersToNotify.length} (excluding ${activeUserIds.length} active viewers)`);

            const tokens = membersToNotify.flatMap(m => m.user.devices).map(d => d.token);
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

    // 1. Get users currently in the gallery room (should not receive push notifications)
    const roomKey = `gallery:${galleryId}:users`;
    const activeUserIds = await redis.smembers(roomKey);
    const activeUserIdsSet = new Set(activeUserIds);
    console.log(`[Notification] ${activeUserIds.length} users currently viewing gallery ${galleryId}, excluding from push notifications`);

    // 2. Find who to notify
    const members = await prisma.membership.findMany({
        where: { 
        galleryId,
        userId: { not: uploaderId }, // Don't notify self
        status: 'ACCEPTED',
        isMuted: false
        },
        include: { user: { include: { devices: true } } }
    });

    // 3. Filter out members who are currently viewing the gallery
    const membersToNotify = members.filter(m => !activeUserIdsSet.has(m.userId));
    console.log(`[Notification] Filtered ${members.length} members to ${membersToNotify.length} (excluding ${activeUserIds.length} active viewers)`);

    // 4. Extract tokens
    const tokens = membersToNotify
        .flatMap(m => m.user.devices)
        .map(d => d.token);

    if (tokens.length === 0) return;

  // 5. Send Push (The expensive network call)
    console.log(`Sending push to ${tokens.length} devices...`);
    const deadTokens = await sendPushNotifications(
        tokens, 
        photo.galleryName || 'New Photo', 
        `${photo.uploaderName} added a photo to ${photo.galleryName || 'the gallery'}`,
        { galleryId, photoId: photo.id }
    );
    
    // 6. Cleanup (Maintenance)
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