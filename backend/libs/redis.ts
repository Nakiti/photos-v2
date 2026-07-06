import { Redis, type RedisOptions } from 'ioredis';

// Builds the shared ioredis connection options. Prefers a single REDIS_URL
// (how managed Redis — ElastiCache, Upstash, Redis Cloud — is normally provided;
// use the rediss:// scheme for TLS), and falls back to discrete vars so local dev
// keeps working with a bare host/port and no auth.
function buildRedisOptions(): RedisOptions {
  const url = process.env.REDIS_URL;
  if (url) {
    const u = new URL(url);
    const opts: RedisOptions = {
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 6379,
    };
    if (u.password) opts.password = decodeURIComponent(u.password);
    if (u.username) opts.username = decodeURIComponent(u.username);
    // rediss:// signals a TLS connection.
    if (u.protocol === 'rediss:') opts.tls = {};
    return opts;
  }

  const opts: RedisOptions = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  };
  if (process.env.REDIS_PASSWORD) opts.password = process.env.REDIS_PASSWORD;
  if (process.env.REDIS_USERNAME) opts.username = process.env.REDIS_USERNAME;
  if (process.env.REDIS_TLS === 'true') opts.tls = {};
  return opts;
}

// Shared connection options — also consumed by the BullMQ queue/worker and the
// Socket.IO Redis adapter, so auth/TLS support here covers every Redis consumer.
export const redisConnection: RedisOptions = buildRedisOptions();

// Centralized Redis client instance for use across the application
export const redis = new Redis(redisConnection);
