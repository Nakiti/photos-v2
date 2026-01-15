import { useDatabase } from '@nozbe/watermelondb/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import Notification from '../db/models/Notification';
import User from '../db/models/User';
import { useAuth } from './useAuth';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/api/notifications.service';
import { syncNotifications } from '../services/sync/notifications.sync';

export interface EnrichedNotification {
  notification: Notification;
  actor: User;
}

/**
 * Hook to get notifications for the current user.
 * Observes local DB and syncs with the server in the background.
 */
export const useNotifications = (filters?: { isRead?: boolean }) => {
  const database = useDatabase();
  const { user: currentUser } = useAuth();
  const [notifications, setNotifications] = useState<EnrichedNotification[]>([]);
  const queryClient = useQueryClient();

  // Observe local notifications
  useEffect(() => {
    if (!database || !currentUser?.id) return;

    const notificationsCollection = database.collections.get<Notification>('notifications');
    
    // Build query conditions
    const conditions: any[] = [Q.where('recipient_id', currentUser.id)];
    if (filters?.isRead !== undefined) {
      conditions.push(Q.where('is_read', filters.isRead));
    }

    const query = notificationsCollection.query(
      ...conditions,
      Q.sortBy('created_at', Q.desc)
    );

    const subscription = query.observeWithColumns(['is_read', 'created_at']).subscribe(async (notificationsList) => {
      // Enrich notifications with actor data
      const enriched: EnrichedNotification[] = [];
      for (const notification of notificationsList) {
        try {
          const actor = await notification.actor.fetch();
          enriched.push({
            notification,
            actor,
          });
        } catch (error) {
          console.error('Error fetching actor for notification:', error);
        }
      }
      setNotifications(enriched);
    });

    return () => subscription.unsubscribe();
  }, [database, currentUser?.id, filters?.isRead]);

  // Fetch & sync remote data
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['notifications', filters],
    queryFn: async () => {
      const remote = await getNotifications({
        limit: 100, // Fetch a reasonable number
        offset: 0,
        isRead: filters?.isRead,
      });
      await syncNotifications(database, remote);
      return remote;
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    notifications,
    isLoading: isLoading && notifications.length === 0,
    isSyncing: isFetching,
    isError,
    error,
  };
};

/**
 * Hook to mark a notification as read
 */
export const useMarkNotificationAsRead = () => {
  const database = useDatabase();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const updated = await markNotificationAsRead(notificationId);
      
      // Update local database
      const notificationsCollection = database.collections.get<Notification>('notifications');
      const notification = await notificationsCollection.find(notificationId);
      await database.write(async () => {
        await notification.update((record: any) => {
          record.is_read = true;
          record.updated_at = new Date(updated.updatedAt).getTime();
        });
      });

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

/**
 * Hook to mark all notifications as read
 */
export const useMarkAllNotificationsAsRead = () => {
  const database = useDatabase();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const result = await markAllNotificationsAsRead();
      
      // Update local database
      const notificationsCollection = database.collections.get<Notification>('notifications');
      const unreadNotifications = await notificationsCollection
        .query(
          Q.where('recipient_id', currentUser!.id),
          Q.where('is_read', false)
        )
        .fetch();

      await database.write(async () => {
        for (const notification of unreadNotifications) {
          await notification.update((record: any) => {
            record.is_read = true;
            record.updated_at = Date.now();
          });
        }
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

