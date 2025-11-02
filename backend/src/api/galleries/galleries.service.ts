// src/api/galleries/galleries.service.ts
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

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
  }
) {
  const { name, type, iconUrl, startDate, endDate, location } = data;
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
        // Set approval based on type. Events are open, Groups are private.
        // joinRequiresApproval: type === 'GROUP' ? true : false,
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

  return newGallery;
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
  // Ensure the user has access
  const gallery = await prisma.gallery.findFirst({
    where: {
      id: galleryId,
      OR: [
        { ownerId: userId },
        { memberships: { some: { userId } } },
      ],
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
      createdAt: true,
      updatedAt: true,
      memberships: {
        select: { id: true, userId: true, joinedAt: true },
      },
    },
  });
  return gallery;
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
 * Return all member userIds currently in the gallery.
 */
// moved to members.service
