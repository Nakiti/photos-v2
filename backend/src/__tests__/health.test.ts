import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@prisma/client', () => {
  const instance = {
    $queryRaw: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
  return { PrismaClient: vi.fn(() => instance) };
});

vi.mock('../../libs/redis.js', () => ({
  redis: { ping: vi.fn() },
}));

vi.mock('@aws-sdk/client-s3', () => {
  // Single shared `send` so every `new S3Client()` (the one in health.ts and
  // the one the test grabs below) resolves to the same mock.
  const send = vi.fn();
  return {
    S3Client: vi.fn(() => ({ send })),
    HeadObjectCommand: vi.fn(),
  };
});

import { PrismaClient } from '@prisma/client';
import { S3Client } from '@aws-sdk/client-s3';
import { redis } from '../../libs/redis.js';
import { checkReadiness } from '../../libs/health.js';

const mockDb = new PrismaClient() as any;
const mockRedis = redis as any;
// The S3Client mock returns the same `send` instance each call.
const mockS3Send = (new S3Client({} as any) as any).send;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkReadiness', () => {
  it('reports ok when all dependencies are healthy', async () => {
    mockDb.$queryRaw.mockResolvedValue([{ '1': 1 }]);
    mockRedis.ping.mockResolvedValue('PONG');
    mockS3Send.mockResolvedValue({}); // HeadObject succeeded

    const report = await checkReadiness();

    expect(report.status).toBe('ok');
    expect(report.checks.database.ok).toBe(true);
    expect(report.checks.redis.ok).toBe(true);
    expect(report.checks.s3.ok).toBe(true);
  });

  it('treats an S3 404 (NotFound) as reachable/healthy', async () => {
    mockDb.$queryRaw.mockResolvedValue([{ '1': 1 }]);
    mockRedis.ping.mockResolvedValue('PONG');
    mockS3Send.mockRejectedValue(
      Object.assign(new Error('Not Found'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } }),
    );

    const report = await checkReadiness();

    expect(report.status).toBe('ok');
    expect(report.checks.s3.ok).toBe(true);
  });

  it('reports degraded and surfaces the error when Redis is down', async () => {
    mockDb.$queryRaw.mockResolvedValue([{ '1': 1 }]);
    mockRedis.ping.mockRejectedValue(new Error('ECONNREFUSED'));
    mockS3Send.mockResolvedValue({});

    const report = await checkReadiness();

    expect(report.status).toBe('degraded');
    expect(report.checks.redis.ok).toBe(false);
    expect(report.checks.redis.error).toContain('ECONNREFUSED');
    expect(report.checks.database.ok).toBe(true);
  });

  it('reports degraded when the database query fails', async () => {
    mockDb.$queryRaw.mockRejectedValue(new Error('db unreachable'));
    mockRedis.ping.mockResolvedValue('PONG');
    mockS3Send.mockResolvedValue({});

    const report = await checkReadiness();

    expect(report.status).toBe('degraded');
    expect(report.checks.database.ok).toBe(false);
  });

  it('reports degraded when S3 returns a non-404 error (e.g. auth/network)', async () => {
    mockDb.$queryRaw.mockResolvedValue([{ '1': 1 }]);
    mockRedis.ping.mockResolvedValue('PONG');
    mockS3Send.mockRejectedValue(
      Object.assign(new Error('Access Denied'), { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } }),
    );

    const report = await checkReadiness();

    expect(report.status).toBe('degraded');
    expect(report.checks.s3.ok).toBe(false);
  });
});
