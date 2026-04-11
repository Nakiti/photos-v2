import { Router } from 'express';
import { isAuthenticated } from '../../../middleware/auth.middleware.js';
import { addMember, removeMember, reconcileGalleryMembers, getMembers, promoteMember, updateMyMembership, getMyMembership, addCommunityMembersToGallery } from './members.controller.js';

const router = Router({ mergeParams: true });

router.post('/', isAuthenticated, addMember);
router.post('/bulk', isAuthenticated, addCommunityMembersToGallery);
router.delete('/:userId', isAuthenticated, removeMember);
router.put('/:userId/promote', isAuthenticated, promoteMember);
router.get('/sync', isAuthenticated, reconcileGalleryMembers);
router.get('/', isAuthenticated, getMembers);
router.put('/me', isAuthenticated, updateMyMembership);
router.get('/me', isAuthenticated, getMyMembership);

export default router;
