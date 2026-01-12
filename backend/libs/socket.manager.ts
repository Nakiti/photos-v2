import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { redis } from './redis.js';

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

  // Add your authentication and connection logic here
  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`✅ User connected: ${socket.id} (User: ${userId})`);

    socket.on('join_gallery', async (galleryId: string) => {
      console.log(`User ${userId} (${socket.id}) joining gallery room: ${galleryId}`);
      socket.join(galleryId);
      
      // Track user in Redis set for this gallery room
      const roomKey = `gallery:${galleryId}:users`;
      await redis.sadd(roomKey, userId);
      // Set expiry to 1 hour (users should rejoin periodically)
      await redis.expire(roomKey, 3600);
    });

    socket.on('leave_gallery', async (galleryId: string) => {
      console.log(`User ${userId} (${socket.id}) leaving gallery room: ${galleryId}`);
      socket.leave(galleryId);
      
      // Remove user from Redis set
      const roomKey = `gallery:${galleryId}:users`;
      await redis.srem(roomKey, userId);
    });

    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.id} (User: ${userId})`);
      
      // Clean up: Remove user from all gallery rooms they were in
      // Get all rooms this socket was in (excluding the socket's own room)
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      for (const galleryId of rooms) {
        // All rooms except socket.id are gallery rooms
        const roomKey = `gallery:${galleryId}:users`;
        await redis.srem(roomKey, userId);
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
export function broadcastNewPhoto(galleryId: string, photo: any) {
  if (io) {
    io.to(galleryId).emit('new_photo', photo);
    console.log(`📢 Broadcasted new photo to gallery room: ${galleryId}`);
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