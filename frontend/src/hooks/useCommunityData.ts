import { useDatabase } from '@nozbe/watermelondb/react';
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Community from "../db/models/Community"
import Gallery from '../db/models/Gallery';


import {
  createCommunity,
  deleteCommunity,
  fetchMyCommunities,
  getCommunityDetails,
  requestCommunityIconPresign,
  updateCommunity,
  leaveCommunity,
  type CreateCommunityRequest,
  type UpdateCommunityRequest,
} from '../services/api/communities.service';
import { syncCommunities, syncCommunityDetails } from '../services/sync/communities.sync';
import { getGalleriesByCommunityId, type GalleryApiResponse } from '../services/api/gallery.service';
import { syncGalleries, syncCommunityGalleries } from '../services/sync/gallery.sync';

export const useCommunities = (searchQuery?: string) => {
  const database = useDatabase();
  const [communities, setCommunities] = useState<Community[]>([]);

  // Observe local communities with optional name filter
  useEffect(() => {
    const communitiesCollection = database.collections.get<Community>('communities');
    const conditions: any[] = [];
    if (searchQuery && searchQuery.trim() !== '') {
      const sanitized = Q.sanitizeLikeString(searchQuery.trim());
      conditions.push(Q.where('name', Q.like(`%${sanitized}%`)));
    }
    const query = communitiesCollection.query(...conditions, Q.sortBy('created_at', Q.desc));
    const sub = query.observe().subscribe(setCommunities);
    return () => sub.unsubscribe();
  }, [database, searchQuery]);

  // Fetch + sync from server
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['communities', searchQuery ?? 'all'],
    queryFn: async () => {
      const remote = await fetchMyCommunities();
      await syncCommunities(database, remote);
      return remote;
    },
    refetchOnWindowFocus: true,
  });

  return {
    communities,
    isLoading: isLoading && communities.length === 0,
    isSyncing: isFetching,
    isError,
    error,
  };
};

export const useCommunity = (communityId: string | null) => {
  const database = useDatabase();
  const [community, setCommunity] = useState<Community | null>(null);

  // Observe local community
  useEffect(() => {
    if (!communityId) {
      setCommunity(null);
      return;
    }
    const collection = database.collections.get<Community>('communities');
    const sub = collection.findAndObserve(communityId).subscribe(setCommunity);
    return () => sub.unsubscribe();
  }, [database, communityId]);

  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['community', communityId],
    enabled: !!communityId,
    queryFn: async () => {
      if (!communityId) return null;
      const remote = await getCommunityDetails(communityId);
      await syncCommunityDetails(database, remote);
      return remote;
    },
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000,
  });

  return {
    community,
    isLoading: isLoading && !community,
    isSyncing: isFetching,
    isError,
    error,
  };
};

export const useCommunityGalleries = (communityId: string | null) => {
  const database = useDatabase();
  const [galleries, setGalleries] = useState<Gallery[]>([]);

  // 1. OBSERVE LOCAL DATA FIRST (instant UI)
  useEffect(() => {
    if (!communityId) {
      setGalleries([]);
      return;
    }
    const galleriesCollection = database.collections.get<Gallery>('galleries');
    const query = galleriesCollection.query(
      Q.where('community_id', communityId),
      Q.sortBy('created_at', Q.desc)
    );
    const subscription = query.observe().subscribe(setGalleries);
    return () => subscription.unsubscribe();
  }, [database, communityId]);

  // 2. FETCH & SYNC REMOTE DATA (background)
  const { isLoading, isError, error, isFetching } = useQuery<GalleryApiResponse[]>({
    queryKey: ['community-galleries', communityId],
    enabled: !!communityId,
    queryFn: async () => {
      if (!communityId) return [];
      const remoteGalleries = await getGalleriesByCommunityId(communityId);
      // Use the optimized sync function that only touches this community's galleries
      await syncCommunityGalleries(database, remoteGalleries, communityId);
      return remoteGalleries;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const hasGalleries = Boolean(galleries.length);

  return {
    galleries, // Local data (instant)
    isLoading: isLoading && !hasGalleries, // Only show loading if no local data
    isSyncing: isFetching, // Background sync indicator
    isError,
    error,
  };
};

// Mutations
export const useCreateCommunity = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();

  return useMutation({
    mutationFn: async ({ data, imageUri }: { data: CreateCommunityRequest; imageUri: string | null }) => {
      if (!imageUri) {
        const { community } = await createCommunity(data);
        return community;
      }
      // Request wantsIconUpload flow
      const { community, uploadInfo } = await createCommunity({ ...data, wantsIconUpload: true });
      if (!uploadInfo) throw new Error('Server did not return upload info.');

      const imageFetchResponse = await fetch(imageUri);
      const blob = await imageFetchResponse.blob();
      const imageType = blob.type || 'image/jpeg';

      const s3UploadResponse = await fetch(uploadInfo.presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': imageType,
        },
      });
      if (!s3UploadResponse.ok) {
        throw new Error('Failed to upload image to S3.');
      }
      // Return community with final icon url
      return {
        ...community,
        iconUrl: uploadInfo.finalUrl,
      };
    },
    onSuccess: async (newCommunity) => {
      await syncCommunityDetails(database, newCommunity);
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.setQueryData(['community', newCommunity.id], newCommunity);
    },
    onError: (e) => {
      console.error('Failed to create community:', e);
    },
  });
};

export const useUpdateCommunity = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();
  return useMutation({
    mutationFn: ({ communityId, data }: { communityId: string; data: UpdateCommunityRequest }) =>
      updateCommunity(communityId, data),
    onSuccess: async (updated, { communityId }) => {
      await syncCommunityDetails(database, updated);
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
    },
  });
};

export const useDeleteCommunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (communityId: string) => deleteCommunity(communityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
};

export const useLeaveCommunity = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();
  return useMutation({
    mutationFn: (communityId: string) => leaveCommunity(communityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
};

export const useUpdateCommunityIcon = (communityId: string | null) => {
  const queryClient = useQueryClient();
  const database = useDatabase();

  return useMutation({
    mutationFn: async (imageUri: string) => {
      if (!communityId) throw new Error('communityId is required');
      // Request presign
      const imageFetchResponse = await fetch(imageUri);
      const blob = await imageFetchResponse.blob();
      const imageType = blob.type || 'image/jpeg';
      const fileExtension = imageType === 'image/png' ? '.png' : '.jpg';

      const { presignedUrl, finalUrl } = await requestCommunityIconPresign(
        communityId,
        imageType,
        fileExtension
      );

      const s3UploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': imageType,
        },
      });
      if (!s3UploadResponse.ok) {
        throw new Error('Failed to upload image to S3.');
      }
      // Save URL to community
      const updated = await updateCommunity(communityId, { iconUrl: finalUrl });
      return updated;
    },
    onSuccess: async (updatedCommunity, variables, context) => {
      await syncCommunityDetails(database, updatedCommunity);
      const id = updatedCommunity?.id;
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['community', id] });
      }
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
    onError: (error) => {
      console.error('Failed to update community icon:', error);
    },
  });
};


