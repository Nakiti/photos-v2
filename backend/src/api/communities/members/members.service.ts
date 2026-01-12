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
	// Check if membership already exists
	const existing = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId: userIdToAdd, communityId } },
		select: { status: true } as any,
	});
	
	const membership = await prisma.communityMembership.upsert({
		where: { userId_communityId: { userId: userIdToAdd, communityId } },
		update: {},
		create: { userId: userIdToAdd, communityId, status: 'ACCEPTED' as any },
	});
	
	// Increment memberCount if this is a new membership
	if (!existing) {
		await prisma.community.update({
			where: { id: communityId },
			data: {
				memberCount: {
					increment: 1,
				},
			},
		});
	}
	
	return membership;
}

export async function removeMember(communityId: string, userIdToRemove: string) {
	// Check if membership exists and its status before deleting
	const existing = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId: userIdToRemove, communityId } },
		select: { status: true } as any,
	});
	
	await prisma.communityMembership.delete({
		where: { userId_communityId: { userId: userIdToRemove, communityId } },
	});
	
	// Decrement memberCount if membership was ACCEPTED
	if (existing && (existing as any).status === 'ACCEPTED') {
		await prisma.community.update({
			where: { id: communityId },
			data: {
				memberCount: {
					decrement: 1,
				},
			},
		});
	}
}

export async function getMembers(
	communityId: string,
	status?: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED'
) {
	const memberships = await prisma.communityMembership.findMany({
		where: { communityId, ...(status ? { status } : {}) },
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

export async function getMembership(userId: string, communityId: string) {
	return prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId } },
	});
}

export async function joinCommunity(communityId: string, userId: string) {
	// Check if community requires approval
	const community = await prisma.community.findUnique({
		where: { id: communityId },
		select: { joinRequiresApproval: true },
	});
	
	const requiresApproval = community?.joinRequiresApproval ?? false;
	const status: 'ACCEPTED' | 'PENDING' = requiresApproval ? 'PENDING' : 'ACCEPTED';
	
	// Check if membership already exists
	const existing = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId } },
	});
	
	const membership = await prisma.communityMembership.upsert({
		where: { userId_communityId: { userId, communityId } },
		update: {},
		create: ({ userId, communityId, role: 'MEMBER', status } as unknown) as any,
	});
	
	// Increment memberCount if this is a new membership with ACCEPTED status
	if (!existing && status === 'ACCEPTED') {
		await prisma.community.update({
			where: { id: communityId },
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
export async function approveMember(communityId: string, targetUserId: string) {
	const existing = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId: targetUserId, communityId } },
		select: { status: true } as any,
	});
	const current = existing as any;
	if (!current || current.status !== 'PENDING') return null;
	
	const membership = await prisma.communityMembership.update({
		where: { userId_communityId: { userId: targetUserId, communityId } },
		data: ({ status: 'ACCEPTED' } as unknown) as any,
	});
	
	// Increment memberCount when status changes from PENDING to ACCEPTED
	await prisma.community.update({
		where: { id: communityId },
		data: {
			memberCount: {
				increment: 1,
			},
		},
	});
	
	return membership;
}

export async function leaveCommunity(communityId: string, userId: string) {
	try {
		// Check if membership exists and its status before deleting
		const existing = await prisma.communityMembership.findUnique({
			where: { userId_communityId: { userId, communityId } },
			select: { status: true } as any,
		});
		
		await prisma.communityMembership.delete({ where: { userId_communityId: { userId, communityId } } });
		
		// Decrement memberCount if membership was ACCEPTED
		if (existing && (existing as any).status === 'ACCEPTED') {
			await prisma.community.update({
				where: { id: communityId },
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

export async function promoteMember(communityId: string, targetUserId: string) {
	return prisma.communityMembership.update({
		where: { userId_communityId: { userId: targetUserId, communityId } },
		data: ({ role: 'ADMIN' } as unknown) as any,
	});
}









