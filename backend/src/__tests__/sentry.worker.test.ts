import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock every heavy dependency the worker module pulls in so importing it is
// cheap and side-effect-free. Mocking @sentry/node also keeps this test runnable
// under Node 16 (the real SDK targets Node >= 18; it is never loaded here).
vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}));

// Capture the worker's event handlers as they are registered, and expose a
// fake job processor, by stubbing BullMQ's Worker.
const handlers: Record<string, (...args: any[]) => void> = {};
vi.mock('bullmq', () => ({
  Worker: vi.fn(() => ({
    on: (event: string, cb: (...args: any[]) => void) => {
      handlers[event] = cb;
    },
  })),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({})),
}));

vi.mock('../../libs/redis.js', () => ({
  redis: { hkeys: vi.fn() },
  redisConnection: {},
}));

vi.mock('../api/notifications/notifications.service.js', () => ({
  sendPushNotifications: vi.fn(),
  createNotificationRecord: vi.fn(),
}));

import * as Sentry from '@sentry/node';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('photo.worker Sentry integration', () => {
  it("reports job failures to Sentry via the 'failed' handler", async () => {
    // Importing the module registers worker.on('failed', ...) into `handlers`.
    await import('../workers/photo.worker.js');
    expect(typeof handlers['failed']).toBe('function');

    const err = new Error('boom');
    handlers['failed']!({ id: 'job-1', name: 'process-new-photo' }, err);

    expect(Sentry.captureException).toHaveBeenCalledWith(
      err,
      { extra: { jobId: 'job-1', jobName: 'process-new-photo' } },
    );
  });

  it('does not throw when the failed job is undefined', async () => {
    await import('../workers/photo.worker.js');
    const err = new Error('boom');

    expect(() => handlers['failed']!(undefined, err)).not.toThrow();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      err,
      { extra: { jobId: undefined, jobName: undefined } },
    );
  });
});
