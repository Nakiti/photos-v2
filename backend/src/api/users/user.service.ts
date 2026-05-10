// src/api/users/user.service.ts
import { PrismaClient } from '@prisma/client';
import config from '../../../config/config.js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { v4 as uuidv4 } from 'uuid';


const prisma = new PrismaClient();

const s3 = new S3Client({
  credentials: {
    accessKeyId: config.aws.accessKeyId!,
    secretAccessKey: config.aws.secretAccessKey!,
  },
  region: config.aws.region!,
});

async function presignAvatarUrl(avatarUrl: string | null | undefined): Promise<string | null | undefined> {
  if (!avatarUrl) return avatarUrl;
  try {
    const key = new URL(avatarUrl).pathname.slice(1);
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: config.aws.s3Bucket!, Key: key }), { expiresIn: 60 * 60 * 24 * 7 });
  } catch {
    return avatarUrl;
  }
}

/**
 * Fetch the current user's profile by id using a safe select (no password).
 * @param userId - The authenticated user's id
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      handle: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) return null;
  return { ...user, avatarUrl: await presignAvatarUrl(user.avatarUrl) };
}

/**
 * Update the current user's profile with validated fields.
 * Uses a safe select to exclude the password.
 * @param userId - The authenticated user's id
 * @param data - Validated fields to update (e.g., name, avatarUrl)
 */
export async function updateUserProfile(userId: string, data: Partial<{ name: string; avatarUrl: string }>) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return { ...updated, avatarUrl: await presignAvatarUrl(updated.avatarUrl) };
}

/**
 * Register or re-register a device token for push notifications.
 * Uses upsert to handle duplicates efficiently.
 * @param userId - The authenticated user's id
 * @param token - The device token (FCM/APNS)
 * @param platform - The device platform ('ios' | 'android')
 */
export async function registerDevice(userId: string, token: string, platform: 'ios' | 'android') {
  const device = await prisma.device.upsert({
    where: { token },
    update: { userId },
    create: { userId, token, platform },
  });
  return device;
}


/**
 * Generates a presigned URL for uploading a user avatar.
 * @param userId - The ID of the user uploading the avatar.
 * @returns An object with the presigned URL and the final URL.
 */
export const generateAvatarPresignedUrl = async (userId: string, contentType: string, fileExtension: string) => {
  // Generate a unique key (filename) for the file
  const s3Key = `avatars/${userId}-${uuidv4()}${fileExtension}`;
  const expiresIn = 60 * 5; // URL is valid for 5 minutes

  // --- Updated Presigned URL (v3) ---
  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3Key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn });
  // --- End Updated URL ---

  // The final, permanent URL of the object after upload
  const finalUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;

  return { presignedUrl, finalUrl };
};

/**
 * Search for users by matching name or handle (case-insensitive).
 * @param filters - Object containing search criteria
 * @returns Array of users matching the search criteria
 */
export async function searchUsers(filters: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { search, limit = 20, offset = 0 } = filters;

  // Build where clause - search across name and handle only
  let where: any = {};
  
  if (search && search.trim()) {
    where = {
      OR: [
        { name: { contains: search.trim() } },
        { handle: { contains: search.trim() } }
      ]
    };
  }

  // Execute the search query
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      handle: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
    take: limit,
    skip: offset,
    orderBy: [
      { name: 'asc' },
      { handle: 'asc' }
    ],
  });

  // Get total count for pagination
  const total = await prisma.user.count({ where });

  const presignedUsers = await Promise.all(users.map(async u => ({ ...u, avatarUrl: await presignAvatarUrl(u.avatarUrl) })));

  return {
    users: presignedUsers,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + users.length < total,
    },
  };
}

