// Sentry configuration for the React Native app.
//
// A Sentry DSN is a *publishable* client key (safe to ship in the app bundle),
// so it lives here as a constant rather than behind a native env system. Paste
// the project's DSN below to enable error reporting in release builds.
export const SENTRY_DSN = '';

// Only report from release builds — never from __DEV__ (avoids Metro/dev noise).
// Stays disabled until a DSN is provided.
export const SENTRY_ENABLED = !__DEV__ && SENTRY_DSN.length > 0;
