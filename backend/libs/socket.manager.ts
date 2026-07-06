import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import http from 'http';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { redis, redisConnection } from './redis.js';
import { Redis } from 'ioredis';
import { createLogger } from './logger.js';
import { isGalleryMember } from '../src/api/galleries/permission.service.js';

const log = createLogger('socket');

// Module-level state (singleton pattern)
let io: Server | null = null;
// Redis pub/sub clients backing the adapter — held at module scope so they can be
// quit during graceful shutdown.
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

/**
 * Initializes the WebSocket server with authentication and connection handlers.
 * @param httpServer The HTTP server instance to attach Socket.IO to
 */
export function initializeSocket(httpServer: http.Server) {
  // Mirror the HTTP CORS policy (server.ts): allow all only when the operator
  // explicitly configures '*' (dev default), otherwise restrict to the
  // configured origin allow-list.
  const allowedOrigins = config.allowedOrigins;
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
      methods: ['GET', 'POST'],
    },
  });

  // Redis pub/sub clients for multi-instance broadcast
  pubClient = new Redis(redisConnection);
  subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  log.info('WebSocket server initialized');

  // Socket authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        log.warn({ socketId: socket.id }, 'socket connection rejected: no token');
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      (socket as any).userId = decoded.userId;
      log.info({ socketId: socket.id, userId: decoded.userId }, 'socket authenticated');
      next();
    } catch (error) {
      log.warn({ socketId: socket.id, err: error }, 'socket authentication failed');
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
    log.info({ socketId: socket.id, userId }, 'user connected');

    socket.on('join_gallery', async (galleryId: string) => {
      // Authorization: only members (or the owner) may subscribe to a gallery's
      // real-time stream. Without this, any authenticated user could join any
      // room and receive its photo/gallery payloads (information disclosure).
      const authorized = await isGalleryMember(userId, galleryId);
      if (!authorized) {
        log.warn({ socketId: socket.id, userId, galleryId }, 'join_gallery rejected: not a member');
        socket.emit('join_gallery_error', { galleryId, error: 'Forbidden: not a member of this gallery' });
        return;
      }

      log.info({ socketId: socket.id, userId, galleryId }, 'user joining gallery room');
      socket.join(galleryId);

      // Track user with a socket-count so multiple devices don't evict each other.
      // roomKey is a Hash: { userId -> activeSocketCount }
      const roomKey = `gallery:${galleryId}:users`;
      await redis.hincrby(roomKey, userId, 1);
      await redis.expire(roomKey, 3600);
    });

    socket.on('leave_gallery', async (galleryId: string) => {
      log.info({ socketId: socket.id, userId, galleryId }, 'user leaving gallery room');
      socket.leave(galleryId);
      await leaveGalleryRoom(galleryId, userId);
    });

    socket.on('disconnect', async () => {
      log.info({ socketId: socket.id, userId }, 'user disconnected');

      // Decrement socket count for every gallery this socket was in.
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      for (const galleryId of rooms) {
        await leaveGalleryRoom(galleryId, userId);
        log.info({ userId, galleryId }, 'cleaned up user from gallery room');
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
    log.info({ galleryId, photoId }, 'broadcast photo deleted');
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
    log.info({ galleryId, photoId: photo.id }, 'broadcast photo updated');
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
    log.info({ galleryId, photoId, tagId, action }, 'broadcast photo tagged');
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
    log.info({ galleryId }, 'broadcast gallery updated');
  }
}

/**
 * Gracefully closes the Socket.IO server and its adapter Redis clients.
 * Disconnects all connected sockets, stops accepting new connections, and quits
 * the pub/sub clients. Safe to call when the socket server was never initialized.
 */
export async function closeSocket(): Promise<void> {
  if (io) {
    await new Promise<void>((resolve) => io!.close(() => resolve()));
    log.info('WebSocket server closed');
    io = null;
  }

  await Promise.allSettled([
    pubClient?.quit(),
    subClient?.quit(),
  ]);
  pubClient = null;
  subClient = null;
}