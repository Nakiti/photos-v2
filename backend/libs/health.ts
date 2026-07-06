import { PrismaClient } from '@prisma/client';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { redis } from './redis.js';
import { s3Client as s3 } from './s3.js';
import config from '../config/config.js';

// Dedicated Prisma client for the readiness probe. Cheap to keep around; the
// probe must not depend on request-path state. S3 reuses the shared client.
const prisma = new PrismaClient();

// A key that will almost certainly not exist. A 404 response proves S3 is
// reachable and the credentials are valid (which is all readiness needs).
const HEALTH_PROBE_KEY = 'healthcheck/probe';

export type CheckResult = { ok: boolean; error?: string };
export type ReadinessReport = {
  status: 'ok' | 'degraded';
  checks: {
    database: CheckResult;
    redis: CheckResult;
    s3: CheckResult;
  };
};

// Reject if the underlying promise does not settle in time, so a hung
// dependency can never hang the probe. The timer is always cleared.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function settle(promise: Promise<unknown>, timeoutMs: number): Promise<CheckResult> {
  try {
    await withTimeout(promise, timeoutMs);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkS3(timeoutMs: number): Promise<CheckResult> {
  try {
    await withTimeout(
      s3.send(new HeadObjectCommand({ Bucket: config.aws.s3Bucket, Key: HEALTH_PROBE_KEY })),
      timeoutMs,
    );
    return { ok: true };
  } catch (err: any) {
    // 404 / NotFound means the bucket is reachable and creds are valid — the
    // probe key simply isn't there, which is expected. Treat as healthy.
    const statusCode = err?.$metadata?.httpStatusCode;
    if (statusCode === 404 || err?.name === 'NotFound' || err?.name === 'NoSuchKey') {
      return { ok: true };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Probes every hard dependency (MySQL, Redis, S3) in parallel and returns a
 * per-dependency report. `status` is `ok` only when all checks pass.
 */
export async function checkReadiness(): Promise<ReadinessReport> {
  const [database, redisCheck, s3Check] = await Promise.all([
    settle(prisma.$queryRaw`SELECT 1`, 2000),
    settle(redis.ping(), 2000),
    checkS3(3000),
  ]);

  const status: ReadinessReport['status'] =
    database.ok && redisCheck.ok && s3Check.ok ? 'ok' : 'degraded';

  return { status, checks: { database, redis: redisCheck, s3: s3Check } };
}
