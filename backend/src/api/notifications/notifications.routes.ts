import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
} from './notifications.controller.js';

const router = Router();

/**
 * @route GET /api/v1/notifications
 * @summary Get notifications for the current user with pagination
 * @query limit - Maximum number of results (default: 20, max: 100)
 * @query offset - Pagination offset (default: 0)
 * @query isRead - Filter by read status (optional boolean)
 * @access Private
 */
router.get('/', isAuthenticated, getNotifications);

/**
 * @route PUT /api/v1/notifications/:notificationId/read
 * @summary Mark a notification as read
 * @access Private
 */
router.put('/:notificationId/read', isAuthenticated, markNotificationAsRead);

/**
 * @route PUT /api/v1/notifications/read-all
 * @summary Mark all notifications as read for the current user
 * @access Private
 */
router.put('/read-all', isAuthenticated, markAllAsRead);

export default router;


