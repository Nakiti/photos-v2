import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ioredis so importing the module never opens a real connection. The mock
// constructor records the options it was handed so we can assert on them.
vi.mock('ioredis', () => {
  const Redis = vi.fn(function (this: any, opts: any) {
    this.options = opts;
  });
  return { Redis };
});

const REDIS_ENV_KEYS = [
  'REDIS_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_USERNAME',
  'REDIS_PASSWORD',
  'REDIS_TLS',
] as const;

// setup.ts sets REDIS_URL globally; clear all Redis env so each case starts clean.
function clearRedisEnv() {
  for (const k of REDIS_ENV_KEYS) delete process.env[k];
}

// Re-import the module fresh so buildRedisOptions() re-reads the current env.
async function loadConnection() {
  vi.resetModules();
  const mod = await import('../../libs/redis.js');
  return mod.redisConnection;
}

const original = { ...process.env };

beforeEach(() => {
  clearRedisEnv();
});

afterEach(() => {
  for (const k of REDIS_ENV_KEYS) {
    if (original[k] === undefined) delete process.env[k];
    else process.env[k] = original[k];
  }
});

describe('redis connection options', () => {
  it('parses REDIS_URL with credentials (no TLS for redis://)', async () => {
    process.env['REDIS_URL'] = 'redis://default:s3cr3t@cache.example.com:6380';
    const conn = await loadConnection();
    expect(conn.host).toBe('cache.example.com');
    expect(conn.port).toBe(6380);
    expect(conn.password).toBe('s3cr3t');
    expect(conn.username).toBe('default');
    expect(conn.tls).toBeUndefined();
  });

  it('enables TLS for a rediss:// URL', async () => {
    process.env['REDIS_URL'] = 'rediss://cache.example.com:6380';
    const conn = await loadConnection();
    expect(conn.tls).toEqual({});
    expect(conn.host).toBe('cache.example.com');
  });

  it('decodes percent-encoded credentials in REDIS_URL', async () => {
    process.env['REDIS_URL'] = 'rediss://user%40x:p%40ss@host:6379';
    const conn = await loadConnection();
    expect(conn.username).toBe('user@x');
    expect(conn.password).toBe('p@ss');
  });

  it('builds from discrete vars with password and TLS when REDIS_URL is unset', async () => {
    process.env['REDIS_HOST'] = 'redis.internal';
    process.env['REDIS_PORT'] = '6400';
    process.env['REDIS_PASSWORD'] = 'pw';
    process.env['REDIS_USERNAME'] = 'svc';
    process.env['REDIS_TLS'] = 'true';
    const conn = await loadConnection();
    expect(conn.host).toBe('redis.internal');
    expect(conn.port).toBe(6400);
    expect(conn.password).toBe('pw');
    expect(conn.username).toBe('svc');
    expect(conn.tls).toEqual({});
  });

  it('defaults to local host/port with no auth (dev parity)', async () => {
    const conn = await loadConnection();
    expect(conn.host).toBe('127.0.0.1');
    expect(conn.port).toBe(6379);
    expect(conn.password).toBeUndefined();
    expect(conn.username).toBeUndefined();
    expect(conn.tls).toBeUndefined();
  });
});
