import { useEffect } from 'react';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '../services/socketClient'; // Assume you have a central socket client
import { Photo as PhotoApi } from '../types';
import { syncPhotos } from '../services/sync/photos.sync';
import { syncGalleryDetails } from '../services/sync/gallery.sync';
import { updateOptimisticPhoto } from '../services/sync/photos.sync';
import { Database, Q } from '@nozbe/watermelondb';
import Photo from '../db/models/Photo';
import PhotoTag from '../db/models/PhotoTag';
import { useAuthStore } from '../stores/auth.store';

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
    const handleNewPhoto = async (newPhoto: PhotoApi) => {
      console.log('[Cloud][Socket] new_photo received:', {
        id: newPhoto.id,
        galleryId: (newPhoto as any).galleryId,
        createdAt: (newPhoto as any).createdAt,
        uploaderId: (newPhoto as any).uploaderId,
      });

      const currentUserId = useAuthStore.getState().user?.id;
      const galleryId = (newPhoto as any).galleryId;
      const uploaderId = (newPhoto as any).uploaderId;

      // --- CONFLICT RESOLUTION: Check if this is our own photo we're uploading ---
      // If the uploader is the current user, check if we have an optimistic photo
      // that matches (same gallery, same user, status queued/uploading)
      if (currentUserId && uploaderId === currentUserId) {
        try {
          const photosCollection = database.collections.get<Photo>('photos');
          const optimisticPhotos = await photosCollection
            .query(
              Q.where('gallery_id', galleryId),
              Q.where('uploader_id', currentUserId),
              Q.where('status', Q.oneOf(['queued', 'uploading']))
            )
            .fetch();

          // Check if there's an optimistic photo that could be this one
          // We match by gallery and uploader, and check if the timestamp is close
          // (within 5 minutes, since uploads should complete quickly)
          const photoCreatedAt = new Date((newPhoto as any).createdAt).getTime();
          const now = Date.now();
          const timeWindow = 5 * 60 * 1000; // 5 minutes

          for (const optimisticPhoto of optimisticPhotos) {
            const optimisticCreatedAt = optimisticPhoto.createdAt;
            // Compare absolute difference between timestamps
            // Both are relative to "now", so we compare their relative ages
            const optimisticAge = now - optimisticCreatedAt;
            const photoAge = now - photoCreatedAt;
            const timeDiff = Math.abs(optimisticAge - photoAge);
            
            // If timestamps are close (within time window), this is likely the same photo
            if (timeDiff < timeWindow) {
              console.log(
                `[Conflict][Socket] Matched socket photo to optimistic photo: ` +
                `optimistic=${optimisticPhoto.id} final=${newPhoto.id}`
              );
              // Update the optimistic photo instead of creating a duplicate
              await updateOptimisticPhoto(database, optimisticPhoto.id, newPhoto);
              return; // Don't sync as new photo
            }
          }
        } catch (error) {
          console.warn('[Conflict][Socket] Error checking for optimistic photo match:', error);
          // Fall through to normal sync if check fails
        }
      }

      // Normal case: sync the new photo (either from another user, or no optimistic match found)
      syncPhotos(database, [newPhoto]);
    };
    
    socket.on('new_photo', handleNewPhoto);

    // --- LISTENER 2: A photo was updated (thumbnail or visibility) ---
    const handlePhotoUpdated = async (updatedPhoto: PhotoApi) => {
      console.log('[Cloud][Socket] photo_updated received:', updatedPhoto);
      // Sync the updated photo (handles both thumbnail and visibility updates)
      await syncPhotos(database, [updatedPhoto]);
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['gallery', updatedPhoto.galleryId] });
    };

    socket.on('photo_updated', handlePhotoUpdated);

    // --- LISTENER 3: A photo was deleted by someone else ---
    const handlePhotoDeleted = async (data: { photoId: string; galleryId: string }) => {
      console.log('[Cloud][Socket] photo_deleted received:', data);
      try {
        const photosCollection = database.collections.get<Photo>('photos');
        const photo = await photosCollection.find(data.photoId);
        
        // --- CONFLICT RESOLUTION: Check if photo is being uploaded ---
        // If the photo is queued or uploading, it means the user is currently uploading it
        // In this case, we should NOT delete it (the upload will complete and replace it)
        if (photo.status === 'queued' || photo.status === 'uploading') {
          console.log(
            `[Conflict][Socket] Ignoring deletion for photo being uploaded: ` +
            `photoId=${data.photoId} status=${photo.status}`
          );
          return;
        }
        
        await database.write(async () => {
          await photo.destroyPermanently();
        });
        console.log('[Local][Socket] photo deleted:', { photoId: data.photoId });
      } catch (error) {
        // Photo might not exist locally (e.g., user hasn't synced it yet, or already deleted)
        // This is idempotent - safe to ignore
        console.warn('[Local][Socket] photo deletion skipped; photo not found:', { photoId: data.photoId });
      }
    };

    socket.on('photo_deleted', handlePhotoDeleted);

    // --- LISTENER 4: A photo tag was added or removed ---
    const handlePhotoTagged = async (data: { photoId: string; tagId: string; action: 'added' | 'removed'; galleryId: string }) => {
      console.log('[Cloud][Socket] photo_tagged received:', data);
      try {
        const photoTagsCollection = database.collections.get<PhotoTag>('photo_tags');
        
        if (data.action === 'added') {
          // Check if photo exists locally first
          const photosCollection = database.collections.get<Photo>('photos');
          try {
            await photosCollection.find(data.photoId);
            
            // Check if tag already exists (idempotent)
            const existing = await photoTagsCollection
              .query(
                Q.where('photo_id', data.photoId),
                Q.where('tag_id', data.tagId)
              )
              .fetch();
            
            if (existing.length === 0) {
              await database.write(async () => {
                await photoTagsCollection.create(record => {
                  record.photoId = data.photoId;
                  record.tagId = data.tagId;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (record as any)._raw.created_at = Date.now();
                });
              });
              console.log('[Local][Socket] tag added to photo:', { photoId: data.photoId, tagId: data.tagId });
            }
          } catch {
            // Photo doesn't exist locally yet, skip (will be synced when photo arrives)
            console.warn('[Local][Socket] tag add skipped; photo not found locally:', { photoId: data.photoId });
          }
        } else {
          // Remove tag
          const existing = await photoTagsCollection
            .query(
              Q.where('photo_id', data.photoId),
              Q.where('tag_id', data.tagId)
            )
            .fetch();
          
          if (existing.length > 0) {
            await database.write(async () => {
              await existing[0].destroyPermanently();
            });
            console.log('[Local][Socket] tag removed from photo:', { photoId: data.photoId, tagId: data.tagId });
          }
        }
      } catch (error) {
        console.error('[Local][Socket] error handling photo tag update:', error);
      }
    };

    socket.on('photo_tagged', handlePhotoTagged);

    // --- LISTENER 5: Gallery metadata was updated ---
    const handleGalleryUpdated = async (gallery: any) => {
      console.log('[Cloud][Socket] gallery_updated received:', { id: gallery.id, name: gallery.name });
      // Sync the updated gallery details to local DB
      await syncGalleryDetails(database, gallery);
      // Invalidate gallery queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['gallery', gallery.id] });
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
    };

    socket.on('gallery_updated', handleGalleryUpdated);

    // Clean up listeners on unmount
    return () => {
      socket.off('new_photo', handleNewPhoto);
      socket.off('photo_updated', handlePhotoUpdated);
      socket.off('photo_deleted', handlePhotoDeleted);
      socket.off('photo_tagged', handlePhotoTagged);
      socket.off('gallery_updated', handleGalleryUpdated);
    };
  }, [database, queryClient]);
};