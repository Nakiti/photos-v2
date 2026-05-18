import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@prisma/client', () => {
  const instance = {
    gallery: {
      findUnique: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
  return { PrismaClient: vi.fn(() => instance) };
});

import { PrismaClient } from '@prisma/client';
import { checkGalleryPermission } from '../api/galleries/permission.service.js';

const mockDb = new PrismaClient() as any;

beforeEach(() => {
  vi.clearAllMocks();
});

const galleryBase = {
  ownerId: 'owner-user',
  addPermission: 'ADMIN',
  editPermission: 'ANYONE',
  deletePermission: 'ADMIN',
};

describe('checkGalleryPermission', () => {
  it('returns true immediately for the gallery owner (skips membership lookup)', async () => {
    mockDb.gallery.findUnique.mockResolvedValue({ ownerId: 'owner-user', addPermission: 'ADMIN' });

    const result = await checkGalleryPermission('owner-user', 'gallery-1', 'addPermission');

    expect(result).toBe(true);
    expect(mockDb.membership.findFirst).not.toHaveBeenCalled();
  });

  it('throws when gallery does not exist', async () => {
    mockDb.gallery.findUnique.mockResolvedValue(null);

    await expect(
      checkGalleryPermission('user-1', 'nonexistent', 'editPermission')
    ).rejects.toThrow('Gallery not found');
  });

  it('throws when user is not a member', async () => {
    mockDb.gallery.findUnique.mockResolvedValue({ ownerId: 'owner-user', addPermission: 'ADMIN' });
    mockDb.membership.findFirst.mockResolvedValue(null);

    await expect(
      checkGalleryPermission('stranger', 'gallery-1', 'addPermission')
    ).rejects.toThrow('Not a member');
  });

  it('throws when MEMBER role does not meet ADMIN-required permission', async () => {
    mockDb.gallery.findUnique.mockResolvedValue({ ownerId: 'owner-user', addPermission: 'ADMIN' });
    mockDb.membership.findFirst.mockResolvedValue({
      role: 'MEMBER',
      gallery: { ...galleryBase },
    });

    await expect(
      checkGalleryPermission('member-user', 'gallery-1', 'addPermission')
    ).rejects.toThrow('You do not have permission');
  });

  it('returns true when ADMIN role meets ADMIN-required permission', async () => {
    mockDb.gallery.findUnique.mockResolvedValue({ ownerId: 'owner-user', addPermission: 'ADMIN' });
    mockDb.membership.findFirst.mockResolvedValue({
      role: 'ADMIN',
      gallery: { ...galleryBase },
    });

    const result = await checkGalleryPermission('admin-user', 'gallery-1', 'addPermission');
    expect(result).toBe(true);
  });

  it('returns true when MEMBER role meets MEMBER-required permission', async () => {
    mockDb.gallery.findUnique.mockResolvedValue({ ownerId: 'owner-user', addPermission: 'MEMBER' });
    mockDb.membership.findFirst.mockResolvedValue({
      role: 'MEMBER',
      gallery: { ...galleryBase, addPermission: 'MEMBER' },
    });

    const result = await checkGalleryPermission('member-user', 'gallery-1', 'addPermission');
    expect(result).toBe(true);
  });

  it('returns true for the owner even when their membership records says MEMBER role', async () => {
    // Owner check happens before the membership role check
    mockDb.gallery.findUnique.mockResolvedValue({ ownerId: 'owner-user', addPermission: 'ADMIN' });
    mockDb.membership.findFirst.mockResolvedValue({
      role: 'MEMBER',
      gallery: { ...galleryBase, ownerId: 'owner-user' },
    });

    const result = await checkGalleryPermission('owner-user', 'gallery-1', 'addPermission');
    expect(result).toBe(true);
    // Should have short-circuited before even checking membership
    expect(mockDb.membership.findFirst).not.toHaveBeenCalled();
  });
});
