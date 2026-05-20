import http from "http";
import { PrismaClient } from "@prisma/client";
import httpServer from "./server.js";
import "./src/workers/photo.worker.js";
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
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down');
    await prisma.$disconnect();
    server.close(() => {
      logger.info('HTTP server closed');
    });
  });
