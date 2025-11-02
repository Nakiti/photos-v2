import http from "http";
import { PrismaClient } from "@prisma/client";
import app from "./server.js"; 

const prisma = new PrismaClient();

const server = http.createServer(app);

async function startServer() {
    try {
      // Optional: Test database connection on startup
      await prisma.$connect();
      console.log('Database connected successfully 🐘');
  
      server.listen(4000, () => {
        console.log(`🚀 Server listening on port ${4000}`);
      });
    } catch (error) {
      console.error('❌ Failed to connect to the database:', error);
      await prisma.$disconnect();
      process.exit(1); // Exit if DB connection fails
    }
  }
  
  startServer();
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await prisma.$disconnect();
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
