import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@prisma/client', () => {
  const instance = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn(instance)),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
  return { PrismaClient: vi.fn(() => instance) };
});

vi.mock('../../libs/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    smembers: vi.fn(),
    pipeline: vi.fn(() => ({
      setex: vi.fn().mockReturnThis(),
      sadd: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      del: vi.fn().mockReturnThis(),
      srem: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    })),
  },
}));

vi.mock('../../libs/email.js', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import { PrismaClient } from '@prisma/client';
import { redis } from '../../libs/redis.js';
import { sendPasswordResetEmail } from '../../libs/email.js';
import {
  createUser,
  loginUser,
  verifyAndRotateRefreshToken,
  resetPassword,
  requestPasswordReset,
  revokeRefreshToken,
} from '../api/auth/auth.service.js';

const mockDb = new PrismaClient() as any;
const mockRedis = redis as any;

const fakeUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  name: 'Test User',
  handle: 'testuser',
  password: '',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

beforeEach(() => {
  vi.clearAllMocks();
  // Re-attach pipeline mock after clearAllMocks
  mockRedis.pipeline.mockReturnValue({
    setex: vi.fn().mockReturnThis(),
    sadd: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    del: vi.fn().mockReturnThis(),
    srem: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  });
});

describe('createUser', () => {
  it('returns user, accessToken, and refreshToken on success', async () => {
    mockDb.user.create.mockResolvedValue({ ...fakeUser });

    const result = await createUser('test@example.com', 'password123', 'Test User', 'testuser');

    expect(result.user.email).toBe('test@example.com');
    expect(result.user.id).toBe('user-uuid-1');
    expect(typeof result.accessToken).toBe('string');
    expect(result.accessToken.split('.')).toHaveLength(3); // valid JWT
    expect(typeof result.refreshToken).toBe('string');
    expect(result.refreshToken.length).toBeGreaterThan(0);
  });

  it('calls prisma.user.create with hashed password (not plaintext)', async () => {
    mockDb.user.create.mockResolvedValue({ ...fakeUser });

    await createUser('test@example.com', 'plaintext', 'Test User', 'testuser');

    const createCall = mockDb.user.create.mock.calls[0][0];
    expect(createCall.data.password).not.toBe('plaintext');
    expect(createCall.data.password).toMatch(/^\$2[ab]\$/); // bcrypt hash prefix
  });
});

describe('loginUser', () => {
  it('returns null when user is not found', async () => {
    mockDb.user.findUnique.mockResolvedValue(null);

    const result = await loginUser('notfound@example.com', 'password');
    expect(result).toBeNull();
  });

  it('returns null when password does not match', async () => {
    // bcrypt hash of 'correctpassword'
    const bcrypt = await import('bcryptjs');
    const hashedPw = await bcrypt.hash('correctpassword', 10);
    mockDb.user.findUnique.mockResolvedValue({ ...fakeUser, password: hashedPw });

    const result = await loginUser('test@example.com', 'wrongpassword');
    expect(result).toBeNull();
  });

  it('returns token and user on valid credentials', async () => {
    const bcrypt = await import('bcryptjs');
    const hashedPw = await bcrypt.hash('correctpassword', 10);
    mockDb.user.findUnique.mockResolvedValue({ ...fakeUser, password: hashedPw });

    const result = await loginUser('test@example.com', 'correctpassword');

    expect(result).not.toBeNull();
    expect(result!.token.split('.')).toHaveLength(3);
    expect(result!.user.id).toBe('user-uuid-1');
    expect(result!.user).not.toHaveProperty('password');
  });
});

describe('verifyAndRotateRefreshToken', () => {
  it('returns null when token is not in redis', async () => {
    mockRedis.get.mockResolvedValue(null);

    const result = await verifyAndRotateRefreshToken('nonexistent-token');
    expect(result).toBeNull();
  });

  it('returns userId and newRefreshToken when token is valid', async () => {
    mockRedis.get.mockResolvedValue('user-uuid-1');

    const result = await verifyAndRotateRefreshToken('valid-raw-token');

    expect(result).not.toBeNull();
    expect(result!.userId).toBe('user-uuid-1');
    expect(typeof result!.newRefreshToken).toBe('string');
    expect(result!.newRefreshToken.length).toBeGreaterThan(0);
  });

  it('deletes the old token and issues a new one', async () => {
    mockRedis.get.mockResolvedValue('user-uuid-1');
    const pipeline = mockRedis.pipeline();

    await verifyAndRotateRefreshToken('valid-raw-token');

    // The pipeline should have been called to delete the old token
    expect(pipeline.del).toHaveBeenCalled();
    expect(pipeline.exec).toHaveBeenCalled();
  });
});

describe('revokeRefreshToken', () => {
  it('executes pipeline to delete token from redis', async () => {
    mockRedis.get.mockResolvedValue('user-uuid-1');
    const pipeline = mockRedis.pipeline();

    await revokeRefreshToken('some-raw-token');

    expect(pipeline.del).toHaveBeenCalled();
    expect(pipeline.exec).toHaveBeenCalled();
  });

  it('still executes even when userId is not found (graceful)', async () => {
    mockRedis.get.mockResolvedValue(null);
    const pipeline = mockRedis.pipeline();

    await expect(revokeRefreshToken('unknown-token')).resolves.not.toThrow();
    expect(pipeline.exec).toHaveBeenCalled();
  });
});

describe('requestPasswordReset', () => {
  it('resolves without error when user does not exist (no information leak)', async () => {
    mockDb.user.findUnique.mockResolvedValue(null);

    await expect(requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('sends a reset email when user exists', async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: 'user-1' });
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');

    await requestPasswordReset('user@example.com');

    expect(sendPasswordResetEmail).toHaveBeenCalledWith('user@example.com', expect.any(String));
    const code = (sendPasswordResetEmail as any).mock.calls[0][1];
    expect(code).toMatch(/^\d{6}$/); // 6-digit OTP
  });
});

describe('resetPassword', () => {
  it('returns false when OTP code is not found in redis', async () => {
    mockRedis.get.mockResolvedValue(null);

    const result = await resetPassword('000000', 'newpassword');
    expect(result).toBe(false);
  });

  it('updates password and returns true when code is valid', async () => {
    mockRedis.get.mockResolvedValue('user-uuid-1');
    mockDb.user.update.mockResolvedValue({ email: 'test@example.com' });
    mockRedis.del.mockResolvedValue(1);
    mockRedis.smembers.mockResolvedValue([]);

    const result = await resetPassword('123456', 'newpassword123');

    expect(result).toBe(true);
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-uuid-1' } })
    );
    // Verify the new password is hashed, not stored as plaintext
    const updateCall = mockDb.user.update.mock.calls[0][0];
    expect(updateCall.data.password).not.toBe('newpassword123');
    expect(updateCall.data.password).toMatch(/^\$2[ab]\$/);
  });
});
