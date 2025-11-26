import { Router } from 'express';
import { isAuthenticated } from '../../../middleware/auth.middleware.js';
import { addMember, removeMember, reconcileGalleryMembers, getMembers, promoteMember, approveMember, updateMyMembership, getMyMembership, addCommunityMembersToGallery } from './members.controller.js';

/**
 * Members router, merged under `/api/v1/galleries/:galleryId/members`.
 * Provides endpoints to add/remove members and fetch reconciliation info.
 */
const router = Router({ mergeParams: true });

/**
 * Add a member to a gallery.
 * @route POST /api/v1/galleries/:galleryId/members
 */
router.post('/', isAuthenticated, addMember);

/**
 * Bulk add all members from a community to a gallery.
 * @route POST /api/v1/galleries/:galleryId/members/bulk
 */
router.post('/bulk', isAuthenticated, addCommunityMembersToGallery);

/**
 * Remove a member from a gallery.
 * @route DELETE /api/v1/galleries/:galleryId/members/:userId
 */
router.delete('/:userId', isAuthenticated, removeMember);

/**
 * Promote a member to admin.
 * @route PUT /api/v1/galleries/:galleryId/members/:userId/promote
 */
router.put('/:userId/promote', isAuthenticated, promoteMember);

/**
 * Approve a pending membership.
 * @route PUT /api/v1/galleries/:galleryId/members/:userId/approve
 */
router.put('/:userId/approve', isAuthenticated, approveMember);

/**
 * Return all member userIds for reconciliation.
 * @route GET /api/v1/galleries/:galleryId/members/sync
 */
router.get('/sync', isAuthenticated, reconcileGalleryMembers);


/**
 * Return all members for a gallery.
 * @route GET /api/v1/galleries/:galleryId/members
 */
router.get('/', isAuthenticated, getMembers);

/**
 * @route PUT /api/v1/galleries/:galleryId/members/me
 * @description Current user updates their own membership (e.g., mutes notifications).
 * @body { isMuted: boolean }
 * @access Private
 */
router.put('/me', isAuthenticated, updateMyMembership);

/**
 * Get current user's membership in this gallery.
 * @route GET /api/v1/galleries/:galleryId/members/me
 */
router.get('/me', isAuthenticated, getMyMembership);

export default router;


