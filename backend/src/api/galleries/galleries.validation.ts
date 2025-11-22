// src/api/galleries/galleries.validation.ts
import { z } from 'zod';

export const createGallerySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    type: z.enum(['GROUP', 'EVENT']),
    iconUrl: z.string().url().optional(),
    wantsIconUpload: z.boolean().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    location: z.string().optional(),
  }),
});

export type CreateGalleryDto = z.infer<typeof createGallerySchema>['body'];

export const updateGallerySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    iconUrl: z.string().url().optional(),
    startDate: z.string().datetime().nullable().optional(),
    endDate: z.string().datetime().nullable().optional(),
    location: z.string().nullable().optional(),
    addPermission: z.string().optional(),
    joinRequiresApproval: z.boolean().optional(),
    deletePermission: z.string().optional(),
    defaultTagId: z.string().optional()
  }),
});

export type UpdateGalleryDto = z.infer<typeof updateGallerySchema>['body'];

export const joinByLinkSchema = z.object({
  params: z.object({
    shareableLink: z.string().min(1, 'shareableLink is required'),
  }),
});

// Schema for searching galleries
export const searchGalleriesSchema = z.object({
  query: z.object({
    search: z.string().optional(), // General search term (searches name, location)
    name: z.string().optional(),
    type: z.enum(['GROUP', 'EVENT']).optional(),
    location: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
  }),
});

export type SearchGalleriesDto = z.infer<typeof searchGalleriesSchema>['query'];


