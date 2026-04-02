// src/config/config.ts
import dotenv from 'dotenv';
import path from 'path';

// Helper function to get required env vars or throw error
const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const config = {
  env: getEnvVar('NODE_ENV'),
  port: process.env.PORT || 3000, // Default port if not specified
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: getEnvVar('JWT_SECRET'),
  aws: { 
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    s3Bucket: process.env.AWS_S3_BUCKET,
  },
  branch: {
    key: process.env.BRANCH_IO_KEY,
  },
  // Add other configurations as needed
};

export default config;