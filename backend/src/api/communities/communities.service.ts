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

	const community = await prisma.community.create({
		data: {
			name,
			description: description ?? undefined,
			iconUrl: iconUrl ?? null,
			ownerId,
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
			createdAt: true,
			updatedAt: true,
		},
	});

	// Ensure owner is also a MEMBER with ADMIN role
	await prisma.communityMembership.upsert({
		where: { userId_communityId: { userId: ownerId, communityId: community.id } },
		update: { role: 'ADMIN' as any },
		create: { userId: ownerId, communityId: community.id, role: 'ADMIN' as any },
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


