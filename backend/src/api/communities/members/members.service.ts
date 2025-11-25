import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function isAdminOrOwner(userId: string, communityId: string) {
	const community = await prisma.community.findUnique({
		where: { id: communityId },
		select: { ownerId: true },
	});
	if (!community) return false;
	if (community.ownerId === userId) return true;
	const membership = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId } },
		select: { role: true } as any,
	});
	return !!membership && (membership as any).role === 'ADMIN';
}

export async function addMember(communityId: string, userIdToAdd: string) {
	return prisma.communityMembership.upsert({
		where: { userId_communityId: { userId: userIdToAdd, communityId } },
		update: {},
		create: { userId: userIdToAdd, communityId },
	});
}

export async function removeMember(communityId: string, userIdToRemove: string) {
	return prisma.communityMembership.delete({
		where: { userId_communityId: { userId: userIdToRemove, communityId } },
	});
}

export async function getMembers(communityId: string) {
	const memberships = await prisma.communityMembership.findMany({
		where: { communityId },
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
		},
	}));
}

export async function getMembership(userId: string, communityId: string) {
	return prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId } },
	});
}

export async function joinCommunity(communityId: string, userId: string) {
	return prisma.communityMembership.upsert({
		where: { userId_communityId: { userId, communityId } },
		update: {},
		create: ({ userId, communityId, role: 'MEMBER' } as unknown) as any,
	});
}

export async function leaveCommunity(communityId: string, userId: string) {
	try {
		await prisma.communityMembership.delete({ where: { userId_communityId: { userId, communityId } } });
		return true;
	} catch {
		return false;
	}
}

export async function promoteMember(communityId: string, targetUserId: string) {
	return prisma.communityMembership.update({
		where: { userId_communityId: { userId: targetUserId, communityId } },
		data: ({ role: 'ADMIN' } as unknown) as any,
	});
}


