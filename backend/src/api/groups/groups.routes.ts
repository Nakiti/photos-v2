import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import {
	createGroup,
	getMyGroups,
	getGroupDetails,
	updateGroup,
	deleteGroup,
	requestIconUpload,
	transferOwnership,
	getShareLink,
} from './groups.controller.js';
import membersRoutes from './members/members.routes.js';
import { joinGroup, leaveGroup } from './members/members.controller.js';

const router = Router();

// All group routes require authentication

// POST /api/v1/communities
router.post('/', isAuthenticated, createGroup);

// GET /api/v1/communities
router.get('/', isAuthenticated, getMyGroups);

// GET /api/v1/communities/:groupId
router.get('/:groupId', isAuthenticated, getGroupDetails);

// PUT /api/v1/communities/:groupId
router.put('/:groupId', isAuthenticated, updateGroup);

// DELETE /api/v1/communities/:groupId
router.delete('/:groupId', isAuthenticated, deleteGroup);

// POST /api/v1/communities/:groupId/icon/presign
router.post('/:groupId/icon/presign', isAuthenticated, requestIconUpload);

// PUT /api/v1/communities/:groupId/transfer-ownership
router.put('/:groupId/transfer-ownership', isAuthenticated, transferOwnership);

// GET /api/v1/communities/:groupId/share-link
router.get('/:groupId/share-link', isAuthenticated, getShareLink);

// Membership actions for current user
// POST /api/v1/communities/:groupId/join
router.post('/:groupId/join', isAuthenticated, joinGroup);
// DELETE /api/v1/communities/:groupId/leave
router.delete('/:groupId/leave', isAuthenticated, leaveGroup);

// Nested members routes
router.use('/:groupId/members', membersRoutes);

export default router;
