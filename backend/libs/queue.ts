import { Queue } from 'bullmq';

// distinct connection object to be reused
export const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Export the Queue instance so the API can add to it
export const photoQueue = new Queue('photo-notifications', { 
  connection: redisConnection 
});