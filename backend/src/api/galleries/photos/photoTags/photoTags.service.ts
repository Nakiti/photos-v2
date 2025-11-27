import { PrismaClient, Prisma } from '@prisma/client';
import { socketManager } from '../../../../../libs/socket.manager.js';

const prisma = new PrismaClient();

/**
 * Apply an existing tag (that belongs to the same gallery) to a photo.
 * Returns:
 * - 'OK' when applied (idempotent)
 * - 'NOT_FOUND' if photo or tag not in the given gallery
 * Throws with status 409 for unique conflicts (already exists).
 */
export async function applyTagToPhoto(
  galleryId: string,
  photoId: string,
  tagId: string
): Promise<'OK' | 'NOT_FOUND'> {
  // Verify the photo belongs to the gallery
  const photo = await prisma.photo.findFirst({
    where: { id: photoId, galleryId },
    select: { id: true },
  });
  if (!photo) return 'NOT_FOUND';

  // Verify the tag belongs to the gallery
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, galleryId },
    select: { id: true },
  });
  if (!tag) return 'NOT_FOUND';

  try {
    await prisma.photoTag.create({
      data: {
        photoId,
        tagId,
      },
    });
    
    // Broadcast tag addition to gallery room
    socketManager.broadcastPhotoTagged(galleryId, photoId, tagId, 'added');
    
    return 'OK';
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Unique constraint on (photoId, tagId)
      // Treat as idempotent success for API simplicity, but mark 409 for explicit conflict if needed
      throw Object.assign(new Error('Already tagged'), { status: 409 });
    }
    throw error;
  }
}

/**
 * Remove a tag from a photo (no-op if not applied).
 * Returns boolean indicating if a PhotoTag row was actually deleted.
 */
export async function removeTagFromPhoto(
  galleryId: string,
  photoId: string,
  tagId: string
): Promise<boolean> {
  // Ensure both entities belong to the same gallery to avoid cross-gallery tampering
  const [photo, tag] = await Promise.all([
    prisma.photo.findFirst({ where: { id: photoId, galleryId }, select: { id: true } }),
    prisma.tag.findFirst({ where: { id: tagId, galleryId }, select: { id: true } }),
  ]);
  if (!photo || !tag) return false;

  try {
    await prisma.photoTag.delete({
      where: { photoId_tagId: { photoId, tagId } },
    });
    
    // Broadcast tag removal to gallery room
    socketManager.broadcastPhotoTagged(galleryId, photoId, tagId, 'removed');
    
    return true;
  } catch {
    // If it doesn't exist, treat as not found
    return false;
  }
}


