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
		select: { status: true },
	});

	const membership = await prisma.communityMembership.upsert({
		where: { userId_communityId: { userId: userIdToAdd, communityId: groupId } },
		update: {},
		create: { userId: userIdToAdd, communityId: groupId, status: 'ACCEPTED', role: 'MEMBER' },
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
	const existing = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId: userIdToRemove, communityId: groupId } },
		select: { status: true },
	});

	await prisma.communityMembership.delete({
		where: { userId_communityId: { userId: userIdToRemove, communityId: groupId } },
	});

	if (existing?.status === 'ACCEPTED') {
		await prisma.community.update({
			where: { id: groupId },
			data: { memberCount: { decrement: 1 } },
		});
	}
}

export async function getMembers(
	groupId: string,
	status?: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED'
) {
	const memberships = await prisma.communityMembership.findMany({
		where: { communityId: groupId, ...(status ? { status } : {}) },
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
			status: m.status,
		},
	}));
}

export async function getMembership(userId: string, groupId: string) {
	return prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId: groupId } },
	});
}

export async function joinGroup(groupId: string, userId: string) {
	const community = await prisma.community.findUnique({
		where: { id: groupId },
		select: { joinRequiresApproval: true },
	});

	const requiresApproval = community?.joinRequiresApproval ?? false;
	const status: 'ACCEPTED' | 'PENDING' = requiresApproval ? 'PENDING' : 'ACCEPTED';

	const existing = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId: groupId } },
	});

	const membership = await prisma.communityMembership.upsert({
		where: { userId_communityId: { userId, communityId: groupId } },
		update: {},
		create: { userId, communityId: groupId, role: 'MEMBER', status },
	});

	if (!existing && status === 'ACCEPTED') {
		await prisma.community.update({
			where: { id: groupId },
			data: { memberCount: { increment: 1 } },
		});
	}

	return membership;
}

export async function approveMember(groupId: string, targetUserId: string) {
	const existing = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId: targetUserId, communityId: groupId } },
		select: { status: true },
	});
	if (!existing || existing.status !== 'PENDING') return null;

	const membership = await prisma.communityMembership.update({
		where: { userId_communityId: { userId: targetUserId, communityId: groupId } },
		data: { status: 'ACCEPTED' },
	});

	await prisma.community.update({
		where: { id: groupId },
		data: { memberCount: { increment: 1 } },
	});

	return membership;
}

export async function leaveGroup(groupId: string, userId: string) {
	try {
		const existing = await prisma.communityMembership.findUnique({
			where: { userId_communityId: { userId, communityId: groupId } },
			select: { status: true },
		});

		await prisma.communityMembership.delete({
			where: { userId_communityId: { userId, communityId: groupId } },
		});

		if (existing?.status === 'ACCEPTED') {
			await prisma.community.update({
				where: { id: groupId },
				data: { memberCount: { decrement: 1 } },
			});
		}

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
