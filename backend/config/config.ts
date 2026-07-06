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

// Parse the Express `trust proxy` setting from TRUST_PROXY. Accepts a hop count
// ("1" → trust the first proxy), a boolean ("true"/"false"), or a comma list of
// trusted IPs/subnets (e.g. "loopback, 10.0.0.0/8"). Defaults to `false` — do
// not trust any proxy — which is the safe default for direct exposure / dev.
const parseTrustProxy = (raw?: string): boolean | number | string => {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  const n = Number(trimmed);
  if (Number.isInteger(n) && n >= 0) return n;
  return trimmed;
};

// Resolve the CORS origin allow-list. Fails CLOSED in production: if
// ALLOWED_ORIGINS is unset we throw rather than silently defaulting to '*',
// which would ship wide-open CORS to anyone who forgot the env var. In
// non-production environments an unset value falls back to '*' for convenience.
const resolveAllowedOrigins = (env: string): string[] => {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw) {
    return raw.split(',').map(o => o.trim()).filter(Boolean);
  }
  if (env === 'production') {
    throw new Error(
      'ALLOWED_ORIGINS must be set in production (refusing to default CORS to "*")',
    );
  }
  return ['*'];
};

const nodeEnv = getEnvVar('NODE_ENV');

const config = {
  env: nodeEnv,
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: getEnvVar('JWT_SECRET'),
  // Express `trust proxy` value. Set TRUST_PROXY to your real proxy hop count
  // (e.g. "1" behind a single load balancer) so req.ip is the true client IP
  // and not a spoofable X-Forwarded-For header. See parseTrustProxy above.
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  // Comma-separated list of allowed CORS origins. Required in production (see
  // resolveAllowedOrigins); falls back to '*' only in dev.
  allowedOrigins: resolveAllowedOrigins(nodeEnv),
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
  // Error tracking. Sentry is disabled when `dsn` is unset (the SDK init is
  // actually performed in instrument.ts, which reads these env vars directly so
  // it can run before any other module — these fields are for reference/reuse).
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
  },
};

export default config;