import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import {
  getFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  cancelOrRejectRequest,
  removeFriend,
} from './friendship.controller.js';

const router = Router();

// Base: /api/v1/friendships

// GET stays the same: accepted, incoming, outgoing grouped
router.get('/', isAuthenticated, getFriendships);

// Send a friend request
router.post('/requests', isAuthenticated, sendFriendRequest);

// Accept an incoming request from requesterId
router.put('/requests/:requesterId/accept', isAuthenticated, acceptFriendRequest);

// Reject incoming or cancel outgoing request involving otherUserId
router.delete('/requests/:otherUserId', isAuthenticated, cancelOrRejectRequest);

// Remove an accepted friend
router.delete('/friends/:friendUserId', isAuthenticated, removeFriend);

export default router;


