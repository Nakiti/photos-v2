import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@prisma/client', () => {
  const instance = {
    photo: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    gallery: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
    },
    photoTag: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    photoLike: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    device: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
  // Make $transaction call the callback with the mock instance as tx
  instance.$transaction.mockImplementation((fn: any) => fn(instance));
  return { PrismaClient: vi.fn(() => instance) };
});

vi.mock('../../libs/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    setex: vi.fn(),
    eval: vi.fn(),
    pipeline: vi.fn(() => ({
      setex: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    })),
  },
}));

vi.mock('../../libs/socket.manager.js', () => ({
  broadcastNewPhoto: vi.fn(),
  broadcastPhotoDeleted: vi.fn(),
  broadcastPhotoUpdated: vi.fn(),
}));

vi.mock('../../libs/queue.js', () => ({
  photoQueue: { add: vi.fn() },
}));

vi.mock('../../libs/rateLimiter.js', () => ({
  checkAndRecordUpload: vi.fn(),
}));

vi.mock('../api/notifications/notifications.service.js', () => ({
  smartThrottleNewPhoto: vi.fn().mockResolvedValue(undefined),
  createNotificationRecord: vi.fn().mockResolvedValue(undefined),
  sendPushNotifications: vi.fn().mockResolvedValue([]),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: vi.fn().mockResolvedValue({}) })),
  PutObjectCommand: vi.fn(),
  DeleteObjectsCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://presigned.s3.amazonaws.com/test?sig=abc'),
}));

import { PrismaClient } from '@prisma/client';
import { redis } from '../../libs/redis.js';
import { checkAndRecordUpload } from '../../libs/rateLimiter.js';
import { broadcastNewPhoto } from '../../libs/socket.manager.js';
import { confirmUploadedPhoto, RateLimitError } from '../api/galleries/photos/photos.service.js';

const mockDb = new PrismaClient() as any;
const mockRedis = redis as any;
const mockCheckAndRecord = vi.mocked(checkAndRecordUpload);
const mockBroadcastNewPhoto = vi.mocked(broadcastNewPhoto);

const photoSelect = {
  id: 'photo-1',
  galleryId: 'gallery-1',
  uploaderId: 'user-1',
  s3Key: 'photos/gallery-1/abc.jpg',
  s3Url: 'https://cdn.test.com/photos/gallery-1/abc.jpg',
  thumbnailUrl: null,
  thumbnailKey: null,
  visible: 'VISIBLE',
  createdAt: new Date('2024-01-01'),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.$transaction.mockImplementation((fn: any) => fn(mockDb));
  mockRedis.pipeline.mockReturnValue({
    setex: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  });
});

describe('confirmUploadedPhoto', () => {
  it('returns existing record without hitting rate limit (idempotency)', async () => {
    mockDb.photo.findUnique.mockResolvedValue(photoSelect);

    const result = await confirmUploadedPhoto(
      'user-1', 'gallery-1', 'photos/gallery-1/abc.jpg',
      '', '', undefined, [], undefined,
    );

    expect(result.id).toBe('photo-1');
    expect(mockCheckAndRecord).not.toHaveBeenCalled(); // idempotency path exits early
    expect(mockDb.photo.create).not.toHaveBeenCalled();
  });

  it('throws RateLimitError when rate limit is exceeded', async () => {
    mockDb.photo.findUnique.mockResolvedValue(null); // not a duplicate
    mockCheckAndRecord.mockResolvedValue({ allowed: false, currentCount: 200, limit: 200 });

    await expect(
      confirmUploadedPhoto(
        'user-1', 'gallery-1', 'photos/gallery-1/new.jpg',
        '', '', undefined, [], undefined,
      )
    ).rejects.toThrow(RateLimitError);

    await expect(
      confirmUploadedPhoto(
        'user-1', 'gallery-1', 'photos/gallery-1/new.jpg',
        '', '', undefined, [], undefined,
      )
    ).rejects.toThrow('Upload rate limit exceeded');
  });

  it('RateLimitError carries limit and currentCount fields', async () => {
    mockDb.photo.findUnique.mockResolvedValue(null);
    mockCheckAndRecord.mockResolvedValue({ allowed: false, currentCount: 50, limit: 50 });

    let caughtError: RateLimitError | undefined;
    try {
      await confirmUploadedPhoto('user-1', 'gallery-1', 'photos/new.jpg', '', '', undefined, []);
    } catch (e) {
      caughtError = e as RateLimitError;
    }

    expect(caughtError).toBeInstanceOf(RateLimitError);
    expect(caughtError!.limit).toBe(50);
    expect(caughtError!.currentCount).toBe(50);
  });

  it('creates photo record and broadcasts on success', async () => {
    mockDb.photo.findUnique.mockResolvedValue(null);
    mockCheckAndRecord.mockResolvedValue({ allowed: true, currentCount: 1, limit: 200 });
    mockDb.photo.create.mockResolvedValue(photoSelect);
    mockDb.gallery.update.mockResolvedValue({});
    mockDb.tag.findMany.mockResolvedValue([]);
    mockDb.user.findUnique.mockResolvedValue({ name: 'Alice', handle: 'alice' });
    mockDb.gallery.findUnique.mockResolvedValue({ name: 'My Gallery' });

    const result = await confirmUploadedPhoto(
      'user-1', 'gallery-1', 'photos/gallery-1/abc.jpg',
      '', '', undefined, [], undefined,
    );

    expect(result.id).toBe('photo-1');
    expect(mockBroadcastNewPhoto).toHaveBeenCalledWith('gallery-1', expect.objectContaining({
      id: 'photo-1',
      galleryId: 'gallery-1',
      uploaderId: 'user-1',
    }));
  });

  it('handles P2002 race condition by returning the winner record', async () => {
    mockDb.photo.findUnique
      .mockResolvedValueOnce(null)   // First check: no duplicate
      .mockResolvedValueOnce(photoSelect); // Second check: race winner found

    mockCheckAndRecord.mockResolvedValue({ allowed: true, currentCount: 1, limit: 200 });

    const p2002Error = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    mockDb.$transaction.mockRejectedValueOnce(p2002Error);

    const result = await confirmUploadedPhoto(
      'user-1', 'gallery-1', 'photos/gallery-1/abc.jpg',
      '', '', undefined, [], undefined,
    );

    expect(result.id).toBe('photo-1');
    expect(mockBroadcastNewPhoto).not.toHaveBeenCalled(); // race loser does not broadcast
  });

  it('applies tags by fetching only valid tags in the gallery', async () => {
    mockDb.photo.findUnique.mockResolvedValue(null);
    mockCheckAndRecord.mockResolvedValue({ allowed: true, currentCount: 1, limit: 200 });
    mockDb.photo.create.mockResolvedValue(photoSelect);
    mockDb.gallery.update.mockResolvedValue({});
    mockDb.tag.findMany.mockResolvedValue([{ id: 'tag-1' }, { id: 'tag-2' }]);
    mockDb.photoTag.createMany.mockResolvedValue({ count: 2 });
    mockDb.user.findUnique.mockResolvedValue({ name: 'Alice', handle: 'alice' });
    mockDb.gallery.findUnique.mockResolvedValue({ name: 'Gallery' });

    await confirmUploadedPhoto(
      'user-1', 'gallery-1', 'photos/gallery-1/abc.jpg',
      '', '', undefined, ['tag-1', 'tag-2', 'nonexistent-tag'],
    );

    // Should only create tags for the 2 valid tags returned by the DB query
    expect(mockDb.photoTag.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          { photoId: 'photo-1', tagId: 'tag-1' },
          { photoId: 'photo-1', tagId: 'tag-2' },
        ],
      })
    );
  });
});
