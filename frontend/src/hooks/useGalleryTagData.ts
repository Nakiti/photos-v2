import { useDatabase } from '@nozbe/watermelondb/react';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Q } from '@nozbe/watermelondb';
import Tag from '../db/models/Tag';
import { listTagsForGallery } from '../services/api/tags.service';
import { syncTags } from '../services/sync/tags.sync';

/**
 * Observe and sync tags for a specific gallery, with full reconciliation:
 * - Live local observation for instant UI
 * - Background fetch + upsert + deletion reconciliation
 */
export function useGalleryTags(galleryId: string | null) {
  const database = useDatabase();
  const [tags, setTags] = useState<Tag[]>([]);

  // 1) Observe local tags
  useEffect(() => {
    if (!galleryId) {
      setTags([]);
      return;
    }
    const tagsCollection = database.collections.get<Tag>('tags');
    const query = tagsCollection.query(
      Q.where('gallery_id', galleryId),
      Q.sortBy('name', Q.asc),
    );
    const sub = query.observe().subscribe(setTags);
    return () => sub.unsubscribe();
  }, [database, galleryId]);

  // 2) Fetch remote and sync
  const { isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['gallery-tags', galleryId],
    queryFn: async () => {
      if (!galleryId) return [];
      const remote = await listTagsForGallery(galleryId);
      await syncTags(database, galleryId, remote);
      return remote;
    },
    enabled: !!galleryId,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });

  return {
    tags,
    isLoading: isLoading && tags.length === 0,
    isSyncing: isFetching,
    isError,
    error,
  };
}


