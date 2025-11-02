import { useEffect, useState } from 'react';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import UserModel from '../db/models/User';
import { useAuthStore } from '../stores/auth.store';
import { addDeviceToken, getMyProfile, updateMyProfile, UpdateMyProfileRequest, RegisterDeviceRequest, UserProfile } from '../services/api/userService';
import { syncCurrentUser } from '../services/sync/user.sync';

export const useUser = () => {
  const database = useDatabase();
  const queryClient = useQueryClient();
  const { user: authUser, setUser: setAuthUser } = useAuthStore();

  const [currentUser, setCurrentUser] = useState<UserModel | null>(null);

  // Observe the current user's record in local DB
  useEffect(() => {
    if (!authUser?.id) return;

    const usersCollection = database.collections.get<UserModel>('users');
    let recordSubscription: any;
    let collectionSubscription: any;
    let cancelled = false;

    const subscribe = async () => {
      try {
        const model = await usersCollection.find(authUser.id);
        if (cancelled) return;
        recordSubscription = model.observe().subscribe(setCurrentUser);
      } catch {
        // If not found yet, observe the collection until it appears
        collectionSubscription = usersCollection
          .query()
          .observe()
          .subscribe((all) => {
            const found = all.find((u) => u.id === authUser.id);
            if (found) {
              collectionSubscription?.unsubscribe();
              recordSubscription = found.observe().subscribe(setCurrentUser);
            }
          });
      }
    };

    subscribe();

    return () => {
      cancelled = true;
      recordSubscription?.unsubscribe();
      collectionSubscription?.unsubscribe();
    };
  }, [database, authUser?.id]);

  // Fetch from API and sync into local DB
  const { isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['me'],
    enabled: !!authUser?.id,
    queryFn: async (): Promise<UserProfile> => {
      const profile = await getMyProfile();
      console.log("user profile ", profile)
      await syncCurrentUser(database, profile);
      setAuthUser(profile); // keep auth store fresh
      return profile;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    user: currentUser,
    isLoading: isLoading && !currentUser,
    isSyncing: isFetching,
    isError,
    error,
    refetch,
  };
};

export const useUpdateMyProfile = () => {
  const database = useDatabase();
  const queryClient = useQueryClient();
  const { setUser: setAuthUser } = useAuthStore();

  return useMutation({
    mutationFn: (data: UpdateMyProfileRequest) => updateMyProfile(data),
    onSuccess: async (updated) => {
      await syncCurrentUser(database, updated);
      setAuthUser(updated);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

export const useRegisterDeviceToken = () => {
  return useMutation({
    mutationFn: (req: RegisterDeviceRequest) => addDeviceToken(req),
  });
};
