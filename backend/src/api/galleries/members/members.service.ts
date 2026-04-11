import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create or ensure a membership exists for a user in a gallery.
 * Uses an upsert to avoid duplicates.
 */
export async function addMember(galleryId: string, userIdToAdd: string) {
  const existing = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId: userIdToAdd, galleryId } },
  });

  const membership = await prisma.membership.upsert({
    where: { userId_galleryId: { userId: userIdToAdd, galleryId } },
    update: {},
    create: ({ userId: userIdToAdd, galleryId, role: 'MEMBER' } as unknown) as any,
  });

  if (!existing) {
    await prisma.gallery.update({
      where: { id: galleryId },
      data: { memberCount: { increment: 1 } },
    });
  }

  return membership;
}

/**
 * Remove a user membership from a gallery.
 */
export async function removeMember(galleryId: string, userIdToRemove: string) {
  const existing = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId: userIdToRemove, galleryId } },
  });

  const membership = await prisma.membership.delete({
    where: { userId_galleryId: { userId: userIdToRemove, galleryId } },
  });

  if (existing) {
    await prisma.gallery.update({
      where: { id: galleryId },
      data: { memberCount: { decrement: 1 } },
    });
  }

  return membership;
}

/**
 * Fetch all user IDs that are members of the specified gallery.
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
 */
export async function getMembers(galleryId: string) {
  const memberships = await prisma.membership.findMany({
    where: { galleryId },
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
      role: (m.role as any),
      isMuted: m.isMuted,
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
    select: { role: true } as any,
  })) as any;
  return !!membership && membership.role === 'ADMIN';
}

/**
 * Create a membership for a user joining a gallery.
 */
export async function joinGallery(galleryId: string, userId: string) {
  const existing = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId, galleryId } },
  });

  const membership = await prisma.membership.upsert({
    where: { userId_galleryId: { userId, galleryId } },
    update: {},
    create: ({ userId, galleryId, role: 'MEMBER' } as unknown) as any,
  });

  if (!existing) {
    await prisma.gallery.update({
      where: { id: galleryId },
      data: { memberCount: { increment: 1 } },
    });
  }

  return membership;
}

/**
 * Leave a gallery (delete membership) for a user.
 */
export async function leaveGallery(galleryId: string, userId: string) {
  try {
    const existing = await prisma.membership.findUnique({
      where: { userId_galleryId: { userId, galleryId } },
    });

    await prisma.membership.delete({ where: { userId_galleryId: { userId, galleryId } } });

    if (existing) {
      await prisma.gallery.update({
        where: { id: galleryId },
        data: { memberCount: { decrement: 1 } },
      });
    }

    return true;
  } catch {
    return false;
  }
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

/**
 * Add all members from a community to a gallery.
 */
export async function addCommunityMembersToGallery(
  galleryId: string,
  communityId: string
) {
  const communityMemberships = await prisma.communityMembership.findMany({
    where: { communityId },
    select: { userId: true },
  });

  if (communityMemberships.length === 0) {
    return { addedCount: 0, errors: [] };
  }

  const userIds = communityMemberships.map((m) => m.userId);

  const existingMemberships = await prisma.membership.findMany({
    where: { galleryId, userId: { in: userIds } },
    select: { userId: true },
  });

  const existingUserIds = new Set(existingMemberships.map((m) => m.userId));
  const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

  if (newUserIds.length === 0) {
    return { addedCount: 0, errors: [] };
  }

  try {
    await prisma.membership.createMany({
      data: newUserIds.map((userId) => ({
        userId,
        galleryId,
        role: 'MEMBER',
      }) as any),
      skipDuplicates: true,
    });

    if (newUserIds.length > 0) {
      await prisma.gallery.update({
        where: { id: galleryId },
        data: { memberCount: { increment: newUserIds.length } },
      });
    }

    return { addedCount: newUserIds.length, errors: [] };
  } catch (error: any) {
    const results = await Promise.allSettled(
      newUserIds.map((userId) =>
        prisma.membership.upsert({
          where: { userId_galleryId: { userId, galleryId } },
          update: {},
          create: ({ userId, galleryId, role: 'MEMBER' } as unknown) as any,
        })
      )
    );

    const addedCount = results.filter((r) => r.status === 'fulfilled').length;
    const errors = results
      .filter((r) => r.status === 'rejected')
      .map((r) => (r as PromiseRejectedResult).reason);

    if (addedCount > 0) {
      await prisma.gallery.update({
        where: { id: galleryId },
        data: { memberCount: { increment: addedCount } },
      });
    }

    return { addedCount, errors };
  }
}
