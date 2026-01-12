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
  // Check if membership already exists
  const existing = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId: userIdToAdd, galleryId } },
  });
  
  const membership = await prisma.membership.upsert({
    where: { userId_galleryId: { userId: userIdToAdd, galleryId } },
    update: {},
    create: { userId: userIdToAdd, galleryId, status: 'ACCEPTED' as any },
  });
  
  // Increment memberCount if this is a new membership
  if (!existing) {
    await prisma.gallery.update({
      where: { id: galleryId },
      data: {
        memberCount: {
          increment: 1,
        },
      },
    });
  }
  
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
  // Check if membership exists and its status before deleting
  const existing = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId: userIdToRemove, galleryId } },
    select: { status: true } as any,
  });
  
  const membership = await prisma.membership.delete({
    where: { userId_galleryId: { userId: userIdToRemove, galleryId } },
  });
  
  // Decrement memberCount if membership was ACCEPTED
  if (existing && (existing as any).status === 'ACCEPTED') {
    await prisma.gallery.update({
      where: { id: galleryId },
      data: {
        memberCount: {
          decrement: 1,
        },
      },
    });
  }
  
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
  // Check if membership already exists
  const existing = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId, galleryId } },
  });
  
  const membership = await prisma.membership.upsert({
    where: { userId_galleryId: { userId, galleryId } },
    update: {},
    create: ({ userId, galleryId, status, role: 'MEMBER' } as unknown) as any,
  });
  
  // Increment memberCount if this is a new membership with ACCEPTED status
  if (!existing && status === 'ACCEPTED') {
    await prisma.gallery.update({
      where: { id: galleryId },
      data: {
        memberCount: {
          increment: 1,
        },
      },
    });
  }
  
  return membership;
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
  
  const membership = await prisma.membership.update({
    where: { userId_galleryId: { userId, galleryId } },
    data: ({ status: 'ACCEPTED' } as unknown) as any,
  });
  
  // Increment memberCount when status changes from INVITED to ACCEPTED
  await prisma.gallery.update({
    where: { id: galleryId },
    data: {
      memberCount: {
        increment: 1,
      },
    },
  });
  
  return membership;
}

/**
 * Leave a gallery (delete membership) for a user.
 */
export async function leaveGallery(galleryId: string, userId: string) {
  try {
    // Check if membership exists and its status before deleting
    const existing = await prisma.membership.findUnique({
      where: { userId_galleryId: { userId, galleryId } },
      select: { status: true } as any,
    });
    
    await prisma.membership.delete({ where: { userId_galleryId: { userId, galleryId } } });
    
    // Decrement memberCount if membership was ACCEPTED
    if (existing && (existing as any).status === 'ACCEPTED') {
      await prisma.gallery.update({
        where: { id: galleryId },
        data: {
          memberCount: {
            decrement: 1,
          },
        },
      });
    }
    
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
  // Check if membership already exists
  const existing = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId: userIdToInvite, galleryId } },
    select: { status: true } as any,
  });
  
  const membership = await prisma.membership.upsert({
    where: { userId_galleryId: { userId: userIdToInvite, galleryId } },
    update: ({ status: 'INVITED', role: 'MEMBER' } as unknown) as any,
    create: ({ userId: userIdToInvite, galleryId, status: 'INVITED', role: 'MEMBER' } as unknown) as any,
  });
  
  // Note: INVITED status doesn't count toward memberCount until accepted
  // No count change needed here
  
  return membership;
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
  
  const membership = await prisma.membership.update({
    where: { userId_galleryId: { userId: targetUserId, galleryId } },
    data: ({ status: 'ACCEPTED' } as unknown) as any,
  });
  
  // Increment memberCount when status changes from PENDING to ACCEPTED
  await prisma.gallery.update({
    where: { id: galleryId },
    data: {
      memberCount: {
        increment: 1,
      },
    },
  });
  
  return membership;
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
 * This is a bulk operation that efficiently adds multiple members at once.
 *
 * @param galleryId ID of the gallery
 * @param communityId ID of the community to add members from
 * @returns Object with count of added members and any errors
 */
export async function addCommunityMembersToGallery(
  galleryId: string,
  communityId: string
) {
  // 1. Fetch all community members
  const communityMemberships = await prisma.communityMembership.findMany({
    where: { communityId },
    select: { userId: true },
  });

  if (communityMemberships.length === 0) {
    return { addedCount: 0, errors: [] };
  }

  const userIds = communityMemberships.map((m) => m.userId);

  // 2. Check which members already exist in the gallery
  const existingMemberships = await prisma.membership.findMany({
    where: {
      galleryId,
      userId: { in: userIds },
    },
    select: { userId: true },
  });

  const existingUserIds = new Set(existingMemberships.map((m) => m.userId));
  const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

  if (newUserIds.length === 0) {
    return { addedCount: 0, errors: [] };
  }

  // 3. Use createMany for efficient batch insert
  // Note: If your Prisma version doesn't support skipDuplicates, we can use a transaction instead
  try {
    await prisma.membership.createMany({
      data: newUserIds.map((userId) => ({
        userId,
        galleryId,
        status: 'ACCEPTED',
        role: 'MEMBER',
      }) as any),
      skipDuplicates: true,
    });

    // Increment memberCount by the number of new members added
    if (newUserIds.length > 0) {
      await prisma.gallery.update({
        where: { id: galleryId },
        data: {
          memberCount: {
            increment: newUserIds.length,
          },
        },
      });
    }

    return { addedCount: newUserIds.length, errors: [] };
  } catch (error: any) {
    // Fallback to individual upserts if createMany fails
    const results = await Promise.allSettled(
      newUserIds.map((userId) =>
        prisma.membership.upsert({
          where: { userId_galleryId: { userId, galleryId } },
          update: {},
          create: { userId, galleryId, status: 'ACCEPTED' as any } as any,
        })
      )
    );

    const addedCount = results.filter((r) => r.status === 'fulfilled').length;
    const errors = results
      .filter((r) => r.status === 'rejected')
      .map((r) => (r as PromiseRejectedResult).reason);

    // Increment memberCount by the number of successfully added members
    if (addedCount > 0) {
      await prisma.gallery.update({
        where: { id: galleryId },
        data: {
          memberCount: {
            increment: addedCount,
          },
        },
      });
    }

    return { addedCount, errors };
  }
}