import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@prisma/client', () => {
  const instance = {
    gallery: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      createMany: vi.fn(),
    },
    communityMembership: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
  instance.$transaction.mockImplementation((fn: any) => fn(instance));
  return { PrismaClient: vi.fn(() => instance) };
});

import { PrismaClient } from '@prisma/client';
import {
  addMember,
  leaveGallery,
  removeMember,
  joinGallery,
  isAdminOrOwner,
} from '../api/galleries/members/members.service.js';

const mockDb = new PrismaClient() as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.$transaction.mockImplementation((fn: any) => fn(mockDb));
});

const fakeMembership = {
  id: 'membership-1',
  userId: 'user-1',
  galleryId: 'gallery-1',
  role: 'MEMBER',
  joinedAt: new Date(),
  isMuted: false,
};

describe('addMember', () => {
  it('creates membership and increments memberCount when user is new', async () => {
    mockDb.membership.findUnique.mockResolvedValue(null); // not existing
    mockDb.membership.upsert.mockResolvedValue(fakeMembership);
    mockDb.gallery.update.mockResolvedValue({});

    await addMember('gallery-1', 'user-1');

    expect(mockDb.membership.upsert).toHaveBeenCalled();
    expect(mockDb.gallery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'gallery-1' },
        data: { memberCount: { increment: 1 } },
      })
    );
  });

  it('does NOT increment memberCount when user already exists (idempotent)', async () => {
    mockDb.membership.findUnique.mockResolvedValue(fakeMembership); // already a member
    mockDb.membership.upsert.mockResolvedValue(fakeMembership);

    await addMember('gallery-1', 'user-1');

    expect(mockDb.membership.upsert).toHaveBeenCalled();
    expect(mockDb.gallery.update).not.toHaveBeenCalled();
  });
});

describe('leaveGallery', () => {
  it('returns true and decrements memberCount on successful leave', async () => {
    mockDb.membership.findUnique.mockResolvedValue(fakeMembership);
    mockDb.membership.delete.mockResolvedValue(fakeMembership);
    mockDb.gallery.update.mockResolvedValue({});

    const result = await leaveGallery('gallery-1', 'user-1');

    expect(result).toBe(true);
    expect(mockDb.gallery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { memberCount: { decrement: 1 } },
      })
    );
  });

  it('returns false gracefully when membership does not exist', async () => {
    const notFoundError = Object.assign(new Error('Record not found'), { code: 'P2025' });
    mockDb.membership.findUnique.mockResolvedValue(null);
    mockDb.membership.delete.mockRejectedValue(notFoundError);

    const result = await leaveGallery('gallery-1', 'nonmember-user');

    expect(result).toBe(false);
    expect(mockDb.gallery.update).not.toHaveBeenCalled();
  });
});

describe('removeMember', () => {
  it('removes membership and decrements memberCount', async () => {
    mockDb.membership.findUnique.mockResolvedValue(fakeMembership);
    mockDb.membership.delete.mockResolvedValue(fakeMembership);
    mockDb.gallery.update.mockResolvedValue({});

    await removeMember('gallery-1', 'user-1');

    expect(mockDb.membership.delete).toHaveBeenCalled();
    expect(mockDb.gallery.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { memberCount: { decrement: 1 } } })
    );
  });
});

describe('joinGallery', () => {
  it('creates membership and increments count for new member', async () => {
    mockDb.membership.findUnique.mockResolvedValue(null);
    mockDb.membership.upsert.mockResolvedValue(fakeMembership);
    mockDb.gallery.update.mockResolvedValue({});

    await joinGallery('gallery-1', 'user-new');

    expect(mockDb.gallery.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { memberCount: { increment: 1 } } })
    );
  });

  it('does not increment count when already a member (idempotent)', async () => {
    mockDb.membership.findUnique.mockResolvedValue(fakeMembership);
    mockDb.membership.upsert.mockResolvedValue(fakeMembership);

    await joinGallery('gallery-1', 'user-1');

    expect(mockDb.gallery.update).not.toHaveBeenCalled();
  });
});

describe('isAdminOrOwner', () => {
  it('returns false when gallery does not exist', async () => {
    mockDb.gallery.findUnique.mockResolvedValue(null);

    const result = await isAdminOrOwner('user-1', 'nonexistent-gallery');
    expect(result).toBe(false);
  });

  it('returns true for the gallery owner without checking membership', async () => {
    mockDb.gallery.findUnique.mockResolvedValue({ ownerId: 'owner-user' });

    const result = await isAdminOrOwner('owner-user', 'gallery-1');
    expect(result).toBe(true);
    expect(mockDb.membership.findUnique).not.toHaveBeenCalled();
  });

  it('returns true when user is an ADMIN member', async () => {
    mockDb.gallery.findUnique.mockResolvedValue({ ownerId: 'owner-user' });
    mockDb.membership.findUnique.mockResolvedValue({ role: 'ADMIN' });

    const result = await isAdminOrOwner('admin-user', 'gallery-1');
    expect(result).toBe(true);
  });

  it('returns false when user is a regular MEMBER', async () => {
    mockDb.gallery.findUnique.mockResolvedValue({ ownerId: 'owner-user' });
    mockDb.membership.findUnique.mockResolvedValue({ role: 'MEMBER' });

    const result = await isAdminOrOwner('member-user', 'gallery-1');
    expect(result).toBe(false);
  });
});
