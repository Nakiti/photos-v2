import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import {
  getFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  cancelOrRejectRequest,
  removeFriend,
  searchFriends,
} from './friendship.controller.js';

const router = Router();

// Base: /api/v1/friendships

/**
 * @route GET /api/v1/friendships/search
 * @summary Search through the user's accepted friends with optional filters
 * @query search - General search term (searches friend's name, email, handle)
 * @query name - Filter by friend's name (partial match)
 * @query email - Filter by friend's email (partial match)
 * @query handle - Filter by friend's handle (partial match)
 * @query limit - Maximum number of results (default: 20, max: 100)
 * @query offset - Pagination offset (default: 0)
 * @access Private
 */
router.get('/search', isAuthenticated, searchFriends);

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


