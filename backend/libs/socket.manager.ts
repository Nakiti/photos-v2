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

  /**
   * Broadcasts a photo deletion to a specific gallery room.
   * @param galleryId The room ID
   * @param photoId The ID of the deleted photo
   */
  broadcastPhotoDeleted(galleryId: string, photoId: string) {
    if (this.io) {
      this.io.to(galleryId).emit('photo_deleted', { photoId, galleryId });
      console.log(`📢 Broadcasted photo deletion to gallery room: ${galleryId}, photoId: ${photoId}`);
    }
  }

  /**
   * Broadcasts a photo tag update (added or removed) to a specific gallery room.
   * @param galleryId The room ID
   * @param photoId The ID of the photo
   * @param tagId The ID of the tag
   * @param action 'added' or 'removed'
   */
  broadcastPhotoTagged(galleryId: string, photoId: string, tagId: string, action: 'added' | 'removed') {
    if (this.io) {
      this.io.to(galleryId).emit('photo_tagged', { photoId, tagId, action, galleryId });
      console.log(`📢 Broadcasted photo tag ${action} to gallery room: ${galleryId}, photoId: ${photoId}, tagId: ${tagId}`);
    }
  }

  /**
   * Broadcasts a gallery metadata update to a specific gallery room.
   * @param galleryId The room ID
   * @param gallery The updated gallery object
   */
  broadcastGalleryUpdated(galleryId: string, gallery: any) {
    if (this.io) {
      this.io.to(galleryId).emit('gallery_updated', gallery);
      console.log(`📢 Broadcasted gallery update to gallery room: ${galleryId}`);
    }
  }
}

// Export a single instance for the whole app
export const socketManager = new SocketManager();