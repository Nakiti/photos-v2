import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../libs/redis.js', () => ({
  redis: { incr: vi.fn(), expire: vi.fn(), ttl: vi.fn() },
}));

import { redis } from '../../libs/redis.js';
import { apiRateLimit } from '../middleware/apiRateLimit.middleware.js';

const mockRedis = redis as any;

function makeReqRes(overrides: any = {}) {
  const req: any = {
    headers: {},
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

describe('apiRateLimit', () => {
  it('allows a request under the limit and sets the window expiry on the first hit', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    const { req, res } = makeReqRes();
    const next = vi.fn();

    await apiRateLimit(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(mockRedis.expire).toHaveBeenCalledWith(expect.stringContaining('api:ratelimit:'), 60);
    expect(res.statusCode).toBe(200);
  });

  it('does not reset the expiry on subsequent requests in the window', async () => {
    mockRedis.incr.mockResolvedValue(5);
    const { req, res } = makeReqRes();
    const next = vi.fn();

    await apiRateLimit(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(mockRedis.expire).not.toHaveBeenCalled();
  });

  it('returns 429 with Retry-After once the limit is exceeded', async () => {
    mockRedis.incr.mockResolvedValue(301);
    mockRedis.ttl.mockResolvedValue(42);
    const { req, res } = makeReqRes();
    const next = vi.fn();

    await apiRateLimit(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBe('42');
    expect(res.body.retryAfterSeconds).toBe(42);
  });

  it('keys by user id when the request is authenticated', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    const { req, res } = makeReqRes({ user: { id: 'user-123' } });
    const next = vi.fn();

    await apiRateLimit(req, res, next);

    expect(mockRedis.incr).toHaveBeenCalledWith('api:ratelimit:user:user-123');
  });

  it('keys by req.ip (trust-proxy-derived) when unauthenticated', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    const { req, res } = makeReqRes({ ip: '9.9.9.9' });
    const next = vi.fn();

    await apiRateLimit(req, res, next);

    expect(mockRedis.incr).toHaveBeenCalledWith('api:ratelimit:ip:9.9.9.9');
  });

  it('fails open (calls next) when Redis throws', async () => {
    mockRedis.incr.mockRejectedValue(new Error('ECONNREFUSED'));
    const { req, res } = makeReqRes();
    const next = vi.fn();

    await apiRateLimit(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });
});
