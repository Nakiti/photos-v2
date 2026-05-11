import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import config from '../../../config/config.js';
import { redis } from '../../../libs/redis.js';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function redisKey(hashedToken: string): string {
  return `rt:${hashedToken}`;
}

async function issueRefreshToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString('hex');
  const hashed = hashToken(raw);
  await redis.setex(redisKey(hashed), REFRESH_TOKEN_TTL_SECONDS, userId);
  return raw;
}

export async function verifyAndRotateRefreshToken(
  raw: string,
): Promise<{ userId: string; newRefreshToken: string } | null> {
  const hashed = hashToken(raw);
  const key = redisKey(hashed);
  const userId = await redis.get(key);
  if (!userId) return null;
  // Rotate: delete old token and issue a new one atomically enough for this use case
  await redis.del(key);
  const newRefreshToken = await issueRefreshToken(userId);
  return { userId, newRefreshToken };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  await redis.del(redisKey(hashToken(raw)));
}

export const createUser = async (email: string, password: string, name: string | undefined, handle: string) => {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name: name ?? null, handle },
    select: { id: true, email: true, name: true, handle: true, createdAt: true, updatedAt: true },
  });

  const accessToken = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = await issueRefreshToken(user.id);
  return { user, accessToken, refreshToken };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) return null;

  const accessToken = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = await issueRefreshToken(user.id);

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  return { token: accessToken, refreshToken, user: safeUser };
};

export const refreshAccessToken = async (rawRefreshToken: string) => {
  const result = await verifyAndRotateRefreshToken(rawRefreshToken);
  if (!result) return null;

  const user = await prisma.user.findUnique({
    where: { id: result.userId },
    select: { id: true, email: true },
  });
  if (!user) return null;

  const accessToken = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
  return { token: accessToken, refreshToken: result.newRefreshToken };
};
