import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import {
	createCommunity,
	getMyCommunities,
	getCommunityDetails,
	updateCommunity,
	deleteCommunity,
	requestIconUpload,
	transferOwnership,
	getShareLink,
} from './communities.controller.js';
import membersRoutes from './members/members.routes.js';
import { joinCommunity, leaveCommunity } from './members/members.controller.js';

const router = Router();

// All community routes require authentication

// POST /api/v1/communities
router.post('/', isAuthenticated, createCommunity);

// GET /api/v1/communities
router.get('/', isAuthenticated, getMyCommunities);

// GET /api/v1/communities/:communityId
router.get('/:communityId', isAuthenticated, getCommunityDetails);

// PUT /api/v1/communities/:communityId
router.put('/:communityId', isAuthenticated, updateCommunity);

// DELETE /api/v1/communities/:communityId
router.delete('/:communityId', isAuthenticated, deleteCommunity);

// POST /api/v1/communities/:communityId/icon/presign
router.post('/:communityId/icon/presign', isAuthenticated, requestIconUpload);

// PUT /api/v1/communities/:communityId/transfer-ownership
router.put('/:communityId/transfer-ownership', isAuthenticated, transferOwnership);

// GET /api/v1/communities/:communityId/share-link
router.get('/:communityId/share-link', isAuthenticated, getShareLink);

// Membership actions for current user
// POST /api/v1/communities/:communityId/join
router.post('/:communityId/join', isAuthenticated, joinCommunity);
// DELETE /api/v1/communities/:communityId/leave
router.delete('/:communityId/leave', isAuthenticated, leaveCommunity);

// Nested members routes
router.use('/:communityId/members', membersRoutes);

export default router;









