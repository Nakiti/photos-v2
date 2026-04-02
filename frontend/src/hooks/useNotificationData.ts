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
      if (notificationsList.length === 0) {
        setNotifications([]);
        return;
      }
      // Batch-fetch all actors in a single query instead of N individual fetches
      const usersCollection = database.collections.get<User>('users');
      const actorIds = [...new Set(notificationsList.map(n => n.actorId).filter(Boolean))];
      const actors = await usersCollection.query(Q.where('id', Q.oneOf(actorIds))).fetch();
      const actorMap = new Map(actors.map(a => [a.id, a]));

      const enriched: EnrichedNotification[] = notificationsList
        .map(notification => ({ notification, actor: actorMap.get(notification.actorId) }))
        .filter((e): e is EnrichedNotification => !!e.actor);

      setNotifications(enriched);
    });

    return () => subscription.unsubscribe();
  }, [database, currentUser?.id, filters?.isRead]);

  // Fetch & sync remote data
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['notifications'],
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
        await database.batch(
          notification.prepareUpdate((record) => {
            record.isRead = true;
          })
        );
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
      
      // Update local database — batch all updates in a single write
      const notificationsCollection = database.collections.get<Notification>('notifications');
      const unreadNotifications = await notificationsCollection
        .query(
          Q.where('recipient_id', currentUser!.id),
          Q.where('is_read', false)
        )
        .fetch();

      if (unreadNotifications.length > 0) {
        const updates = unreadNotifications.map(n =>
          n.prepareUpdate((record) => {
            record.isRead = true;
          })
        );
        await database.write(async () => {
          await database.batch(updates);
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};


