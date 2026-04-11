import apiClient from '../apiClient';

export interface NotificationApi {
  id: string;
  recipientId: string;
  actorId: string;
  type: 'LIKE' | 'COMMENT' | 'INVITE' | 'SYSTEM';
  referenceId?: string | null;
  referenceType?: string | null;
  data?: {
    thumbnailUrl?: string | null;
    galleryName?: string | null;
    previewText?: string | null;
  } | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  actor: {
    id: string;
    name: string | null;
    handle: string;
    avatarUrl: string | null;
  };
}

export interface GetNotificationsResponse {
  notifications: NotificationApi[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Fetch notifications for the current user
 */
export const getNotifications = async (
  filters?: {
    limit?: number;
    offset?: number;
    isRead?: boolean;
  }
): Promise<GetNotificationsResponse> => {
  const params = new URLSearchParams();
  if (filters?.limit !== undefined) {
    params.append('limit', filters.limit.toString());
  }
  if (filters?.offset !== undefined) {
    params.append('offset', filters.offset.toString());
  }
  if (filters?.isRead !== undefined) {
    params.append('isRead', filters.isRead.toString());
  }

  const queryString = params.toString();
  const url = `/api/v1/notifications${queryString ? `?${queryString}` : ''}`;
  const response = await apiClient.get(url);
  return response.data as GetNotificationsResponse;
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<NotificationApi> => {
  const response = await apiClient.put(`/api/v1/notifications/${notificationId}/read`);
  return response.data as NotificationApi;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<{ count: number }> => {
  const response = await apiClient.put('/api/v1/notifications/read-all');
  return response.data as { count: number };
};


