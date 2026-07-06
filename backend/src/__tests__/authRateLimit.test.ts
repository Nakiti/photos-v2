import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../libs/redis.js', () => ({
  redis: { incr: vi.fn(), expire: vi.fn(), ttl: vi.fn() },
}));

import { redis } from '../../libs/redis.js';
import { authRateLimit } from '../middleware/authRateLimit.middleware.js';

const mockRedis = redis as any;

function makeReqRes(overrides: any = {}) {
  const req: any = {
    headers: {},
    ip: '1.2.3.4',
    socket: { remoteAddress: '1.2.3.4' },
    ...overrides,
  };
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.body = body;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
  };
  return { req, res };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authRateLimit', () => {
  it('allows a request under the limit and sets the window expiry on the first hit', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    const { req, res } = makeReqRes();
    const next = vi.fn();

    await authRateLimit(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(mockRedis.expire).toHaveBeenCalledWith('auth:ratelimit:1.2.3.4', 15 * 60);
    expect(res.statusCode).toBe(200);
  });

  it('keys by req.ip (trust-proxy-derived), not the raw X-Forwarded-For header', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    // A spoofed header must be ignored; req.ip is what Express derives via trust proxy.
    const { req, res } = makeReqRes({ ip: '9.9.9.9', headers: { 'x-forwarded-for': '6.6.6.6' } });
    const next = vi.fn();

    await authRateLimit(req, res, next);

    expect(mockRedis.incr).toHaveBeenCalledWith('auth:ratelimit:9.9.9.9');
  });

  it('returns 429 with Retry-After once the limit is exceeded', async () => {
    mockRedis.incr.mockResolvedValue(11);
    mockRedis.ttl.mockResolvedValue(300);
    const { req, res } = makeReqRes();
    const next = vi.fn();

    await authRateLimit(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBe('300');
    expect(res.body.retryAfterSeconds).toBe(300);
  });

  it('fails CLOSED (503) when Redis throws — does not call next', async () => {
    mockRedis.incr.mockRejectedValue(new Error('ECONNREFUSED'));
    const { req, res } = makeReqRes();
    const next = vi.fn();

    await authRateLimit(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
  });
});
