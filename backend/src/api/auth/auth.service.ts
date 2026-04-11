import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../../config/config.js'; 

const prisma = new PrismaClient();
const SALT_ROUNDS = 10; // Standard salt rounds for bcrypt

export const createUser = async (email: string, password: string, name: string | undefined, handle: string) => {
  // 1. Hash the password securely
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // 2. Create the user in the database using Prisma
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name ?? null,
      handle
    },
    // 3. Select which fields to return (exclude password)
    select: {
        id: true,
        email: true,
        name: true,
        handle: true,
        createdAt: true,
        updatedAt: true
    }
  });

  return user;
};

/**
 * Verify credentials and return a signed JWT and user safe profile.
 * @param email - user's email
 * @param password - plaintext password
 */
export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return null;
  }
  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return null;
  }
  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });
  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  return { token, user: safeUser };
};