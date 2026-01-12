import { Queue } from 'bullmq';
import { redisConnection } from './redis.js';

// Export the Queue instance so the API can add to it
export const photoQueue = new Queue('photo-notifications', { 
  connection: redisConnection 
});