import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import config from '../../../config/config.js';

const prisma = new PrismaClient();

const s3 = new S3Client({
	credentials: {
		accessKeyId: config.aws.accessKeyId!,
		secretAccessKey: config.aws.secretAccessKey!,
	},
	region: config.aws.region!,
});

export async function createGroup(
	ownerId: string,
	data: {
		name: string;
		description?: string | undefined;
		iconUrl?: string | null | undefined;
		wantsIconUpload?: boolean | undefined;
	}
) {
	const { name, description, iconUrl, wantsIconUpload } = data;

	const group = await prisma.$transaction(async (tx) => {
		const newGroup = await tx.community.create({
			data: {
				name,
				description: description ?? null,
				iconUrl: iconUrl ?? null,
				ownerId,
				memberCount: 1, // Start at 1 because owner is added as member
				galleryCount: 0,
			},
			select: {
				id: true,
				name: true,
				description: true,
				iconUrl: true,
				ownerId: true,
				joinRequiresApproval: true,
				addPermission: true,
				deletePermission: true,
				memberCount: true,
				galleryCount: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		// Ensure owner is also a MEMBER with ADMIN role
		await tx.communityMembership.upsert({
			where: { userId_communityId: { userId: ownerId, communityId: newGroup.id } },
			update: { role: 'ADMIN' },
			create: { userId: ownerId, communityId: newGroup.id, role: 'ADMIN' },
		});

		return newGroup;
	});

	if (wantsIconUpload) {
		const key = `community-icons/${group.id}/${uuidv4()}.png`;
		const presignedUrl = await getSignedUrl(
			s3,
			new PutObjectCommand({
				Bucket: config.aws.s3Bucket!,
				Key: key,
				ContentType: 'image/png',
				ACL: 'public-read',
			}),
			{ expiresIn: 60 * 5 }
		);
		const finalUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
		return { community: group, uploadInfo: { presignedUrl, finalUrl } };
	}

	return { community: group };
}

export async function getMyGroups(userId: string) {
	// Owned
	const owned = await prisma.community.findMany({
		where: { ownerId: userId },
		select: {
			id: true,
			name: true,
			description: true,
			iconUrl: true,
			ownerId: true,
			joinRequiresApproval: true,
			addPermission: true,
			deletePermission: true,
			memberCount: true,
			galleryCount: true,
			createdAt: true,
			updatedAt: true,
		},
		orderBy: { createdAt: 'desc' },
	});

	// Member of
	const memberOf = await prisma.communityMembership.findMany({
		where: { userId },
		select: {
			community: {
				select: {
					id: true,
					name: true,
					description: true,
					iconUrl: true,
					ownerId: true,
					joinRequiresApproval: true,
					addPermission: true,
					deletePermission: true,
					memberCount: true,
					galleryCount: true,
					createdAt: true,
					updatedAt: true,
				},
			},
		},
		orderBy: { joinedAt: 'desc' },
	});

	const memberships = memberOf.map((m) => m.community);
	return { owned, memberships };
}

export async function getGroupById(groupId: string) {
	return prisma.community.findUnique({
		where: { id: groupId },
		select: {
			id: true,
			name: true,
			description: true,
			iconUrl: true,
			ownerId: true,
			joinRequiresApproval: true,
			addPermission: true,
			deletePermission: true,
			memberCount: true,
			galleryCount: true,
			createdAt: true,
			updatedAt: true,
		},
	});
}

export async function getGroupDetails(userId: string, groupId: string) {
	// Access if owner or member
	const group = await prisma.community.findUnique({
		where: { id: groupId },
	});
	if (!group) return null;
	if (group.ownerId === userId) return group;

	const membership = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId: groupId } },
	});
	if (!membership) return null;
	return group;
}

export async function updateGroup(
	ownerId: string,
	groupId: string,
	data: {
		name?: string | undefined;
		description?: string | undefined;
		iconUrl?: string | undefined;
		joinRequiresApproval?: boolean | undefined;
		addPermission?: 'ANYONE' | 'ADMIN' | undefined;
		deletePermission?: 'ADMINS_AUTHORS' | 'ADMIN' | undefined;
	}
) {
	// Ensure owner
	const existing = await prisma.community.findUnique({ where: { id: groupId }, select: { ownerId: true } });
	if (!existing || existing.ownerId !== ownerId) return null;

	const updateData: {
		name?: string;
		description?: string;
		iconUrl?: string;
		joinRequiresApproval?: boolean;
		addPermission?: 'ANYONE' | 'ADMIN';
		deletePermission?: 'ADMINS_AUTHORS' | 'ADMIN';
	} = {};
	if (data.name !== undefined) updateData.name = data.name;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.iconUrl !== undefined) updateData.iconUrl = data.iconUrl;
	if (data.joinRequiresApproval !== undefined) updateData.joinRequiresApproval = data.joinRequiresApproval;
	if (data.addPermission !== undefined) updateData.addPermission = data.addPermission;
	if (data.deletePermission !== undefined) updateData.deletePermission = data.deletePermission;

	return prisma.community.update({
		where: { id: groupId },
		data: updateData,
	});
}

export async function deleteGroup(ownerId: string, groupId: string) {
	const existing = await prisma.community.findUnique({ where: { id: groupId }, select: { ownerId: true } });
	if (!existing || existing.ownerId !== ownerId) return false;
	await prisma.community.delete({ where: { id: groupId } });
	return true;
}

export async function generateIconPresignedUrl(userId: string, groupId: string) {
	// Only owner can change icon
	const group = await prisma.community.findUnique({ where: { id: groupId }, select: { ownerId: true } });
	if (!group) throw new Error('Not found');
	if (group.ownerId !== userId) throw new Error('Forbidden');

	const key = `community-icons/${groupId}/${uuidv4()}.png`;
	const presignedUrl = await getSignedUrl(
		s3,
		new PutObjectCommand({
			Bucket: config.aws.s3Bucket!,
			Key: key,
			ContentType: 'image/png',
			ACL: 'public-read',
		}),
		{ expiresIn: 60 * 5 }
	);
	const finalUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
	return { presignedUrl, finalUrl };
}

/**
 * Transfer ownership of a group to another member.
 * @param currentOwnerId - Current owner's user ID
 * @param groupId - Group ID
 * @param newOwnerId - New owner's user ID
 * @returns Updated group or null if transfer failed
 */
export async function transferOwnership(
	currentOwnerId: string,
	groupId: string,
	newOwnerId: string
) {
	// Verify current user is owner
	const group = await prisma.community.findUnique({
		where: { id: groupId },
		select: { ownerId: true },
	});
	if (!group || group.ownerId !== currentOwnerId) {
		return null;
	}

	// Verify new owner is a member of the group
	const membership = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId: newOwnerId, communityId: groupId } },
		select: { id: true },
	});
	if (!membership) {
		throw new Error('New owner must be a member of the group');
	}

	// Transfer ownership in a transaction
	return prisma.$transaction(async (tx) => {
		// 1. Update group owner
		const updated = await tx.community.update({
			where: { id: groupId },
			data: { ownerId: newOwnerId },
			select: {
				id: true,
				name: true,
				description: true,
				iconUrl: true,
				ownerId: true,
				joinRequiresApproval: true,
				addPermission: true,
				deletePermission: true,
				memberCount: true,
				galleryCount: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		// 2. Ensure new owner has ADMIN role
		await tx.communityMembership.upsert({
			where: { userId_communityId: { userId: newOwnerId, communityId: groupId } },
			update: { role: 'ADMIN' },
			create: { userId: newOwnerId, communityId: groupId, role: 'ADMIN' },
		});

		return updated;
	});
}

export async function createGroupShareLink(userId: string, groupId: string): Promise<string> {
	const membership = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId: groupId } },
		select: { id: true },
	});
	const group = await prisma.community.findUnique({
		where: { id: groupId },
		select: { id: true, name: true, ownerId: true },
	});
	if (!group || (!membership && group.ownerId !== userId)) {
		throw new Error('Group not found or inaccessible');
	}
	const branchKey = config.branch?.key;
	const fallbackUrl = `https://focal.app/group/join/${groupId}`;
	if (!branchKey) return fallbackUrl;
	try {
		const response = await fetch('https://api2.branch.io/v1/url', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				branch_key: branchKey,
				channel: 'share',
				feature: 'invite',
				data: {
					'$deeplink_path': `group/join/${groupId}`,
					'$og_title': group.name,
					'$og_description': `Join the group "${group.name}" on Focal`,
					'$fallback_url': fallbackUrl,
				},
			}),
		});
		if (!response.ok) return fallbackUrl;
		const json = await response.json() as { url?: string };
		return json.url || fallbackUrl;
	} catch {
		return fallbackUrl;
	}
}
