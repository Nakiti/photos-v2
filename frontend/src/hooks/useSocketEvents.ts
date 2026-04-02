import { useEffect, useRef } from 'react';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '../services/socketClient'; // Assume you have a central socket client
import { Photo as PhotoApi } from '../types';
import { syncPhotos } from '../services/sync/photos.sync';
import { syncGalleryDetails } from '../services/sync/gallery.sync';
import { Database, Q } from '@nozbe/watermelondb';
import Photo from '../db/models/Photo';
import PhotoTag from '../db/models/PhotoTag';

/**
 * This hook manages all incoming Socket.IO event listeners for the app.
 * It should be mounted once in a high-level component (like App.tsx).
 */
export const useSocketEvents = () => {
  const database = useDatabase();
  const queryClient = useQueryClient();
  // Skip invalidation on the very first 'connect' event (initial connection).
  // Only refetch on actual reconnects to recover missed socket events.
  const isInitialConnectRef = useRef(true);

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

    // --- LISTENER 1: A new photo arrived ---
    // The server sends a minimal payload { id, galleryId, uploaderId, clientId }.
    // Only the photos query is invalidated — gallery metadata doesn't need refreshing.
    const handleNewPhoto = (data: { id: string; galleryId: string; uploaderId: string; clientId?: string }) => {
      console.log('[Cloud][Socket] new_photo received:', data);
      queryClient.invalidateQueries({ queryKey: ['gallery', data.galleryId, 'photos'], refetchType: 'active' });
    };

    socket.on('new_photo', handleNewPhoto);

    // --- LISTENER 2: A single photo was updated (thumbnail ready) ---
    const handlePhotoUpdated = async (updatedPhoto: PhotoApi) => {
      console.log('[Cloud][Socket] photo_updated received:', updatedPhoto);
      await syncPhotos(database, [updatedPhoto]);
      queryClient.invalidateQueries({ queryKey: ['gallery', updatedPhoto.galleryId, 'photos'] });
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
            const photo = await photosCollection.find(data.photoId);
            // Skip if the photo is mid-upload — tags will be reconciled once the
            // upload completes and the permanent record is created.
            if (photo.status === 'queued' || photo.status === 'uploading') {
              console.warn('[Local][Socket] tag add skipped; photo is being uploaded:', { photoId: data.photoId });
              return;
            }

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

    // --- LISTENER 0: Reconnect — refetch active gallery queries to recover missed events ---
    const handleReconnect = () => {
      if (isInitialConnectRef.current) {
        isInitialConnectRef.current = false;
        return;
      }
      console.log('[Socket] Reconnected — refetching active gallery queries to recover missed events');
      // refetchType: 'active' forces an immediate refetch of any mounted gallery queries,
      // which will call fetchPhotos(since=lastSyncedTimestamp) to pull in missed photos.
      queryClient.invalidateQueries({ queryKey: ['gallery'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['galleries'], refetchType: 'active' });
    };

    socket.on('connect', handleReconnect);

    // --- LISTENER 5: Gallery metadata was updated ---
    const handleGalleryUpdated = async (gallery: any) => {
      console.log('[Cloud][Socket] gallery_updated received:', { id: gallery.id, name: gallery.name });
      await syncGalleryDetails(database, gallery);
      // Only the meta query needs refreshing — photos are unaffected.
      queryClient.invalidateQueries({ queryKey: ['gallery', gallery.id, 'meta'] });
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
    };

    socket.on('gallery_updated', handleGalleryUpdated);

    // Clean up listeners on unmount
    return () => {
      socket.off('connect', handleReconnect);
      socket.off('new_photo', handleNewPhoto);
      socket.off('photo_updated', handlePhotoUpdated);
      socket.off('photo_deleted', handlePhotoDeleted);
      socket.off('photo_tagged', handlePhotoTagged);
      socket.off('gallery_updated', handleGalleryUpdated);
    };
  }, [database, queryClient]);
};