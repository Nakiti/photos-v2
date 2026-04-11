// src/api/users/users.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as usersService from './user.service.js';
import { addDeviceTokenSchema, updateMyProfileSchema, searchUsersSchema, type AddDeviceTokenDto, type UpdateMyProfileDto, type SearchUsersDto } from './user.validation.js';

/**
 * GET /api/v1/users/me 
 * Handle request for the current user's profile.
 * Assumes `isAuthenticated` has populated `req.user` with `{ id, email }`.
 */
export async function getMyProfile(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await usersService.getUserProfile(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  return res.status(200).json(user);
}

/**
 * PUT /api/v1/users/me
 * Validate and update the current user's profile.
 */
export async function updateMyProfile(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const parsed = updateMyProfileSchema.parse({ body: req.body });
    const data = parsed.body as UpdateMyProfileDto;
    const updateData: Partial<{ name: string; avatarUrl: string }> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    const updated = await usersService.updateUserProfile(userId, updateData);
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.flatten().fieldErrors,
      });
    }
    return res.status(500).json({ message: 'Failed to update profile' });
  }
}

/**
 * POST /api/v1/users/me/devices
 * Register a device token for push notifications using upsert semantics.
 */
export async function addDeviceToken(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const parsed = addDeviceTokenSchema.parse({ body: req.body });
    const { token, platform } = parsed.body as AddDeviceTokenDto;
    const device = await usersService.registerDevice(userId, token, platform);
    return res.status(201).json(device);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.flatten().fieldErrors,
      });
    }
    return res.status(500).json({ message: 'Failed to register device' });
  }
}

/**
 * POST /api/v1/users/me/avatar/presign
 * Generates a presigned URL for an avatar upload.
 */
export const requestAvatarUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const contentType = req.body.contentType
    const fileExtension = req.body.fileExtension
    
    const { presignedUrl, finalUrl } = await usersService.generateAvatarPresignedUrl(userId, contentType, fileExtension);

    res.status(200).json({ presignedUrl, finalUrl });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/search
 * Search for users by name or handle
 * Query params: search, limit, offset
 */
export async function searchUsers(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const parsed = searchUsersSchema.parse({ query: req.query });
    const filters = parsed.query;
    
    // Build filters object conditionally to satisfy exactOptionalPropertyTypes
    const searchFilters: Parameters<typeof usersService.searchUsers>[0] = {
      limit: filters.limit,
      offset: filters.offset,
    };
    
    if (filters.search !== undefined) searchFilters.search = filters.search;

    
    const result = await usersService.searchUsers(searchFilters);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.flatten().fieldErrors,
      });
    }
    return res.status(500).json({ message: 'Failed to search users' });
  }
}


