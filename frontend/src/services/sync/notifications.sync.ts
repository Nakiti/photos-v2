import { Database, Q } from '@nozbe/watermelondb';
import Notification from '../../db/models/Notification';
import User from '../../db/models/User';
import { NotificationApi, GetNotificationsResponse } from '../api/notifications.service';

/**
 * Sync notifications from the server with the local WatermelonDB.
 * This syncs all notifications for the current user.
 */
export const syncNotifications = async (
  database: Database,
  remote: GetNotificationsResponse
) => {
  const notificationsCollection = database.collections.get<Notification>('notifications');
  const usersCollection = database.collections.get<User>('users');

  const remoteNotifications = remote.notifications;
  const remoteUserMap = new Map<string, any>();
  
  // Collect all unique actor IDs
  for (const notification of remoteNotifications) {
    if (notification.actor) {
      remoteUserMap.set(notification.actor.id, notification.actor);
    }
  }
  const remoteUserIds = Array.from(remoteUserMap.keys());

  // Fetch existing users
  const localUsers = await usersCollection
    .query(Q.where('id', Q.oneOf(remoteUserIds)))
    .fetch();
  const localUserMap = new Map(localUsers.map((u: any) => [u.id, u]));

  // Fetch existing notifications
  const notificationIds = remoteNotifications.map(n => n.id);
  const localNotifications = await notificationsCollection
    .query(Q.where('id', Q.oneOf(notificationIds)))
    .fetch();
  const localMap = new Map(localNotifications.map((n: any) => [n.id, n]));

  const operations: any[] = [];

  // Sync users (actors)
  for (const [userId, remoteUser] of remoteUserMap.entries()) {
    const localUser = localUserMap.get(userId);
    if (localUser) {
      // Update existing user
      operations.push(
        localUser.prepareUpdate((record: any) => {
          record.name = remoteUser.name ?? record.name;
          record.avatar_url = remoteUser.avatarUrl ?? record.avatar_url;
          record.handle = remoteUser.handle ?? record.handle;
        })
      );
    } else {
      // Create new user
      operations.push(
        usersCollection.prepareCreate((record: any) => {
          record._raw.id = remoteUser.id;
          record.name = remoteUser.name;
          record.avatar_url = remoteUser.avatarUrl;
          record.handle = remoteUser.handle;
        })
      );
    }
  }

  // Sync notifications
  for (const remote of remoteNotifications) {
    const local = localMap.get(remote.id);
    const dataJson = remote.data ? JSON.stringify(remote.data) : null;

    if (local) {
      // Update existing notification
      operations.push(
        local.prepareUpdate((record: any) => {
          record.recipient_id = remote.recipientId;
          record.actor_id = remote.actorId;
          record.type = remote.type;
          record.reference_id = remote.referenceId ?? null;
          record.reference_type = remote.referenceType ?? null;
          record.data = dataJson;
          record.is_read = remote.isRead;
          record.updated_at = new Date(remote.updatedAt).getTime();
        })
      );
    } else {
      // Create new notification
      operations.push(
        notificationsCollection.prepareCreate((record: any) => {
          record._raw.id = remote.id;
          record.recipient_id = remote.recipientId;
          record.actor_id = remote.actorId;
          record.type = remote.type;
          record.reference_id = remote.referenceId ?? null;
          record.reference_type = remote.referenceType ?? null;
          record.data = dataJson;
          record.is_read = remote.isRead;
          record.created_at = new Date(remote.createdAt).getTime();
          record.updated_at = new Date(remote.updatedAt).getTime();
        })
      );
    }
  }

  // Execute all operations in a batch
  if (operations.length > 0) {
    await database.write(async () => {
      await database.batch(...operations);
    });
  }
};

