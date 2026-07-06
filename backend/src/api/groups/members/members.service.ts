import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function isAdminOrOwner(userId: string, groupId: string) {
	const community = await prisma.community.findUnique({
		where: { id: groupId },
		select: { ownerId: true },
	});
	if (!community) return false;
	if (community.ownerId === userId) return true;
	const membership = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId: groupId } },
		select: { role: true },
	});
	return !!membership && membership.role === 'ADMIN';
}

export async function addMember(groupId: string, userIdToAdd: string) {
	const existing = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId: userIdToAdd, communityId: groupId } },
		select: { id: true },
	});

	const membership = await prisma.communityMembership.upsert({
		where: { userId_communityId: { userId: userIdToAdd, communityId: groupId } },
		update: {},
		create: { userId: userIdToAdd, communityId: groupId, role: 'MEMBER' },
	});

	if (!existing) {
		await prisma.community.update({
			where: { id: groupId },
			data: { memberCount: { increment: 1 } },
		});
	}

	return membership;
}

export async function removeMember(groupId: string, userIdToRemove: string) {
	await prisma.communityMembership.delete({
		where: { userId_communityId: { userId: userIdToRemove, communityId: groupId } },
	});

	await prisma.community.update({
		where: { id: groupId },
		data: { memberCount: { decrement: 1 } },
	});
}

export async function getMembers(groupId: string) {
	const memberships = await prisma.communityMembership.findMany({
		where: { communityId: groupId },
		include: { user: true },
		orderBy: { joinedAt: 'desc' },
	});
	return memberships.map((m) => ({
		user: {
			id: m.user.id,
			name: m.user.name ?? undefined,
			avatarUrl: m.user.avatarUrl ?? undefined,
			handle: m.user.handle,
		},
		membership: {
			id: m.id,
			joinedAt: m.joinedAt.toISOString(),
			role: m.role,
		},
	}));
}

export async function getMembership(userId: string, groupId: string) {
	return prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId: groupId } },
	});
}

export async function joinGroup(groupId: string, userId: string) {
	const existing = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId: groupId } },
		select: { id: true },
	});

	const membership = await prisma.communityMembership.upsert({
		where: { userId_communityId: { userId, communityId: groupId } },
		update: {},
		create: { userId, communityId: groupId, role: 'MEMBER' },
	});

	if (!existing) {
		await prisma.community.update({
			where: { id: groupId },
			data: { memberCount: { increment: 1 } },
		});
	}

	return membership;
}

export async function leaveGroup(groupId: string, userId: string) {
	try {
		await prisma.communityMembership.delete({
			where: { userId_communityId: { userId, communityId: groupId } },
		});

		await prisma.community.update({
			where: { id: groupId },
			data: { memberCount: { decrement: 1 } },
		});

		return true;
	} catch {
		return false;
	}
}

export async function promoteMember(groupId: string, targetUserId: string) {
	return prisma.communityMembership.update({
		where: { userId_communityId: { userId: targetUserId, communityId: groupId } },
		data: { role: 'ADMIN' },
	});
}
