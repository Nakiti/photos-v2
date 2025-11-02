// src/api/users/user.routes.ts
import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import { addDeviceToken, getMyProfile, requestAvatarUpload, updateMyProfile } from './users.controller.js';

const router = Router();

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
 * @route POST /api/v1/users/me/avatar/presign
 * @summary Request presigned url
 * @access Private
 */
router.post('/me/avatar/presign', isAuthenticated, requestAvatarUpload)

export default router;



