import type { Request, Response } from 'express';
import { z } from 'zod';
import * as notificationsService from './notifications.service.js';
import { getNotificationsSchema, markAsReadSchema } from './notifications.validation.js';

/**
 * GET /api/v1/notifications
 * Get notifications for the current user with pagination
 */
export async function getNotifications(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const parsed = getNotificationsSchema.parse({ query: req.query });
    const filters = parsed.query;

    const result = await notificationsService.getNotificationsForUser(userId, {
      limit: filters.limit,
      offset: filters.offset,
      isRead: filters.isRead,
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.flatten().fieldErrors,
      });
    }
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
}

/**
 * PUT /api/v1/notifications/:notificationId/read
 * Mark a notification as read
 */
export async function markNotificationAsRead(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const parsed = markAsReadSchema.parse({ params: req.params });
    const { notificationId } = parsed.params as { notificationId: string };

    const updated = await notificationsService.markAsRead(userId, notificationId);
    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.flatten().fieldErrors,
      });
    }
    return res.status(500).json({ message: 'Failed to mark notification as read' });
  }
}

/**
 * PUT /api/v1/notifications/read-all
 * Mark all notifications as read for the current user
 */
export async function markAllAsRead(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const count = await notificationsService.markAllAsRead(userId);
    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
}

