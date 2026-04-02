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

export async function createCommunity(
	ownerId: string,
	data: {
		name: string;
		description?: string | undefined;
		iconUrl?: string | null | undefined;
		wantsIconUpload?: boolean | undefined;
	}
) {
	const { name, description, iconUrl, wantsIconUpload } = data;

	const community = await prisma.$transaction(async (tx) => {
		const newCommunity = await tx.community.create({
			data: {
				name,
				description: description ?? undefined,
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
			where: { userId_communityId: { userId: ownerId, communityId: newCommunity.id } },
			update: { role: 'ADMIN' as any },
			create: { userId: ownerId, communityId: newCommunity.id, role: 'ADMIN' as any },
		});

		return newCommunity;
	});

	if (wantsIconUpload) {
		const key = `community-icons/${community.id}/${uuidv4()}.png`;
		const presignedUrl = await getSignedUrl(
			s3,
			new PutObjectCommand({
				Bucket: config.aws.bucket!,
				Key: key,
				ContentType: 'image/png',
				ACL: 'public-read',
			}),
			{ expiresIn: 60 * 5 }
		);
		const finalUrl = `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
		return { community, uploadInfo: { presignedUrl, finalUrl } };
	}

	return { community };
}

export async function getMyCommunities(userId: string) {
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

export async function getCommunityById(communityId: string) {
	return prisma.community.findUnique({
		where: { id: communityId },
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

export async function getCommunityDetails(userId: string, communityId: string) {
	// Access if owner or member
	const community = await prisma.community.findUnique({
		where: { id: communityId },
	});
	if (!community) return null;
	if (community.ownerId === userId) return community;

	const membership = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId } },
	});
	if (!membership) return null;
	return community;
}

export async function updateCommunity(
	ownerId: string,
	communityId: string,
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
	const existing = await prisma.community.findUnique({ where: { id: communityId }, select: { ownerId: true } });
	if (!existing || existing.ownerId !== ownerId) return null;

	return prisma.community.update({
		where: { id: communityId },
		data: {
			name: data.name ?? undefined,
			description: data.description ?? undefined,
			iconUrl: data.iconUrl ?? undefined,
			joinRequiresApproval: data.joinRequiresApproval ?? undefined,
			addPermission: data.addPermission ?? undefined,
			deletePermission: data.deletePermission ?? undefined,
		},
	});
}

export async function deleteCommunity(ownerId: string, communityId: string) {
	const existing = await prisma.community.findUnique({ where: { id: communityId }, select: { ownerId: true } });
	if (!existing || existing.ownerId !== ownerId) return false;
	await prisma.community.delete({ where: { id: communityId } });
	return true;
}

export async function generateIconPresignedUrl(userId: string, communityId: string) {
	// Only owner can change icon
	const community = await prisma.community.findUnique({ where: { id: communityId }, select: { ownerId: true } });
	if (!community) throw new Error('Not found');
	if (community.ownerId !== userId) throw new Error('Forbidden');

	const key = `community-icons/${communityId}/${uuidv4()}.png`;
	const presignedUrl = await getSignedUrl(
		s3,
		new PutObjectCommand({
			Bucket: config.aws.bucket!,
			Key: key,
			ContentType: 'image/png',
			ACL: 'public-read',
		}),
		{ expiresIn: 60 * 5 }
	);
	const finalUrl = `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
	return { presignedUrl, finalUrl };
}

/**
 * Transfer ownership of a community to another member.
 * @param currentOwnerId - Current owner's user ID
 * @param communityId - Community ID
 * @param newOwnerId - New owner's user ID
 * @returns Updated community or null if transfer failed
 */
export async function transferOwnership(
	currentOwnerId: string,
	communityId: string,
	newOwnerId: string
) {
	// Verify current user is owner
	const community = await prisma.community.findUnique({
		where: { id: communityId },
		select: { ownerId: true },
	});
	if (!community || community.ownerId !== currentOwnerId) {
		return null;
	}

	// Verify new owner is a member of the community
	const membership = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId: newOwnerId, communityId } },
		select: { id: true },
	});
	if (!membership) {
		throw new Error('New owner must be a member of the community');
	}

	// Transfer ownership in a transaction
	return prisma.$transaction(async (tx) => {
		// 1. Update community owner
		const updated = await tx.community.update({
			where: { id: communityId },
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
			where: { userId_communityId: { userId: newOwnerId, communityId } },
			update: { role: 'ADMIN' as any },
			create: { userId: newOwnerId, communityId, role: 'ADMIN' as any },
		});

		return updated;
	});
}

export async function createCommunityShareLink(userId: string, communityId: string): Promise<string> {
	const membership = await prisma.communityMembership.findUnique({
		where: { userId_communityId: { userId, communityId } },
		select: { id: true },
	});
	const community = await prisma.community.findUnique({
		where: { id: communityId },
		select: { id: true, name: true, ownerId: true },
	});
	if (!community || (!membership && community.ownerId !== userId)) {
		throw new Error('Community not found or inaccessible');
	}
	const branchKey = config.branch?.key;
	const fallbackUrl = `https://focal.app/community/join/${communityId}`;
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
					'$deeplink_path': `community/join/${communityId}`,
					'$og_title': community.name,
					'$og_description': `Join the community "${community.name}" on Focal`,
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
