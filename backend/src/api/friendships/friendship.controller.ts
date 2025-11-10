import type { Request, Response } from 'express';
import { z } from 'zod';
import * as friendshipService from './friendship.service.js';
import { sendRequestSchema, acceptRequestSchema, cancelOrRejectSchema, removeFriendSchema, searchFriendsSchema } from './friendships.validation.js';

/**
 * GET /api/v1/friendships
 * Return accepted friendships and pending grouped as requested
 */
export async function getFriendships(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const result = await friendshipService.getAllForUser(userId);
  // Map to include otherUser for convenience on client
  const mapWithOther = (items: any[]) => items.map((f) => ({
    id: f.id,
    requesterId: f.requesterId,
    receiverId: f.receiverId,
    status: f.status,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    otherUser: f.requesterId === userId ? f.receiver : f.requester,
  }));
  return res.status(200).json({
    friendships: mapWithOther(result.friendships),
    pendingIncoming: mapWithOther(result.pendingIncoming),
    pendingOutgoing: mapWithOther(result.pendingOutgoing),
  });
}

/**
 * POST /api/v1/friendships/requests
 * Body: { receiverId }
 */
export async function sendFriendRequest(req: Request, res: Response) {
  const requesterId = (req as any).user?.id as string | undefined;
  if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const parsed = sendRequestSchema.parse({ body: req.body });
    const { receiverId } = parsed.body;
    const created = await friendshipService.sendRequest(requesterId, receiverId);
    return res.status(201).json(created);
  } catch (error) {
    console.log(error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    return res.status(400).json({ message: (error as Error).message || 'Failed to send request' });
  }
}

/**
 * PUT /api/v1/friendships/requests/:requesterId/accept
 */
export async function acceptFriendRequest(req: Request, res: Response) {
  const receiverId = (req as any).user?.id as string | undefined;
  if (!receiverId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const parsed = acceptRequestSchema.parse({ params: req.params });
    const { requesterId } = parsed.params as { requesterId: string };
    const updated = await friendshipService.acceptRequest(receiverId, requesterId);
    if (!updated) return res.status(404).json({ message: 'Request not found' });
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    return res.status(500).json({ message: 'Failed to accept request' });
  }
}

/**
 * DELETE /api/v1/friendships/requests/:otherUserId
 * Reject incoming or cancel outgoing pending request
 */
export async function cancelOrRejectRequest(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const parsed = cancelOrRejectSchema.parse({ params: req.params });
    const { otherUserId } = parsed.params as { otherUserId: string };
    const result = await friendshipService.cancelOrReject(userId, otherUserId);
    if (!result) return res.status(404).json({ message: 'No pending request found' });
    return res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    return res.status(500).json({ message: 'Failed to modify request' });
  }
}

/**
 * DELETE /api/v1/friendships/friends/:friendUserId
 */
export async function removeFriend(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const parsed = removeFriendSchema.parse({ params: req.params });
    const { friendUserId } = parsed.params as { friendUserId: string };
    const result = await friendshipService.removeFriend(userId, friendUserId);
    if (!result) return res.status(404).json({ message: 'Friendship not found' });
    return res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    return res.status(500).json({ message: 'Failed to remove friend' });
  }
}

/**
 * GET /api/v1/friendships/search
 * Search through the user's accepted friends with optional filters
 * Query params: search, name, email, handle, limit, offset
 */
export async function searchFriends(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const parsed = searchFriendsSchema.parse({ query: req.query });
    const filters = parsed.query;

    // Build filters object conditionally to satisfy exactOptionalPropertyTypes
    const searchFilters: Parameters<typeof friendshipService.searchFriends>[1] = {
      limit: filters.limit,
      offset: filters.offset,
    };

    if (filters.search !== undefined) searchFilters.search = filters.search;
    if (filters.name !== undefined) searchFilters.name = filters.name;
    if (filters.email !== undefined) searchFilters.email = filters.email;
    if (filters.handle !== undefined) searchFilters.handle = filters.handle;

    const result = await friendshipService.searchFriends(userId, searchFilters);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.flatten().fieldErrors,
      });
    }
    return res.status(500).json({ message: 'Failed to search friends' });
  }
}


