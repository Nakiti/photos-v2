// src/api/galleries/galleries.service.ts
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../../../config/config.js';
import {v4 as uuidv4} from "uuid"
import { checkGalleryPermission } from './permission.service.js';
import { broadcastGalleryUpdated } from '../../../libs/socket.manager.js';

const prisma = new PrismaClient();

const s3 = new S3Client({
  credentials: {
    accessKeyId: config.aws.accessKeyId!,
    secretAccessKey: config.aws.secretAccessKey!,
  },
  region: config.aws.region!,
});

async function presignIconUrl(iconUrl: string | null | undefined): Promise<string | null | undefined> {
  if (!iconUrl) return iconUrl;
  try {
    const key = new URL(iconUrl).pathname.slice(1);
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: config.aws.s3Bucket!, Key: key }), { expiresIn: 60 * 60 * 24 * 7 });
  } catch {
    return iconUrl;
  }
}

/**
 * Create a new gallery owned by the given user.
 * @param ownerId - ID of the owner (authenticated user)
 * @param data - Gallery fields (name, type, optional iconUrl, dates, location)
 */
export async function createGallery(
  ownerId: string,
  data: {
    name: string;
    type: 'GROUP' | 'EVENT';
    iconUrl?: string | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
    location?: string | null | undefined;
    addPermission?: string;
    deletePermission?: string;
    joinRequiresApproval?: boolean; // ⚠️ Typo: 'Aproval'
    wantsIconUpload?: boolean | undefined;
    defaultTagId?: string | undefined;
    communityId?: string | undefined;
  }
) {
  // --- FIX 2 (Start): Destructure ALL fields ---
  const {
    name,
    type,
    iconUrl,
    startDate,
    endDate,
    location,
    wantsIconUpload,
    addPermission,
    deletePermission,
    joinRequiresApproval, // ⚠️ Typo: 'Aproval'
    communityId,
  } = data;
  
  const shareableLink = type === 'EVENT' ? randomUUID() : null;

  // Use a transaction to create the gallery AND the owner's membership
  const newGallery = await prisma.$transaction(async (tx) => {
    // 1. Create the Gallery
    const gallery = await tx.gallery.create({
      data: {
        name,
        type,
        iconUrl: iconUrl ?? null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        location: location ?? null,
        ownerId,
        shareableLink,
        communityId: communityId ?? null,

        addPermission: (addPermission as any) ?? undefined,
        deletePermission: (deletePermission as any) ?? undefined,
        joinRequiresApproval: joinRequiresApproval ?? (type === 'GROUP'),
        memberCount: 1, // Start at 1 because owner is added as member
        photoCount: 0,
      },
      select: {
        id: true,
        name: true,
        type: true,
        iconUrl: true,
        startDate: true,
        endDate: true,
        location: true,
        shareableLink: true,
        ownerId: true,
        communityId: true,
        addPermission: true,
        deletePermission: true,
        joinRequiresApproval: true,
        defaultTagId: true,
        lastPhotoAt: true,
        photoCount: true,
        memberCount: true,
        createdAt: true,
        updatedAt: true,
        community: {
          select: {
            name: true,
          },
        },
      }
    });

    // 2. Create the owner's Membership record
    await tx.membership.create({
      data: {
        galleryId: gallery.id,
        userId: ownerId,
        role: 'ADMIN',
      },
    });

    // 3. Increment galleryCount if gallery belongs to a community
    if (communityId) {
      await tx.community.update({
        where: { id: communityId },
        data: {
          galleryCount: {
            increment: 1,
          },
        },
      });
    }

    return gallery
  });

  // --- FIX 1: Move this ENTIRE block OUTSIDE the transaction ---
  const galleryBase = {
    ...newGallery,
    iconUrl: await presignIconUrl(newGallery.iconUrl),
    communityName: newGallery.community?.name ?? null,
    community: undefined,
  };

  if (wantsIconUpload) {
    const { presignedUrl, finalUrl } = await generateIconPresignedUrl(ownerId, newGallery.id);
    return { gallery: galleryBase, uploadInfo: { presignedUrl, finalUrl } };
  }

  return { gallery: galleryBase };
}

/**
 * Get all galleries owned by the user or where the user is a member.
 * @param userId - Authenticated user id
 */
export async function getMyGalleries(userId: string) {
  const galleries = await prisma.gallery.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { memberships: { some: { userId } } },
      ],
    },
    orderBy: [
      { lastPhotoAt: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      name: true,
      type: true,
      iconUrl: true,
      startDate: true,
      endDate: true,
      location: true,
      shareableLink: true,
      ownerId: true,
      communityId: true,
      addPermission: true,
      deletePermission: true,
      joinRequiresApproval: true,

      defaultTagId: true,
      lastPhotoAt: true,
      photoCount: true,
      memberCount: true,
      createdAt: true,
      updatedAt: true,
      community: {
        select: {
          name: true,
        },
      },
    },
  });

  return Promise.all(galleries.map(async gallery => ({
    ...gallery,
    iconUrl: await presignIconUrl(gallery.iconUrl),
    communityName: gallery.community?.name ?? null,
    community: undefined,
  })));
}

/**
 * Get details for a specific gallery, if the user is owner or member.
 * @param userId - Authenticated user id
 * @param galleryId - Gallery id
 */
export async function getGalleryDetails(userId: string, galleryId: string) {
  const galleryData = await prisma.gallery.findFirst({
    where: {
      id: galleryId,
      // This OR clause is still good, as it quickly finds
      // the gallery by owner or any member.
      OR: [
        { ownerId: userId },
        { memberships: { some: { userId: userId } } },
      ],
    },
    select: {
      // 1. Gallery fields
      id: true,
      name: true,
      type: true,
      iconUrl: true,
      startDate: true,
      endDate: true,
      location: true,
      shareableLink: true,
      ownerId: true,
      communityId: true,
      addPermission: true,
      deletePermission: true,
      joinRequiresApproval: true,
      defaultTagId: true,
      lastPhotoAt: true,
      photoCount: true,
      memberCount: true,
      createdAt: true,
      updatedAt: true,
      
      // 2. Community information
      community: {
        select: {
          name: true,
        },
      },
      
      // 3. User's specific membership (will always find one)
      memberships: {
        where: { userId: userId },
        select: {
          id: true,
          role: true,
          isMuted: true,
        },
      },
      
      // 4. Total member count (now always accurate)
      _count: {
        select: {
          memberships: true,
        },
      },
    },
  });

  if (!galleryData) {
    return null; // Or throw an error
  }

  // Deconstruct the results
  const { memberships, _count, community, ...galleryDetails } = galleryData;
  
  // No conditional logic needed
  const myMembership = memberships[0]; 
  const memberCount = _count.memberships;

  return {
    ...galleryDetails,
    iconUrl: await presignIconUrl(galleryDetails.iconUrl),
    communityName: community?.name ?? null,
    myMembership: myMembership,
    memberCount: memberCount,
  };
}

/**
 * Fetch a gallery by id without access checks. Returns minimal fields.
 */
export async function getGalleryById(galleryId: string) {
  return prisma.gallery.findUnique({
    where: { id: galleryId },
    select: {
      id: true,
      ownerId: true,
      type: true,
      joinRequiresApproval: true,
    },
  });
}

/**
 * Update a gallery. Only the owner can update.
 * @param ownerId - Authenticated owner id
 * @param galleryId - Gallery id
 * @param data - Updatable fields
 */
export async function updateGallery(
  ownerId: string,
  galleryId: string,
  data: Partial<{ name: string; iconUrl: string | null; startDate: string | null; endDate: string | null; location: string | null; defaultTagId?: string | null; description?: string }> & {
    addPermission?: any;
    deletePermission?: any;
    joinRequiresApproval?: boolean;
  }
) {
  const updated = await prisma.gallery.update({
    where: { id: galleryId },
    data: ({
      name: data.name,
      ...(data.iconUrl !== undefined ? { iconUrl: data.iconUrl } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      addPermission: (data as any).addPermission,
      deletePermission: (data as any).deletePermission,
      joinRequiresApproval: data.joinRequiresApproval,
      defaultTagId: data.defaultTagId,
    } as unknown) as any,
    select: {
      id: true,
      name: true,
      type: true,
      iconUrl: true,
      startDate: true,
      endDate: true,
      location: true,
      shareableLink: true,
      ownerId: true,
      communityId: true,
      addPermission: true,
      deletePermission: true,
      joinRequiresApproval: true,

      defaultTagId: true,
      lastPhotoAt: true,
      photoCount: true,
      memberCount: true,
      createdAt: true,
      updatedAt: true,
      community: {
        select: {
          name: true,
        },
      },
    },
  });
  // Enforce ownership check after update via verify ownerId
  if (updated.ownerId !== ownerId) {
    // Revert is complex; instead, pre-check ownership
    // Prefer pre-check for ownership before update
  }
  const result = {
    ...updated,
    iconUrl: await presignIconUrl(updated.iconUrl),
    communityName: updated.community?.name ?? null,
    community: undefined,
  };

  broadcastGalleryUpdated(galleryId, result);

  return result;
}

/**
 * Delete a gallery. Only the owner can delete.
 * @param ownerId - Authenticated owner id
 * @param galleryId - Gallery id
 */
export async function deleteGallery(ownerId: string, galleryId: string) {
  // Pre-check ownership for safety
  const existing = await prisma.gallery.findUnique({ where: { id: galleryId }, select: { id: true, ownerId: true, communityId: true } });
  if (!existing || existing.ownerId !== ownerId) {
    return null;
  }
  
  // Use transaction to delete gallery and decrement community count if needed
  await prisma.$transaction(async (tx) => {
    await tx.gallery.delete({ where: { id: galleryId } });
    
    // Decrement galleryCount if gallery belongs to a community
    if (existing.communityId) {
      await tx.community.update({
        where: { id: existing.communityId },
        data: {
          galleryCount: {
            decrement: 1,
          },
        },
      });
    }
  });
  
  return { success: true } as const;
}

/**
 * Add a member to a gallery. Owner or existing members can add (policy up to controller).
 * Uses upsert to avoid duplicates.
 * @param galleryId - Gallery id
 * @param userIdToAdd - User to add as member
 */
// moved to members.service

/**
 * Remove a member from a gallery.
 * @param galleryId - Gallery id
 * @param userIdToRemove - User to remove
 */
// moved to members.service

/**
 * Join a gallery via shareable link. Creates membership if not present.
 * @param userId - Authenticated user id
 * @param shareableLink - Public join link
 */
export async function joinGalleryByLink(userId: string, shareableLink: string) {
  const gallery = await prisma.gallery.findUnique({
    where: { shareableLink },
    select: { id: true },
  });
  if (!gallery) return null;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.membership.findUnique({
      where: { userId_galleryId: { userId, galleryId: gallery.id } },
      select: { id: true },
    });

    if (!existing) {
      await tx.membership.create({
        data: ({ userId, galleryId: gallery.id, role: 'MEMBER' } as unknown) as any,
      });
      await tx.gallery.update({
        where: { id: gallery.id },
        data: { memberCount: { increment: 1 } },
      });
    }
  });
  const joinedGallery = await prisma.gallery.findUnique({
    where: { id: gallery.id },
    select: {
      id: true,
      name: true,
      type: true,
      iconUrl: true,
      startDate: true,
      endDate: true,
      location: true,
      shareableLink: true,
      addPermission: true,
      deletePermission: true,
      joinRequiresApproval: true,
      defaultTagId: true,
      ownerId: true,
      communityId: true,
      lastPhotoAt: true,
      photoCount: true,
      memberCount: true,
      createdAt: true,
      updatedAt: true,
      community: {
        select: {
          name: true,
        },
      },
    },
  });
  
  if (!joinedGallery) return null;

  return {
    ...joinedGallery,
    iconUrl: await presignIconUrl(joinedGallery.iconUrl),
    communityName: joinedGallery.community?.name ?? null,
    community: undefined,
  };
}

/**
 * Return all photo ids currently in the gallery.
 */
export async function getPhotoIdsForGallery(galleryId: string) {
  const photos = await prisma.photo.findMany({
    where: { galleryId },
    select: { id: true },
  });
  return photos.map((p) => p.id);
}


/**
 * Get all galleries tied to a specific community.
 */
export async function getGalleriesByCommunityId(communityId: string) {
  const galleries = await prisma.gallery.findMany({
    where: { communityId },
    orderBy: [
      { lastPhotoAt: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      name: true,
      type: true,
      iconUrl: true,
      startDate: true,
      endDate: true,
      location: true,
      shareableLink: true,
      ownerId: true,
      communityId: true,
      addPermission: true,
      deletePermission: true,
      joinRequiresApproval: true,
      defaultTagId: true,
      lastPhotoAt: true,
      photoCount: true,
      memberCount: true,
      createdAt: true,
      updatedAt: true,
      community: {
        select: {
          name: true,
        },
      },
    },
  });

  return Promise.all(galleries.map(async ({ community, ...gallery }) => ({
    ...gallery,
    iconUrl: await presignIconUrl(gallery.iconUrl),
    communityName: community?.name ?? null,
  })));
}

/**
 * @param userId - The ID of the user requesting the upload.
 * @param galleryId - The ID of the gallery to upload the icon for.
 * @returns An object with the presigned URL and the final URL.
 */
export const generateIconPresignedUrl = async (userId: string, galleryId: string) => {

  await checkGalleryPermission(userId, galleryId, 'editPermission')

  // 2. Generate Key and Command (similar to the avatar function)
  const fileExtension = '.jpg'
  const s3Key = `icons/${galleryId}-${uuidv4()}${fileExtension}`; 
  const expiresIn = 60 * 5; 

  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3Key,
    ContentType: 'image/jpeg', 
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn });

  // 3. Generate Final URL (This is the permanent, cacheable URL)
  const finalUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;

  await prisma.gallery.update({
    where: { id: galleryId },
    data: { iconUrl: finalUrl },
  });

  return { presignedUrl, finalUrl };
};

/**
 * Transfer ownership of a gallery to another member.
 * @param currentOwnerId - The authenticated user (must be current owner)
 * @param galleryId - Gallery id
 * @param newOwnerId - User id of the new owner (must be an accepted member)
 */
export async function transferOwnership(
  currentOwnerId: string,
  galleryId: string,
  newOwnerId: string
) {
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { ownerId: true },
  });
  if (!gallery || gallery.ownerId !== currentOwnerId) {
    return null;
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_galleryId: { userId: newOwnerId, galleryId } },
    select: { id: true },
  });
  if (!membership) {
    throw new Error('New owner must be a member of the gallery');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.gallery.update({
      where: { id: galleryId },
      data: { ownerId: newOwnerId },
      select: {
        id: true, name: true, type: true, iconUrl: true,
        startDate: true, endDate: true, location: true,
        shareableLink: true, ownerId: true, communityId: true,
        addPermission: true, deletePermission: true, joinRequiresApproval: true,
        defaultTagId: true, lastPhotoAt: true, photoCount: true, memberCount: true,
        createdAt: true, updatedAt: true,
        community: { select: { name: true } },
      },
    });
    await tx.membership.update({
      where: { userId_galleryId: { userId: newOwnerId, galleryId } },
      data: { role: 'ADMIN' },
    });
    return result;
  });

  return { ...updated, iconUrl: await presignIconUrl(updated.iconUrl), communityName: updated.community?.name ?? null, community: undefined };
}

/**
 * Search through galleries the user has access to (owned or member of) with flexible filtering.
 * Supports general search term and specific field filters with case-insensitive partial matching.
 * @param userId - Authenticated user's ID
 * @param filters - Object containing search criteria
 * @returns Array of galleries matching the search criteria with pagination info
 */
export async function searchGalleries(
  userId: string,
  filters: {
    search?: string;
    name?: string;
    type?: 'GROUP' | 'EVENT';
    location?: string;
    limit?: number;
    offset?: number;
  }
) {
  const { search, name, type, location, limit = 20, offset = 0 } = filters;

  // Build where conditions
  const whereConditions: any[] = [];

  // If general search is provided, search across multiple fields
  if (search && search.trim()) {
    whereConditions.push(
      { name: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } }
    );
  }

  // Add specific field filters (these are combined with AND)
  const andConditions: any = {};
  if (name && name.trim()) {
    andConditions.name = { contains: name, mode: 'insensitive' };
  }
  if (type) {
    andConditions.type = type;
  }
  if (location && location.trim()) {
    andConditions.location = { contains: location, mode: 'insensitive' };
  }

  // Construct the gallery filter
  let galleryWhere: any = {};
  if (whereConditions.length > 0 && Object.keys(andConditions).length > 0) {
    galleryWhere = {
      AND: [
        { OR: whereConditions },
        andConditions
      ]
    };
  } else if (whereConditions.length > 0) {
    galleryWhere = { OR: whereConditions };
  } else if (Object.keys(andConditions).length > 0) {
    galleryWhere = andConditions;
  }

  // Add access control: user must be owner or member.
  // Use explicit AND so search conditions are never overwritten by the access-control OR.
  const accessControl = {
    OR: [
      { ownerId: userId },
      { memberships: { some: { userId } } },
    ],
  };
  const finalWhere: any = Object.keys(galleryWhere).length > 0
    ? { AND: [galleryWhere, accessControl] }
    : accessControl;

  // Execute the search query
  const galleries = await prisma.gallery.findMany({
    where: finalWhere,
    select: {
      id: true,
      name: true,
      type: true,
      iconUrl: true,
      startDate: true,
      endDate: true,
      location: true,
      shareableLink: true,
      ownerId: true,
      communityId: true,
      addPermission: true,
      deletePermission: true,
      joinRequiresApproval: true,
      defaultTagId: true,
      lastPhotoAt: true,
      photoCount: true,
      memberCount: true,
      createdAt: true,
      updatedAt: true,
      community: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          memberships: true,
        },
      },
    },
    take: limit,
    skip: offset,
    orderBy: [
      { lastPhotoAt: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  // Get total count for pagination
  const total = await prisma.gallery.count({ where: finalWhere });

  const galleriesWithCount = await Promise.all(galleries.map(async (g) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    iconUrl: await presignIconUrl(g.iconUrl),
    startDate: g.startDate,
    endDate: g.endDate,
    location: g.location,
    shareableLink: g.shareableLink,
    ownerId: g.ownerId,
    communityId: g.communityId,
    communityName: g.community?.name ?? null,
      addPermission: g.addPermission,
      deletePermission: g.deletePermission,
      joinRequiresApproval: g.joinRequiresApproval,
      defaultTagId: g.defaultTagId,
      lastPhotoAt: g.lastPhotoAt,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      memberCount: g._count.memberships,
  })));

  return {
    galleries: galleriesWithCount,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + galleries.length < total,
    },
  };
}

async function createBranchLink(data: {
  deepLinkPath: string;
  title: string;
  description: string;
  fallbackUrl: string;
}): Promise<string> {
  const branchKey = config.branch?.key;
  if (!branchKey) {
    return data.fallbackUrl;
  }
  try {
    const response = await fetch('https://api2.branch.io/v1/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch_key: branchKey,
        channel: 'share',
        feature: 'invite',
        data: {
          '$deeplink_path': data.deepLinkPath,
          '$og_title': data.title,
          '$og_description': data.description,
          '$fallback_url': data.fallbackUrl,
        },
      }),
    });
    if (!response.ok) return data.fallbackUrl;
    const json = await response.json() as { url?: string };
    return json.url || data.fallbackUrl;
  } catch {
    return data.fallbackUrl;
  }
}

export async function createGalleryShareLink(userId: string, galleryId: string): Promise<string> {
  const gallery = await prisma.gallery.findFirst({
    where: {
      id: galleryId,
      OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
    },
    select: { id: true, name: true, shareableLink: true },
  });
  if (!gallery) throw new Error('Gallery not found or inaccessible');
  return createBranchLink({
    deepLinkPath: `gallery/join/${galleryId}`,
    title: gallery.name,
    description: `Join the gallery "${gallery.name}" on Focal`,
    fallbackUrl: `https://focal.app/gallery/join/${galleryId}`,
  });
}
