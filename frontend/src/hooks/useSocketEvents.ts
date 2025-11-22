import { useEffect } from 'react';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '../services/socketClient'; // Assume you have a central socket client
import { Photo as PhotoApi } from '../types';
import { syncPhotos } from '../services/sync/photos.sync';
import { Database } from '@nozbe/watermelondb';
import Photo from '../db/models/Photo';

/**
 * This hook manages all incoming Socket.IO event listeners for the app.
 * It should be mounted once in a high-level component (like App.tsx).
 */
export const useSocketEvents = () => {
  const database = useDatabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    const syncPhotoThumbnail = async (db: Database, photoId: string, thumbnailUrl: string) => {
      try {
        const photosCollection = db.collections.get<Photo>('photos');
        const photo = await photosCollection.find(photoId);
        await db.write(async () => {
          await photo.update(r => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r as any).thumbnailUri = thumbnailUrl;
          });
        });
        console.log('[Local][Socket] thumbnail updated:', { photoId });
      } catch {
        console.warn('[Local][Socket] thumbnail update skipped; photo not found:', { photoId });
      }
    };

    // --- LISTENER 1: A new photo was created by someone else ---
    const handleNewPhoto = (newPhoto: PhotoApi) => {
      console.log('[Cloud][Socket] new_photo received:', {
        id: newPhoto.id,
        galleryId: (newPhoto as any).galleryId,
        createdAt: (newPhoto as any).createdAt,
      });
      // We got a new photo, sync it to the DB.
      // This will make it appear in the GalleryScreen's observer.
      syncPhotos(database, [newPhoto]);
    };
    
    socket.on('new_photo', handleNewPhoto);

    // --- LISTENER 2: A thumbnail is ready for an existing photo ---
    const handlePhotoUpdated = (data: { photoId: string; thumbnailUrl: string }) => {
      console.log('[Cloud][Socket] photo_updated received:', data);
      // We got a thumbnail, update the existing record.
      syncPhotoThumbnail(database, data.photoId, data.thumbnailUrl);
    };

    socket.on('photo_updated', handlePhotoUpdated);

    // --- (Add other listeners here, e.g., for new members, deleted photos) ---

    // Clean up listeners on unmount
    return () => {
      socket.off('new_photo', handleNewPhoto);
      socket.off('photo_updated', handlePhotoUpdated);
    };
  }, [database, queryClient]);
};