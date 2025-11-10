import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const db = prisma as any; // Cast to allow access to Friendship model if generated types lag

export async function getAllForUser(userId: string) {
  const baseSelect = {
    id: true,
    requesterId: true,
    receiverId: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    requester: { select: { id: true, name: true, handle: true, avatarUrl: true } },
    receiver: { select: { id: true, name: true, handle: true, avatarUrl: true } },
  } as const;

  const [acceptedAsRequester, acceptedAsReceiver, pendingIncoming, pendingOutgoing] = await Promise.all([
    db.friendship.findMany({
      where: { requesterId: userId, status: 'ACCEPTED' },
      select: baseSelect,
    }),
    db.friendship.findMany({
      where: { receiverId: userId, status: 'ACCEPTED' },
      select: baseSelect,
    }),
    db.friendship.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      select: baseSelect,
    }),
    db.friendship.findMany({
      where: { requesterId: userId, status: 'PENDING' },
      select: baseSelect,
    }),
  ]);

  const friendships = [...acceptedAsRequester, ...acceptedAsReceiver];
  return { friendships, pendingIncoming, pendingOutgoing };
}

export async function sendRequest(requesterId: string, receiverId: string) {
  if (requesterId === receiverId) {
    throw new Error('Cannot friend yourself');
  }

  // Check both directions to avoid duplicates and handle re-sends
  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId },
      ],
    },
  });

  if (existing) {
    // If an incoming pending exists, auto-accept instead of creating another
    if (existing.status === 'PENDING' && existing.requesterId === receiverId && existing.receiverId === requesterId) {
      return db.friendship.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED' },
        select: { id: true, requesterId: true, receiverId: true, status: true, createdAt: true, updatedAt: true },
      });
    }
    // If it's already accepted or same direction pending, just return existing
    return existing;
  }

  return db.friendship.create({
    data: { requesterId, receiverId, status: 'PENDING' },
    select: { id: true, requesterId: true, receiverId: true, status: true, createdAt: true, updatedAt: true },
  });
}

export async function acceptRequest(receiverId: string, requesterId: string) {
  const request = await db.friendship.findUnique({
    where: { requesterId_receiverId: { requesterId, receiverId } },
  });
  if (!request || request.status !== 'PENDING') return null;
  return db.friendship.update({
    where: { requesterId_receiverId: { requesterId, receiverId } },
    data: { status: 'ACCEPTED' },
    select: { id: true, requesterId: true, receiverId: true, status: true, createdAt: true, updatedAt: true },
  });
}

export async function cancelOrReject(userId: string, otherUserId: string) {
  // Determine relationship direction
  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, receiverId: otherUserId },
        { requesterId: otherUserId, receiverId: userId },
      ],
    },
  });
  if (!existing) return null;

  // If pending: if user is receiver -> reject (delete), if requester -> cancel (delete)
  if (existing.status === 'PENDING') {
    await db.friendship.delete({ where: { id: existing.id } });
    return { success: true } as const;
  }

  // If accepted, this endpoint should not remove a friend; that's a different endpoint
  return null;
}

export async function removeFriend(userId: string, friendUserId: string) {
  const existing = await db.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId, receiverId: friendUserId },
        { requesterId: friendUserId, receiverId: userId },
      ],
    },
  });
  if (!existing) return null;
  await db.friendship.delete({ where: { id: existing.id } });
  return { success: true } as const;
}

/**
 * Search through the user's accepted friends with flexible filtering.
 * Supports general search term and specific field filters with case-insensitive partial matching.
 * @param userId - Current user's ID
 * @param filters - Object containing search criteria
 * @returns Array of friends matching the search criteria with pagination info
 */
export async function searchFriends(
  userId: string,
  filters: {
    search?: string;
    name?: string;
    email?: string;
    handle?: string;
    limit?: number;
    offset?: number;
  }
) {
  const { search, name, email, handle, limit = 20, offset = 0 } = filters;

  // Build where conditions for the friend's user data
  const userWhereConditions: any[] = [];

  // If general search is provided, search across multiple fields
  if (search && search.trim()) {
    userWhereConditions.push(
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { handle: { contains: search, mode: 'insensitive' } }
    );
  }

  // Add specific field filters
  const userAndConditions: any = {};
  if (name && name.trim()) {
    userAndConditions.name = { contains: name, mode: 'insensitive' };
  }
  if (email && email.trim()) {
    userAndConditions.email = { contains: email, mode: 'insensitive' };
  }
  if (handle && handle.trim()) {
    userAndConditions.handle = { contains: handle, mode: 'insensitive' };
  }

  // Construct the user filter
  let userWhere: any = {};
  if (userWhereConditions.length > 0 && Object.keys(userAndConditions).length > 0) {
    userWhere = {
      AND: [
        { OR: userWhereConditions },
        userAndConditions
      ]
    };
  } else if (userWhereConditions.length > 0) {
    userWhere = { OR: userWhereConditions };
  } else if (Object.keys(userAndConditions).length > 0) {
    userWhere = userAndConditions;
  }

  const baseSelect = {
    id: true,
    requesterId: true,
    receiverId: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    requester: {
      select: {
        id: true,
        name: true,
        handle: true,
        email: true,
        avatarUrl: true,
      },
    },
    receiver: {
      select: {
        id: true,
        name: true,
        handle: true,
        email: true,
        avatarUrl: true,
      },
    },
  };

  // Build the friendship where clause
  const friendshipWhere: any = {
    status: 'ACCEPTED',
    OR: [
      {
        requesterId: userId,
        ...(Object.keys(userWhere).length > 0 && { receiver: userWhere }),
      },
      {
        receiverId: userId,
        ...(Object.keys(userWhere).length > 0 && { requester: userWhere }),
      },
    ],
  };

  // Execute the search query
  const friendships = await db.friendship.findMany({
    where: friendshipWhere,
    select: baseSelect,
    take: limit,
    skip: offset,
  });

  // Get total count
  const total = await db.friendship.count({ where: friendshipWhere });

  // Map to include otherUser for convenience
  const friends = friendships.map((f: any) => ({
    id: f.id,
    requesterId: f.requesterId,
    receiverId: f.receiverId,
    status: f.status,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    otherUser: f.requesterId === userId ? f.receiver : f.requester,
  }));

  return {
    friends,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + friends.length < total,
    },
  };
}


