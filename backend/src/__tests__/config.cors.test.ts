import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// config.ts resolves the CORS allow-list at import time, so each case re-imports
// the module fresh with a tweaked environment.
const BASE_ENV = {
  JWT_SECRET: 'test-jwt-secret',
  DATABASE_URL: 'mysql://test:test@localhost:3306/test',
};

async function loadConfig(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const mod = await import('../../config/config.js');
  return mod.default;
}

const saved = { ...process.env };

beforeEach(() => {
  process.env = { ...saved, ...BASE_ENV };
});

afterEach(() => {
  process.env = { ...saved };
});

describe('config CORS allow-list (HARD-6)', () => {
  it('uses the configured origins when ALLOWED_ORIGINS is set', async () => {
    const config = await loadConfig({
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'https://a.com, https://b.com',
    });
    expect(config.allowedOrigins).toEqual(['https://a.com', 'https://b.com']);
  });

  it('throws in production when ALLOWED_ORIGINS is unset (fails closed)', async () => {
    await expect(
      loadConfig({ NODE_ENV: 'production', ALLOWED_ORIGINS: undefined }),
    ).rejects.toThrow(/ALLOWED_ORIGINS must be set in production/);
  });

  it('falls back to "*" in non-production when unset', async () => {
    const config = await loadConfig({ NODE_ENV: 'development', ALLOWED_ORIGINS: undefined });
    expect(config.allowedOrigins).toEqual(['*']);
  });
});
