import { z } from 'zod';

export const getPhotosQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    tagId: z.string().min(1).optional(),
    since: z.string().datetime({ offset: true }).optional(),
  }),
});

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const;

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const presignBodySchema = z.object({
  body: z.object({
    contentType: z.enum(ALLOWED_CONTENT_TYPES, {
      error: 'Content type must be one of: image/jpeg, image/png, image/heic, image/heif, image/webp',
    }),
    // Optional: client reports file size so the server can gate before generating the URL.
    // Not enforced at the S3 level, but prevents obviously oversized requests early.
    fileSize: z
      .number()
      .int()
      .positive()
      .max(MAX_FILE_SIZE_BYTES, 'File size must be under 50 MB')
      .optional(),
    clientId: z.string().max(128).optional(),
  }),
});

export const confirmBodySchema = z.object({
  body: z.object({
    s3Key: z.string().min(1).max(512),
    s3Url: z.string().url().optional(),
    tagIds: z.array(z.string().min(1)).max(20).optional(),
    thumbnailKey: z.string().min(1).max(512),
    thumbnailUrl: z.string().url(),
    clientId: z.string().max(128).optional(),
  }),
});
