import { Queue } from 'bullmq';
import { redisConnection } from './redis.js';

export const photoQueue = new Queue('photo-notifications', {
  connection: redisConnection,
});

// Schedule daily cleanup of old read notifications.
// The 'repeat' option makes BullMQ re-add the job automatically after each run.
photoQueue.add(
  'cleanup-old-notifications',
  {},
  {
    repeat: { pattern: '0 3 * * *' }, // 3am daily
    jobId: 'cleanup-old-notifications', // stable ID prevents duplicate scheduled jobs on restart
  },
).catch(() => {}); // Non-fatal if scheduling fails (e.g., during tests)
