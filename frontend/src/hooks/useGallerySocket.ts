import { useEffect, useRef } from 'react';
import { socket } from '../services/socketClient';

/**
 * Hook to manage gallery room subscriptions for real-time updates.
 * 
 * This hook automatically joins a gallery room when the component mounts
 * or when the galleryId changes, and leaves the room when the component
 * unmounts or when navigating to a different gallery.
 * 
 * @param galleryId - The ID of the gallery to subscribe to. If null/undefined, no room is joined.
 * 
 * @example
 * ```tsx
 * const GalleryScreen = () => {
 *   const { galleryId } = useRoute().params;
 *   useGallerySocket(galleryId); // Automatically joins/leaves room
 *   // ... rest of component
 * };
 * ```
 */
export const useGallerySocket = (galleryId: string | null | undefined) => {
  const previousGalleryIdRef = useRef<string | null | undefined>(null);

  useEffect(() => {
    // Don't do anything if no galleryId provided
    if (!galleryId) {
      return;
    }

    // Only join if socket is connected
    if (!socket.connected) {
      console.log(`[GallerySocket] Socket not connected, skipping join for gallery: ${galleryId}`);
      return;
    }

    // If we're switching galleries, leave the previous one first
    if (previousGalleryIdRef.current && previousGalleryIdRef.current !== galleryId) {
      console.log(`[GallerySocket] Leaving previous gallery room: ${previousGalleryIdRef.current}`);
      socket.emit('leave_gallery', previousGalleryIdRef.current);
    }

    // Join the new gallery room
    console.log(`[GallerySocket] Joining gallery room: ${galleryId}`);
    socket.emit('join_gallery', galleryId);
    previousGalleryIdRef.current = galleryId;

    // Cleanup: leave the room when component unmounts or galleryId changes
    return () => {
      if (socket.connected && galleryId) {
        console.log(`[GallerySocket] Leaving gallery room: ${galleryId}`);
        socket.emit('leave_gallery', galleryId);
      }
      previousGalleryIdRef.current = null;
    };
  }, [galleryId]);

  // Handle socket reconnection - rejoin room if socket reconnects
  useEffect(() => {
    const handleConnect = () => {
      // Rejoin the current gallery room if we have one
      if (galleryId) {
        console.log(`[GallerySocket] Socket reconnected, rejoining gallery room: ${galleryId}`);
        socket.emit('join_gallery', galleryId);
        previousGalleryIdRef.current = galleryId;
      }
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [galleryId]);
};

