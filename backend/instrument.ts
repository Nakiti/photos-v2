// Sentry initialisation. This file MUST be imported before any other module
// (see the first line of index.ts) so the SDK can instrument the runtime before
// Express / Prisma / the worker load.
//
// Error tracking only: no performance tracing (tracesSampleRate: 0) and no
// source-map upload. When SENTRY_DSN is unset, the SDK is disabled and every
// Sentry.* call is a safe no-op — so dev/test need no Sentry config.
import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

dotenv.config();

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,
  // Error tracking only — performance/tracing is intentionally off.
  tracesSampleRate: 0,
});
