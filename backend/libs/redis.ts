import { Redis } from 'ioredis';

// Redis connection configuration
export const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Centralized Redis client instance for use across the application
export const redis = new Redis(redisConnection);

