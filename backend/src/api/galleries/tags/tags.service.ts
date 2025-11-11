import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function listTagsForGallery(galleryId: string) {
  return prisma.tag.findMany({
    where: { galleryId },
    select: {
      id: true,
      name: true,
      color: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function createTag(galleryId: string, data: { name: string; color?: string }) {
  try {
    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        color: data.color,
        galleryId,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });
    return { tag, conflict: false as const };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Unique constraint (galleryId, name)
      return { tag: null, conflict: true as const };
    }
    throw error;
  }
}

export async function updateTag(
  galleryId: string,
  tagId: string,
  data: { name?: string; color?: string }
) {
  const existing = await prisma.tag.findFirst({
    where: { id: tagId, galleryId },
    select: { id: true },
  });
  if (!existing) return null;
  try {
    const updated = await prisma.tag.update({
      where: { id: tagId },
      data: {
        name: data.name ?? undefined,
        color: data.color ?? undefined,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });
    return updated;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Unique constraint conflict on (galleryId, name)
      // Surface null with a marker would complicate; let controller map to 409
      throw Object.assign(new Error('Tag name already exists'), { status: 409 });
    }
    throw error;
  }
}

export async function deleteTag(galleryId: string, tagId: string) {
  const existing = await prisma.tag.findFirst({
    where: { id: tagId, galleryId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.tag.delete({ where: { id: tagId } });
  return true;
}


