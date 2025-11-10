import { Server, Socket } from 'socket.io';
import http from 'http';

class SocketManager {
  public io: Server;

  initialize(httpServer: http.Server) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*', // Restrict in production
        methods: ['GET', 'POST'],
      },
    });

    console.log('🔌 WebSocket server initialized');

    // Add your authentication and connection logic here
    this.io.on('connection', (socket: Socket) => {
      console.log(`✅ User connected: ${socket.id}`);

      socket.on('join_gallery', (galleryId: string) => {
        console.log(`User ${socket.id} joining gallery room: ${galleryId}`);
        socket.join(galleryId);
      });

      socket.on('leave_gallery', (galleryId: string) => {
        console.log(`User ${socket.id} leaving gallery room: ${galleryId}`);
        socket.leave(galleryId);
      });

      socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Broadcasts a new photo to a specific gallery room.
   * @param galleryId The room ID
   * @param photo The new photo object
   */
  broadcastNewPhoto(galleryId: string, photo: any) {
    if (this.io) {
      this.io.to(galleryId).emit('new_photo', photo);
      console.log(`📢 Broadcasted new photo to gallery room: ${galleryId}`);
    }
  }
}

// Export a single instance for the whole app
export const socketManager = new SocketManager();