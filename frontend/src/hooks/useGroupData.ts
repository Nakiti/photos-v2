import { useDatabase } from '@nozbe/watermelondb/react';
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Group from "../db/models/Group"
import Gallery from '../db/models/Gallery';


import {
  createGroup,
  deleteGroup,
  fetchMyGroups,
  getGroupDetails,
  requestGroupIconPresign,
  updateGroup,
  leaveGroup,
  transferOwnership,
  type CreateGroupRequest,
  type UpdateGroupRequest,
} from '../services/api/groups.service';
import { syncGroups, syncGroupDetails } from '../services/sync/groups.sync';
import { getGalleriesByCommunityId, type GalleryApiResponse } from '../services/api/gallery.service';
import { syncGalleries, syncCommunityGalleries } from '../services/sync/gallery.sync';

export const useGroups = (searchQuery?: string) => {
  const database = useDatabase();
  const [groups, setGroups] = useState<Group[]>([]);

  // Observe local groups with optional name filter
  useEffect(() => {
    const groupsCollection = database.collections.get<Group>('communities');
    const conditions: any[] = [];
    if (searchQuery && searchQuery.trim() !== '') {
      const sanitized = Q.sanitizeLikeString(searchQuery.trim());
      conditions.push(Q.where('name', Q.like(`%${sanitized}%`)));
    }
    const query = groupsCollection.query(...conditions, Q.sortBy('created_at', Q.desc));
    const sub = query.observe().subscribe(setGroups);
    return () => sub.unsubscribe();
  }, [database, searchQuery]);

  // Fetch + sync from server
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const remote = await fetchMyGroups();
      await syncGroups(database, remote);
      return remote;
    },
    refetchOnWindowFocus: true,
  });

  return {
    groups,
    isLoading: isLoading && groups.length === 0,
    isSyncing: isFetching,
    isError,
    error,
  };
};

export const useGroup = (groupId: string | null) => {
  const database = useDatabase();
  const [group, setGroup] = useState<Group | null>(null);

  // Observe local group
  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      return;
    }
    const collection = database.collections.get<Group>('communities');
    const sub = collection.findAndObserve(groupId).subscribe(setGroup);
    return () => sub.unsubscribe();
  }, [database, groupId]);

  const { isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['group', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return null;
      const remote = await getGroupDetails(groupId);
      await syncGroupDetails(database, remote);
      return remote;
    },
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000,
  });

  return {
    group,
    isLoading: isLoading && !group,
    isSyncing: isFetching,
    isError,
    error,
    refetch
  };
};

export const useGroupGalleries = (groupId: string | null) => {
  const database = useDatabase();
  const [galleries, setGalleries] = useState<Gallery[]>([]);

  // 1. OBSERVE LOCAL DATA FIRST (instant UI)
  useEffect(() => {
    if (!groupId) {
      setGalleries([]);
      return;
    }
    const galleriesCollection = database.collections.get<Gallery>('galleries');
    const query = galleriesCollection.query(
      Q.where('community_id', groupId),
      Q.sortBy('created_at', Q.desc)
    );
    const subscription = query.observe().subscribe(setGalleries);
    return () => subscription.unsubscribe();
  }, [database, groupId]);

  // 2. FETCH & SYNC REMOTE DATA (background)
  const { isLoading, isError, error, isFetching } = useQuery<GalleryApiResponse[]>({
    queryKey: ['group-galleries', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return [];
      const remoteGalleries = await getGalleriesByCommunityId(groupId);
      // Use the optimized sync function that only touches this group's galleries
      await syncCommunityGalleries(database, remoteGalleries, groupId);
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
export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();

  return useMutation({
    mutationFn: async ({ data, imageUri }: { data: CreateGroupRequest; imageUri: string | null }) => {
      if (!imageUri) {
        const { community } = await createGroup(data);
        return community;
      }
      // Request wantsIconUpload flow
      const { community, uploadInfo } = await createGroup({ ...data, wantsIconUpload: true });
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
      // Return group with final icon url
      return {
        ...community,
        iconUrl: uploadInfo.finalUrl,
      };
    },
    onSuccess: async (newGroup) => {
      await syncGroupDetails(database, newGroup);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.setQueryData(['group', newGroup.id], newGroup);
    },
    onError: (e) => {
      console.error('Failed to create group:', e);
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: UpdateGroupRequest }) =>
      updateGroup(groupId, data),
    onSuccess: async (updated, { groupId }) => {
      await syncGroupDetails(database, updated);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useLeaveGroup = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();
  return useMutation({
    mutationFn: (groupId: string) => leaveGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useUpdateGroupIcon = (groupId: string | null) => {
  const queryClient = useQueryClient();
  const database = useDatabase();

  return useMutation({
    mutationFn: async (imageUri: string) => {
      if (!groupId) throw new Error('groupId is required');
      // Request presign
      const imageFetchResponse = await fetch(imageUri);
      const blob = await imageFetchResponse.blob();
      const imageType = blob.type || 'image/jpeg';
      const fileExtension = imageType === 'image/png' ? '.png' : '.jpg';

      const { presignedUrl, finalUrl } = await requestGroupIconPresign(
        groupId,
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
      // Save URL to group
      const updated = await updateGroup(groupId, { iconUrl: finalUrl });
      return updated;
    },
    onSuccess: async (updatedGroup, variables, context) => {
      await syncGroupDetails(database, updatedGroup);
      const id = updatedGroup?.id;
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['group', id] });
      }
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error) => {
      console.error('Failed to update group icon:', error);
    },
  });
};

export const useTransferOwnership = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();
  return useMutation({
    mutationFn: ({ groupId, newOwnerId }: { groupId: string; newOwnerId: string }) =>
      transferOwnership(groupId, newOwnerId),
    onSuccess: async (updated, { groupId }) => {
      await syncGroupDetails(database, updated);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
  });
};
