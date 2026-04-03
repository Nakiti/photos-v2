import { Router } from 'express';
import { isAuthenticated } from '../../../middleware/auth.middleware.js';
import { addMember, removeMember, getMembers, promoteMember, getMyMembership, approveMember } from './members.controller.js';

const router = Router({ mergeParams: true });

// POST /api/v1/communities/:groupId/members
router.post('/', isAuthenticated, addMember);

// DELETE /api/v1/communities/:groupId/members/:userId
router.delete('/:userId', isAuthenticated, removeMember);

// GET /api/v1/communities/:groupId/members
router.get('/', isAuthenticated, getMembers);

// PUT /api/v1/communities/:groupId/members/:userId/promote
router.put('/:userId/promote', isAuthenticated, promoteMember);

// PUT /api/v1/communities/:groupId/members/:userId/approve
router.put('/:userId/approve', isAuthenticated, approveMember);

// GET /api/v1/communities/:groupId/members/me
router.get('/me', isAuthenticated, getMyMembership);

export default router;









