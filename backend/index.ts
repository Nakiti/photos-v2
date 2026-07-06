// Must be first — initialises Sentry before any other module loads.
import "./instrument.js";
import * as Sentry from "@sentry/node";
import http from "http";
import { PrismaClient } from "@prisma/client";
import httpServer from "./server.js";
import { worker } from "./src/workers/photo.worker.js";
import { photoQueue } from "./libs/queue.js";
import { closeSocket } from "./libs/socket.manager.js";
import { redis } from "./libs/redis.js";
import { logger } from "./libs/logger.js";

const prisma = new PrismaClient();

const server = httpServer

async function startServer() {
    try {
      // Optional: Test database connection on startup
      await prisma.$connect();
      logger.info('database connected');

      server.listen(4000, '0.0.0.0', () => {
        logger.info({ port: 4000 }, 'server listening');
      });
    } catch (error) {
      logger.error({ err: error }, 'database connection failed');
      await prisma.$disconnect();
      process.exit(1); // Exit if DB connection fails
    }
  }
  
  startServer();

  // Graceful shutdown: stop accepting new work, drain in-flight work, then exit.
  const SHUTDOWN_TIMEOUT_MS = 30_000;
  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return; // ignore repeated signals
    shuttingDown = true;
    logger.info({ signal }, 'shutting down gracefully');

    // Force-exit if a resource hangs so the orchestrator doesn't wait forever.
    const forceExit = setTimeout(() => {
      logger.error('graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      // 1. Stop accepting new HTTP connections.
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
      logger.info('HTTP server closed');

      // 2. Close Socket.IO (disconnects clients, quits adapter Redis clients).
      await closeSocket();

      // 3. Drain the BullMQ worker (waits for the active job to finish) and the queue.
      await worker.close();
      await photoQueue.close();
      logger.info('worker and queue closed');

      // 4. Disconnect Prisma and quit the shared Redis client.
      await prisma.$disconnect();
      await redis.quit();
      logger.info('database and redis connections closed');

      // 5. Flush any buffered Sentry events (no-op if Sentry is disabled).
      await Sentry.close(2000);

      clearTimeout(forceExit);
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'error during graceful shutdown');
      clearTimeout(forceExit);
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
