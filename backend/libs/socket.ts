// src/lib/socket.ts
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../api/middlewares/auth'; // Assuming you have a JWT verification function

// Define types for event payloads (optional but good practice)
interface NewPhotoPayload {
  galleryId: string;
  photoData: {
    id: string;
    s3Url: string;
    uploaderId: string;
    createdAt: Date;
    // ... other photo details
  };
}

export function setupWebSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow connections from any origin (adjust for production!)
      methods: ['GET', 'POST'],
    },
  });

  console.log('🔌 WebSocket server initialized');

  // --- Middleware for Authentication (Optional but Recommended) ---
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }
      const decoded = verifyToken(token); // Verify the JWT
      // Attach user info to the socket for later use
      (socket as any).user = decoded; // Use `any` or define a proper type extension
      next();
    } catch (err) {
      console.error('Socket authentication error:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // --- Connection Handler ---
  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user; // Access user info attached by middleware
    console.log(`✅ User connected: ${user?.id} (Socket ID: ${socket.id})`);

    // --- Event Listener: Joining a Gallery Room ---
    socket.on('join_gallery', (galleryId: string) => {
      console.log(`User ${user?.id} joining gallery room: ${galleryId}`);
      socket.join(galleryId); // Use Socket.IO rooms to group clients
    });

    // --- Event Listener: Leaving a Gallery Room ---
    socket.on('leave_gallery', (galleryId: string) => {
      console.log(`User ${user?.id} leaving gallery room: ${galleryId}`);
      socket.leave(galleryId);
    });

    // --- Disconnect Handler ---
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${user?.id} (Socket ID: ${socket.id})`);
      // You might want to automatically leave rooms here if needed
    });
  });

  // --- Function to Broadcast New Photos ---
  // This function can be called from your backend service after a photo is confirmed
  const broadcastNewPhoto = (payload: NewPhotoPayload) => {
    io.to(payload.galleryId).emit('new_photo', payload.photoData);
    console.log(`📢 Broadcasted new photo to gallery room: ${payload.galleryId}`);
  };

  // --- Export the broadcast function and potentially the 'io' instance ---
  return { io, broadcastNewPhoto };
}

// You might need a way to access broadcastNewPhoto from your services.
// One simple way is to export it from the setupWebSocket result
// and make it available globally or via dependency injection.
// Example (simplistic global export - consider better patterns):
let broadcaster: (payload: NewPhotoPayload) => void;

export function getBroadcaster() {
    if (!broadcaster) {
        throw new Error("WebSocket broadcaster not initialized!");
    }
    return broadcaster;
}

// In setupWebSocket, assign the function before returning:
// broadcaster = broadcastNewPhoto;
// return { io, broadcastNewPhoto };