// Sentry initialisation. Imported first in index.js so it runs before the app
// module (and its side effects) load. Error tracking only — no performance
// tracing. When SENTRY_ENABLED is false (dev, or no DSN set) every Sentry.* call
// is a safe no-op.
import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN, SENTRY_ENABLED } from './config/sentry';

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  // Error tracking only — performance/tracing is intentionally off.
  tracesSampleRate: 0,
});
