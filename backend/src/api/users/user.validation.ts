// src/api/users/user.validation.ts
import { z } from 'zod';

// Schema for updating the current user's profile
export const updateMyProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    avatarUrl: z.string().url().optional(),
  }),
});

export type UpdateMyProfileDto = z.infer<typeof updateMyProfileSchema>['body'];

// Schema for adding/registering a device token for push notifications
export const addDeviceTokenSchema = z.object({
  body: z.object({
    token: z.string({ message: 'Device token is required' }),
    platform: z.enum(['ios', 'android'], { message: 'Platform is required' }),
  }),
});

export type AddDeviceTokenDto = z.infer<typeof addDeviceTokenSchema>['body'];

// Schema for searching users (searches name and handle)
export const searchUsersSchema = z.object({
  query: z.object({
    search: z.string().optional(), // Search term (matches name or handle)
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
  }),
});

export type SearchUsersDto = z.infer<typeof searchUsersSchema>['query'];


