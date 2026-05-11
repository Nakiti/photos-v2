// src/api/users/user.routes.ts
import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import { addDeviceToken, removeDeviceToken, getMyProfile, requestAvatarUpload, updateMyProfile, searchUsers } from './users.controller.js';

const router = Router();

/**
 * @route GET /api/v1/users/search
 * @summary Search for users by name or handle
 * @query search - Search term (matches name or handle, case-insensitive)
 * @query limit - Maximum number of results (default: 20, max: 100)
 * @query offset - Pagination offset (default: 0)
 * @access Private
 */
router.get('/search', isAuthenticated, searchUsers);

/**
 * @route GET /api/v1/users/me
 * @summary Get the current authenticated user's profile
 * @access Private
 */
router.get('/me', isAuthenticated, getMyProfile);

/**
 * @route PUT /api/v1/users/me
 * @summary Update the current authenticated user's profile
 * @access Private
 */
router.put('/me', isAuthenticated, updateMyProfile);

/**
 * @route POST /api/v1/users/me/devices
 * @summary Register a device token for push notifications
 * @access Private
 */
router.post('/me/devices', isAuthenticated, addDeviceToken);

/**
 * @route DELETE /api/v1/users/me/devices
 * @summary Unregister a device token (logout or pause notifications)
 * @access Private
 */
router.delete('/me/devices', isAuthenticated, removeDeviceToken);

/**
 * @route POST /api/v1/users/me/avatar/presign
 * @summary Request presigned url
 * @access Private
 */
router.post('/me/avatar/presign', isAuthenticated, requestAvatarUpload)

export default router;



