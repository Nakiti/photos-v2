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
    requester: { select: { id: true, name: true, avatarUrl: true } },
    receiver: { select: { id: true, name: true, avatarUrl: true } },
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


