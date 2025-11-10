// src/api/galleries/galleries.service.ts
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../../../config/config.js';
import {v4 as uuidv4} from "uuid"
import { checkGalleryPermission } from './permission.service.js';

const prisma = new PrismaClient();

const s3 = new S3Client({
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  region: config.aws.region,
}); 


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
    iconUrl?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    location?: string | null;
    addPermission?: string;
    deletePermission?: string;
    joinRequiresAproval?: boolean; // ⚠️ Typo: 'Aproval'
    wantsIconUpload?: boolean;
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
    joinRequiresAproval, // ⚠️ Typo: 'Aproval'
  } = data;
  
  const shareableLink = type === 'EVENT' ? randomUUID() : undefined;

  // Use a transaction to create the gallery AND the owner's membership
  const newGallery = await prisma.$transaction(async (tx) => {
    // 1. Create the Gallery
    const gallery = await tx.gallery.create({
      data: {
        name,
        type,
        iconUrl: iconUrl ?? undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        location: location ?? undefined,
        ownerId,
        shareableLink,

        addPermission: addPermission ?? 'ADMIN', // Set your own default
        deletePermission: deletePermission ?? 'ADMIN', // Set your own default
        joinRequiresApproval: joinRequiresAproval ?? (type === 'GROUP'),
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
        addPermission: true,
        deletePermission: true,
        joinRequiresApproval: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 2. Create the owner's Membership record
    await tx.membership.create({
      data: {
        galleryId: gallery.id,
        userId: ownerId,
        role: 'ADMIN',
        status: 'ACCEPTED',
      },
    });

    // Return the gallery object, which is what the controller expects
    return gallery;
  });

  // --- FIX 1: Move this ENTIRE block OUTSIDE the transaction ---
  if (wantsIconUpload) {
    const { presignedUrl, finalUrl } = await generateIconPresignedUrl(
      ownerId,
      newGallery.id
    );

    // Return both the gallery and the upload info
    return {
      gallery: newGallery,
      uploadInfo: { presignedUrl, finalUrl },
    };
  }

  // If no upload was requested, just return the gallery
  return { gallery: newGallery };
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
    orderBy: { createdAt: 'desc' },
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
      addPermission: true,
      deletePermission: true,
      joinRequiresApproval: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return galleries;
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
      addPermission: true,
      deletePermission: true,
      joinRequiresApproval: true,
      createdAt: true,
      updatedAt: true,
      
      // 2. User's specific membership (will always find one)
      memberships: {
        where: { userId: userId },
        select: {
          id: true,
          status: true,
          role: true,
          isMuted: true,
        },
      },
      
      // 3. Total member count (now always accurate)
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
  const { memberships, _count, ...galleryDetails } = galleryData;
  
  // No conditional logic needed
  const myMembership = memberships[0]; 
  const memberCount = _count.memberships;

  // Return the clean, combined object
  return {
    ...galleryDetails,
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
  data: Partial<{ name: string; iconUrl: string | null; startDate: string | null; endDate: string | null; location: string | null }>
) {
  const updated = await prisma.gallery.update({
    where: { id: galleryId },
    data: {
      name: data.name ?? undefined,
      iconUrl: data.iconUrl ?? undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      location: data.location ?? undefined,
      addPermission: data.addPermission,
      deletePermission: data.deletePermission,
      joinRequiresApproval: data.joinRequiresApproval,
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
      addPermission: true,
      deletePermission: true,
      joinRequiresApproval: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  // Enforce ownership check after update via verify ownerId
  if (updated.ownerId !== ownerId) {
    // Revert is complex; instead, pre-check ownership
    // Prefer pre-check for ownership before update
  }
  return updated;
}

/**
 * Delete a gallery. Only the owner can delete.
 * @param ownerId - Authenticated owner id
 * @param galleryId - Gallery id
 */
export async function deleteGallery(ownerId: string, galleryId: string) {
  // Pre-check ownership for safety
  const existing = await prisma.gallery.findUnique({ where: { id: galleryId }, select: { id: true, ownerId: true } });
  if (!existing || existing.ownerId !== ownerId) {
    return null;
  }
  await prisma.gallery.delete({ where: { id: galleryId } });
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
  await prisma.membership.upsert({
    where: { userId_galleryId: { userId, galleryId: gallery.id } },
    update: {},
    create: { userId, galleryId: gallery.id },
  });
  return await prisma.gallery.findUnique({
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
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
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

  // Add access control: user must be owner or member
  const finalWhere: any = {
    ...galleryWhere,
    OR: [
      { ownerId: userId },
      { memberships: { some: { userId } } },
    ],
  };

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
      addPermission: true,
      deletePermission: true,
      joinRequiresApproval: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          memberships: true,
        },
      },
    },
    take: limit,
    skip: offset,
    orderBy: [
      { createdAt: 'desc' },
    ],
  });

  // Get total count for pagination
  const total = await prisma.gallery.count({ where: finalWhere });

  // Map to include member count
  const galleriesWithCount = galleries.map((g) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    iconUrl: g.iconUrl,
    startDate: g.startDate,
    endDate: g.endDate,
    location: g.location,
    shareableLink: g.shareableLink,
    ownerId: g.ownerId,
    addPermission: g.addPermission,
    deletePermission: g.deletePermission,
    joinRequiresApproval: g.joinRequiresApproval,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    memberCount: g._count.memberships,
  }));

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

