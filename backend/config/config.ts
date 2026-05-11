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
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: getEnvVar('JWT_SECRET'),
  // Comma-separated list of allowed CORS origins. Use '*' only in development.
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['*'],
  // Deep link asset config — required for iOS Universal Links and Android App Links
  deepLink: {
    iosTeamId: process.env.IOS_TEAM_ID || '',
    iosBundleId: process.env.IOS_BUNDLE_ID || 'com.focal.app',
    androidPackage: process.env.ANDROID_PACKAGE || 'com.focal.app',
    androidSha256Cert: process.env.ANDROID_SHA256_CERT || '',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    s3Bucket: process.env.AWS_S3_BUCKET,
  },
  cloudfront: {
    baseUrl: process.env.CLOUDFRONT_BASE_URL,
  },
};

export default config;