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
		where: { userId_groupId: { userId, groupId } },
		select: { role: true } as any,
	});
	return !!membership && (membership as any).role === 'ADMIN';
}

export async function addMember(groupId: string, userIdToAdd: string) {
	// Check if membership already exists
	const existing = await prisma.communityMembership.findUnique({
		where: { userId_groupId: { userId: userIdToAdd, groupId } },
		select: { status: true } as any,
	});
	
	const membership = await prisma.communityMembership.upsert({
		where: { userId_groupId: { userId: userIdToAdd, groupId } },
		update: {},
		create: { userId: userIdToAdd, groupId, status: 'ACCEPTED' as any },
	});
	
	// Increment memberCount if this is a new membership
	if (!existing) {
		await prisma.community.update({
			where: { id: groupId },
			data: {
				memberCount: {
					increment: 1,
				},
			},
		});
	}
	
	return membership;
}

export async function removeMember(groupId: string, userIdToRemove: string) {
	// Check if membership exists and its status before deleting
	const existing = await prisma.communityMembership.findUnique({
		where: { userId_groupId: { userId: userIdToRemove, groupId } },
		select: { status: true } as any,
	});
	
	await prisma.communityMembership.delete({
		where: { userId_groupId: { userId: userIdToRemove, groupId } },
	});
	
	// Decrement memberCount if membership was ACCEPTED
	if (existing && (existing as any).status === 'ACCEPTED') {
		await prisma.community.update({
			where: { id: groupId },
			data: {
				memberCount: {
					decrement: 1,
				},
			},
		});
	}
}

export async function getMembers(
	groupId: string,
	status?: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED'
) {
	const memberships = await prisma.communityMembership.findMany({
		where: { groupId, ...(status ? { status } : {}) },
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
			status: (m.status as any),
		},
	}));
}

export async function getMembership(userId: string, groupId: string) {
	return prisma.communityMembership.findUnique({
		where: { userId_groupId: { userId, groupId } },
	});
}

export async function joinGroup(groupId: string, userId: string) {
	// Check if community requires approval
	const community = await prisma.community.findUnique({
		where: { id: groupId },
		select: { joinRequiresApproval: true },
	});
	
	const requiresApproval = community?.joinRequiresApproval ?? false;
	const status: 'ACCEPTED' | 'PENDING' = requiresApproval ? 'PENDING' : 'ACCEPTED';
	
	// Check if membership already exists
	const existing = await prisma.communityMembership.findUnique({
		where: { userId_groupId: { userId, groupId } },
	});
	
	const membership = await prisma.communityMembership.upsert({
		where: { userId_groupId: { userId, groupId } },
		update: {},
		create: ({ userId, groupId, role: 'MEMBER', status } as unknown) as any,
	});
	
	// Increment memberCount if this is a new membership with ACCEPTED status
	if (!existing && status === 'ACCEPTED') {
		await prisma.community.update({
			where: { id: groupId },
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
 * Approve a pending membership (admin only).
 */
export async function approveMember(groupId: string, targetUserId: string) {
	const existing = await prisma.communityMembership.findUnique({
		where: { userId_groupId: { userId: targetUserId, groupId } },
		select: { status: true } as any,
	});
	const current = existing as any;
	if (!current || current.status !== 'PENDING') return null;
	
	const membership = await prisma.communityMembership.update({
		where: { userId_groupId: { userId: targetUserId, groupId } },
		data: ({ status: 'ACCEPTED' } as unknown) as any,
	});
	
	// Increment memberCount when status changes from PENDING to ACCEPTED
	await prisma.community.update({
		where: { id: groupId },
		data: {
			memberCount: {
				increment: 1,
			},
		},
	});
	
	return membership;
}

export async function leaveGroup(groupId: string, userId: string) {
	try {
		// Check if membership exists and its status before deleting
		const existing = await prisma.communityMembership.findUnique({
			where: { userId_groupId: { userId, groupId } },
			select: { status: true } as any,
		});
		
		await prisma.communityMembership.delete({ where: { userId_groupId: { userId, groupId } } });
		
		// Decrement memberCount if membership was ACCEPTED
		if (existing && (existing as any).status === 'ACCEPTED') {
			await prisma.community.update({
				where: { id: groupId },
				data: {
					memberCount: {
						decrement: 1,
					},
				},
			});
		}
		
		return true;
	} catch {
		return false;
	}
}

export async function promoteMember(groupId: string, targetUserId: string) {
	return prisma.communityMembership.update({
		where: { userId_groupId: { userId: targetUserId, groupId } },
		data: ({ role: 'ADMIN' } as unknown) as any,
	});
}









