import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create or ensure a membership exists for a user in a gallery.
 * Uses an upsert to avoid duplicates.
 *
 * @param galleryId ID of the gallery the user is joining
 * @param userIdToAdd ID of the user to add as a member
 * @returns The resulting Membership record
 */
export async function addMember(galleryId: string, userIdToAdd: string) {
  const membership = await prisma.membership.upsert({
    where: { userId_galleryId: { userId: userIdToAdd, galleryId } },
    update: {},
    create: { userId: userIdToAdd, galleryId },
  });
  return membership;
}

/**
 * Remove a user membership from a gallery.
 *
 * @param galleryId ID of the gallery
 * @param userIdToRemove ID of the user to remove
 * @returns The deleted Membership record
 */
export async function removeMember(galleryId: string, userIdToRemove: string) {
  const membership = await prisma.membership.delete({
    where: { userId_galleryId: { userId: userIdToRemove, galleryId } },
  });
  return membership;
}

/**
 * Fetch all user IDs that are members of the specified gallery.
 *
 * @param galleryId ID of the gallery
 * @returns Array of userId strings
 */
export async function getMemberUserIdsForGallery(galleryId: string) {
  const memberships = await prisma.membership.findMany({
    where: { galleryId },
    select: { userId: true },
  });
  return memberships.map((m) => m.userId);
}


/**
 * Fetch all members for a gallery.
 *
 * @param galleryId ID of the gallery
 * @param status Optional membership status filter
 * @returns Array of Member records
 */
export async function getMembers(
  galleryId: string,
  status?: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED'
) {
  const memberships = await prisma.membership.findMany({
    where: { galleryId, ...(status ? { status } : {}) },
    include: { user: true },
    orderBy: { joinedAt: 'desc' },
  });
  return memberships.map((m) => ({
    user: {
      id: m.user.id,
      name: m.user.name ?? undefined,
      avatarUrl: m.user.avatarUrl ?? undefined,
      handle: (m.user as any).handle,
    },
    membership: {
      id: m.id,
      joinedAt: m.joinedAt.toISOString(),
      status: (m.status as any),
      role: (m.role as any),
    },
  }));
}

/**
 * Get a user's membership for a gallery, if any.
 */
export async function getMembership(userId: string, galleryId: string) {
  return prisma.membership.findUnique({
    where: { userId_galleryId: { userId, galleryId } },
  });
}

/**
 * Check if a user is the owner of the gallery or an accepted admin.
 */
export async function isAdminOrOwner(userId: string, galleryId: string) {
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { ownerId: true },
  });
  if (!gallery) return false;
  if (gallery.ownerId === userId) return true;
  const membership = (await prisma.membership.findUnique({
    where: { userId_galleryId: { userId, galleryId } },
    select: { status: true, role: true } as any,
  })) as any;
  return !!membership && membership.status === 'ACCEPTED' && membership.role === 'ADMIN';
}

/**
 * Create a membership for a user joining a gallery.
 * Status is chosen by the caller (e.g., ACCEPTED or PENDING), role defaults to MEMBER.
 */
export async function joinGallery(
  galleryId: string,
  userId: string,
  status: 'ACCEPTED' | 'PENDING'
) {
  return prisma.membership.upsert({
    where: { userId_galleryId: { userId, galleryId } },
    update: {},
    create: ({ userId, galleryId, status, role: 'MEMBER' } as unknown) as any,
  });
}

/**
 * Accept an invitation for a user.
 */
export async function acceptInvite(galleryId: string, userId: string) {
  const existing = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId, galleryId } },
    select: { status: true } as any,
  });
  const current = existing as any;
  if (!current || current.status !== 'INVITED') return null;
  return prisma.membership.update({
    where: { userId_galleryId: { userId, galleryId } },
    data: ({ status: 'ACCEPTED' } as unknown) as any,
  });
}

/**
 * Leave a gallery (delete membership) for a user.
 */
export async function leaveGallery(galleryId: string, userId: string) {
  try {
    await prisma.membership.delete({ where: { userId_galleryId: { userId, galleryId } } });
    return true;
  } catch {
    // If not found, treat as idempotent success
    return false;
  }
}

/**
 * Invite a user to a gallery (admin only).
 */
export async function inviteMember(galleryId: string, userIdToInvite: string) {
  return prisma.membership.upsert({
    where: { userId_galleryId: { userId: userIdToInvite, galleryId } },
    update: ({ status: 'INVITED', role: 'MEMBER' } as unknown) as any,
    create: ({ userId: userIdToInvite, galleryId, status: 'INVITED', role: 'MEMBER' } as unknown) as any,
  });
}

/**
 * Promote a member to admin (admin only).
 */
export async function promoteMember(galleryId: string, targetUserId: string) {
  return prisma.membership.update({
    where: { userId_galleryId: { userId: targetUserId, galleryId } },
    data: ({ role: 'ADMIN' } as unknown) as any,
  });
}

/**
 * Approve a pending membership (admin only).
 */
export async function approveMember(galleryId: string, targetUserId: string) {
  const existing = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId: targetUserId, galleryId } },
    select: { status: true } as any,
  });
  const current = existing as any;
  if (!current || current.status !== 'PENDING') return null;
  return prisma.membership.update({
    where: { userId_galleryId: { userId: targetUserId, galleryId } },
    data: ({ status: 'ACCEPTED' } as unknown) as any,
  });
}

/**
 * Update the current user's membership preferences for a gallery.
 * Returns null if the membership does not exist.
 */
export async function updateMyMembership(
  galleryId: string,
  userId: string,
  data: { isMuted: boolean }
) {
  const existing = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId, galleryId } },
    select: { id: true },
  });
  if (!existing) return null;
  return prisma.membership.update({
    where: { userId_galleryId: { userId, galleryId } },
    data: ({ isMuted: data.isMuted } as unknown) as any,
  });
}