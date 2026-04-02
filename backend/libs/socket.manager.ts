import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import http from 'http';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { redis, redisConnection } from './redis.js';
import { Redis } from 'ioredis';

// Module-level state (singleton pattern)
let io: Server | null = null;

/**
 * Initializes the WebSocket server with authentication and connection handlers.
 * @param httpServer The HTTP server instance to attach Socket.IO to
 */
export function initializeSocket(httpServer: http.Server) {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Restrict in production
      methods: ['GET', 'POST'],
    },
  });

  // Redis pub/sub clients for multi-instance broadcast
  const pubClient = new Redis(redisConnection);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  console.log('🔌 WebSocket server initialized');

  // Socket authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        console.log(`⚠️ Socket connection rejected: No token provided (${socket.id})`);
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      (socket as any).userId = decoded.userId;
      console.log(`✅ Socket authenticated: ${socket.id} -> User ${decoded.userId}`);
      next();
    } catch (error) {
      console.log(`⚠️ Socket authentication failed: ${socket.id}`, error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Decrement a user's socket count in a gallery room; remove the entry when it reaches zero.
  async function leaveGalleryRoom(galleryId: string, userId: string) {
    const roomKey = `gallery:${galleryId}:users`;
    const remaining = await redis.hincrby(roomKey, userId, -1);
    if (remaining <= 0) {
      await redis.hdel(roomKey, userId);
    }
  }

  // Add your authentication and connection logic here
  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`✅ User connected: ${socket.id} (User: ${userId})`);

    socket.on('join_gallery', async (galleryId: string) => {
      console.log(`User ${userId} (${socket.id}) joining gallery room: ${galleryId}`);
      socket.join(galleryId);

      // Track user with a socket-count so multiple devices don't evict each other.
      // roomKey is a Hash: { userId -> activeSocketCount }
      const roomKey = `gallery:${galleryId}:users`;
      await redis.hincrby(roomKey, userId, 1);
      await redis.expire(roomKey, 3600);
    });

    socket.on('leave_gallery', async (galleryId: string) => {
      console.log(`User ${userId} (${socket.id}) leaving gallery room: ${galleryId}`);
      socket.leave(galleryId);
      await leaveGalleryRoom(galleryId, userId);
    });

    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.id} (User: ${userId})`);

      // Decrement socket count for every gallery this socket was in.
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      for (const galleryId of rooms) {
        await leaveGalleryRoom(galleryId, userId);
        console.log(`🧹 Cleaned up user ${userId} from gallery room: ${galleryId}`);
      }
    });
  });
}

/**
 * Broadcasts a new photo to a specific gallery room.
 * @param galleryId The room ID
 * @param photo The new photo object
 */
export function broadcastNewPhoto(
  galleryId: string,
  photo: { id: string; galleryId: string; uploaderId: string; clientId?: string },
) {
  if (io) {
    // Send only the minimal identifiers; clients fetch the full photo via their sync query.
    // This avoids broadcasting the full ~2KB payload to every connected member.
    io.to(galleryId).emit('new_photo', {
      id: photo.id,
      galleryId: photo.galleryId,
      uploaderId: photo.uploaderId,
      clientId: photo.clientId,
    });
  }
}

/**
 * Broadcasts a photo deletion to a specific gallery room.
 * @param galleryId The room ID
 * @param photoId The ID of the deleted photo
 */
export function broadcastPhotoDeleted(galleryId: string, photoId: string) {
  if (io) {
    io.to(galleryId).emit('photo_deleted', { photoId, galleryId });
    console.log(`📢 Broadcasted photo deletion to gallery room: ${galleryId}, photoId: ${photoId}`);
  }
}

/**
 * Broadcasts a photo update (e.g., visibility change) to a specific gallery room.
 * @param galleryId The room ID
 * @param photo The updated photo object
 */
export function broadcastPhotoUpdated(galleryId: string, photo: any) {
  if (io) {
    io.to(galleryId).emit('photo_updated', photo);
    console.log(`📢 Broadcasted photo update to gallery room: ${galleryId}, photoId: ${photo.id}`);
  }
}

/**
 * Broadcasts a photo tag update (added or removed) to a specific gallery room.
 * @param galleryId The room ID
 * @param photoId The ID of the photo
 * @param tagId The ID of the tag
 * @param action 'added' or 'removed'
 */
export function broadcastPhotoTagged(galleryId: string, photoId: string, tagId: string, action: 'added' | 'removed') {
  if (io) {
    io.to(galleryId).emit('photo_tagged', { photoId, tagId, action, galleryId });
    console.log(`📢 Broadcasted photo tag ${action} to gallery room: ${galleryId}, photoId: ${photoId}, tagId: ${tagId}`);
  }
}

/**
 * Broadcasts that one or more photos in a gallery were approved (visibility → VISIBLE).
 * Clients should refetch photos rather than trying to apply a partial update locally.
 * @param galleryId The room ID
 */
export function broadcastPhotosApproved(galleryId: string) {
  if (io) {
    io.to(galleryId).emit('photos_approved', { galleryId });
  }
}

/**
 * Broadcasts a gallery metadata update to a specific gallery room.
 * @param galleryId The room ID
 * @param gallery The updated gallery object
 */
export function broadcastGalleryUpdated(galleryId: string, gallery: any) {
  if (io) {
    io.to(galleryId).emit('gallery_updated', gallery);
    console.log(`📢 Broadcasted gallery update to gallery room: ${galleryId}`);
  }
}