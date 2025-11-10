import { PrismaClient } from '@prisma/client';

const roleLevels = {
    MEMBER: 1,
    ADMIN: 2,
};
  
type UserRole = 'MEMBER' | 'ADMIN';
type PermissionLevel = 'MEMBER' | 'ADMIN';
type PermissionType = 'editPermission' | 'addPermission' | 'deletePermission';

const prisma = new PrismaClient();

/**
 * Checks if a user's role meets a required permission level.
 */
function hasPermission(
    userRole: UserRole, 
    requiredPermission: PermissionLevel
  ): boolean {
    const userLevel = roleLevels[userRole] ?? 0;
    const requiredLevel = roleLevels[requiredPermission] ?? 0;
  
    return userLevel >= requiredLevel;
}

/**
 * Reusable function to check if a user has permission to perform
 * an action on a specific gallery.
 * This will throw an error if permission is denied.
 */
export async function checkGalleryPermission(
    userId: string,
    galleryId: string,
    permissionType: PermissionType // e.g., 'editPermission'
  ) {

    const galleryInitial = await prisma.gallery.findUnique({
        where: { id: galleryId },
        select: { ownerId: true, addPermission: true /* etc. */ },
      });
    
    if (!galleryInitial) {
        throw new Error('Gallery not found');
    }

    // 2. Check for ownership (this bypasses the race condition!)
    if (galleryInitial.ownerId === userId) {
        return true; // The owner always has permission.
    }

    // 1. Fetch the user's membership AND the gallery's permissions in one go
    const membership = await prisma.membership.findFirst({
      where: { userId, galleryId },
      include: {
        gallery: {
          select: {
            ownerId: true,
            editPermission: true,
            addPermission: true,
            deletePermission: true,
          },
        },
      },
    });
  
    // 2. User isn't even a member
    if (!membership || !membership.gallery) {
      throw new Error('Forbidden: Not a member of this gallery');
    }
  
    const { gallery, role } = membership;
  
    // 3. SPECIAL RULE: The owner *always* has permission
    if (gallery.ownerId === userId) {
      return true;
    }
  
    // 4. Check the user's role against the gallery's required role
    const requiredPermission = gallery[permissionType] as PermissionLevel;
    const userRole = role as UserRole;
  
    if (!hasPermission(userRole, requiredPermission)) {
      throw new Error('Forbidden: You do not have permission to perform this action');
    }
  
    return true;
}