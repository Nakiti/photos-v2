import { z } from 'zod';

export const getPhotosQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    tagId: z.string().min(1).optional(),
  }),
});

export const presignBodySchema = z.object({
  body: z.object({
    contentType: z.string().min(3),
  }),
});

export const confirmBodySchema = z.object({
  body: z.object({
    s3Key: z.string().min(1),
    s3Url: z.string().url().optional(),
    tagIds: z.array(z.string().min(1)).optional(),
  }),
});



