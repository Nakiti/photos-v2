import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import config from '../../../config/config.js';
import { redis } from '../../../libs/redis.js';
import { sendPasswordResetEmail } from '../../../libs/email.js';

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

function userTokenSetKey(userId: string): string {
  return `user:rts:${userId}`;
}

async function issueRefreshToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString('hex');
  const hashed = hashToken(raw);
  const pipeline = redis.pipeline();
  pipeline.setex(redisKey(hashed), REFRESH_TOKEN_TTL_SECONDS, userId);
  pipeline.sadd(userTokenSetKey(userId), hashed);
  pipeline.expire(userTokenSetKey(userId), REFRESH_TOKEN_TTL_SECONDS);
  await pipeline.exec();
  return raw;
}

export async function verifyAndRotateRefreshToken(
  raw: string,
): Promise<{ userId: string; newRefreshToken: string } | null> {
  const hashed = hashToken(raw);
  const key = redisKey(hashed);
  const userId = await redis.get(key);
  if (!userId) return null;
  const pipeline = redis.pipeline();
  pipeline.del(key);
  pipeline.srem(userTokenSetKey(userId), hashed);
  await pipeline.exec();
  const newRefreshToken = await issueRefreshToken(userId);
  return { userId, newRefreshToken };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  const hashed = hashToken(raw);
  const userId = await redis.get(redisKey(hashed));
  const pipeline = redis.pipeline();
  pipeline.del(redisKey(hashed));
  if (userId) pipeline.srem(userTokenSetKey(userId), hashed);
  await pipeline.exec();
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  const hashes = await redis.smembers(userTokenSetKey(userId));
  if (hashes.length === 0) return;
  const pipeline = redis.pipeline();
  hashes.forEach((h) => pipeline.del(redisKey(h)));
  pipeline.del(userTokenSetKey(userId));
  await pipeline.exec();
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

const RESET_CODE_TTL_SECONDS = 10 * 60; // 10 minutes

function prEmailKey(email: string): string {
  return `pr:email:${createHash('sha256').update(email.toLowerCase()).digest('hex')}`;
}

function prCodeKey(code: string): string {
  return `pr:code:${createHash('sha256').update(code).digest('hex')}`;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });

  // Always resolve — never reveal whether the email exists
  if (!user) return;

  // Invalidate any existing code for this email before issuing a new one
  const emailKey = prEmailKey(email);
  const existingCodeHash = await redis.get(emailKey);
  if (existingCodeHash) {
    await redis.del(`pr:code:${existingCodeHash}`);
  }

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit OTP
  const codeHash = createHash('sha256').update(code).digest('hex');

  await redis.setex(`pr:code:${codeHash}`, RESET_CODE_TTL_SECONDS, user.id);
  await redis.setex(emailKey, RESET_CODE_TTL_SECONDS, codeHash);

  await sendPasswordResetEmail(email, code);
}

export async function resetPassword(code: string, newPassword: string): Promise<boolean> {
  const codeKey = prCodeKey(code);
  const userId = await redis.get(codeKey);
  if (!userId) return false;

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
    select: { email: true },
  });

  // Consume the code — one-time use
  await redis.del(codeKey);
  await redis.del(prEmailKey(user.email));

  // Invalidate all existing sessions so old refresh tokens cannot be used
  await revokeAllUserTokens(userId);

  return true;
}
