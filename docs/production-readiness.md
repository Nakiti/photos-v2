# Production Readiness Assessment — Focal

Last updated: 2026-05-11

## Verdict: NOT Production Ready

The core data model, upload pipeline, real-time infrastructure, and mobile UI are solid. The gaps are in error handling, security hardening, testing, monitoring, and several incomplete user-facing flows. These are fixable but non-trivial.

---

## What Is Working

- Photo upload pipeline (presigned S3, dual upload, thumbnail worker)
- JWT authentication (bcrypt, Passport.js)
- Real-time events (Socket.IO, Redis pub/sub)
- Gallery/group CRUD + permission system
- Push notifications (FCM, device token management)
- WatermelonDB offline-first local cache with sync services
- Optimistic UI with conflict resolution via `clientId`
- Rate limiting on photo uploads (atomic Redis Lua, sliding window)
- React Navigation stack with auth gate
- All core screens (gallery, camera, profile, settings)

---

## Incomplete Features

### Broken / No-op

| Feature | File | Notes |
|--------|------|-------|
| Photo download to device | `SingleImageScreen.tsx:242` | Button exists, no-op |
| Photo re-upload | `SingleImageScreen.tsx:246` | Button exists, no-op |
| Edit gallery permission | `EditPermissionScreen.tsx:29` | Screen exists, backend PATCH endpoint not exposed |
| Forgot password | `LoginScreen.tsx:32` | Button exists, no-op, no reset flow |

### Partially Implemented

| Feature | Status |
|--------|-------|
| Deep link invite flow | URL scheme + navigation wired, but `.well-known/apple-app-site-association` and `.well-known/assetlinks.json` not served; join screens show placeholder instead of entity details |
| LIKE notifications | `PhotoLike` model exists, like endpoint works, but no notification is created for the photo uploader |
| Community join approval | `MembershipStatus.PENDING` exists in schema but no API endpoint to approve/reject pending community joins |
| `MembershipStatus.BLOCKED` | Never set anywhere in the codebase |
| `GalleryType.EVENT` | Schema field exists, no special handling (treated same as GROUP) |
| Photo soft-delete recovery | Soft-delete + deleted-since endpoint exist, no recovery UI |

---

## Security Gaps

### P0 — Blockers

- **No auth rate limiting** — `/login` and `/register` can be brute-forced with no lockout
- **CORS set to `'*'`** — must be locked to specific frontend origins before production
- **No CSRF protection** — state-changing requests have no CSRF token
- **No token refresh** — 7-day JWTs never refresh; no revocation on password change or logout

### P1 — Critical

- **Weak password policy** — 8-char minimum only; no complexity requirements
- **No server-side file type/size validation** — presigned URL generation doesn't enforce content type or max file size
- **Presigned URL TTL** — upload TTL should be verified (15min recommended)
- **No input length limits** — gallery names, descriptions, tags unbounded in Zod schemas
- **Firebase service account in `backend/config/`** — should use environment variable or secrets manager, not a committed file path

### P2 — Important

- **Session not revoked on user events** — deleting account or changing password doesn't invalidate existing JWTs
- **Notification payload typed as `any`** — `data: data ? (data as any) : null` in `notifications.service.ts`
- **No secrets manager** — AWS credentials in `.env`, Firebase credentials in file path

---

## Error Handling Gaps

- **No global Express error middleware** — unhandled errors return inconsistent responses; uncaught promise rejections can crash the server
- **All catch blocks return generic 500** — no error codes, no distinction between validation / auth / business / database errors
- **FCM failures silent** — notification send errors are logged but not retried or alerted on
- **Frontend sync errors not surfaced** — failed syncs leave the app in an inconsistent state with no user feedback
- **No React error boundary** — a render crash in any screen crashes the whole app

---

## Logging & Monitoring

- Only `console.log` / `console.error` throughout — no structured logging, no log levels, no correlation IDs
- No APM (Sentry, Datadog, New Relic)
- No metrics (upload success rate, notification delivery, sync latency)
- No crash reporting on mobile
- `/health` endpoint exists but doesn't check DB, Redis, or S3 connectivity

**Minimum before production:**
1. Replace `console.*` with `winston` or `pino` (structured JSON, log levels)
2. Add request ID middleware for tracing
3. Add Sentry to both backend and React Native frontend
4. Add readiness checks to `/health` (DB ping, Redis ping, S3 head)

---

## Testing

- **Frontend:** 1 smoke test (`App.test.tsx`), tests nothing meaningful
- **Backend:** Zero tests
- **No integration tests, no API contract tests, no E2E tests**

**Minimum viable test coverage:**
- Auth flow (register, login, token validation, rate limit)
- Permission matrix (admin vs member vs non-member for each operation)
- Photo upload flow (presign → confirm, rate limit enforcement)
- Sync conflict resolution logic in `photos.sync.ts`
- WatermelonDB migration integrity

---

## Database Gaps

- **No atomic transactions** on multi-step operations (gallery create + default tag, ownership transfer)
- **`memberCount` / `photoCount` can go stale** — not updated transactionally with the records they reflect
- **Soft-delete orphans** — deleting a photo leaves `PhotoLike`, `PhotoTag`, `PhotoAttempt` records without cleanup
- **No audit trail** — no `updatedBy` or audit log table; required for GDPR compliance
- **MySQL lacks partial indexes** — all queries must manually filter `deletedAt IS NULL`; risk of accidental data exposure if missed

---

## Infrastructure Gaps

- No Docker / docker-compose for backend
- No CI/CD pipeline
- No staging environment
- No deployment runbook (migrations, rollback procedure)
- CloudFront documented in `docs/README.md` but not wired in `config.ts` (`CLOUDFRONT_BASE_URL` exists but needs verification)
- No database backup strategy documented

---

## Mobile-Specific Gaps

- ✅ Offline mode indicator — `OfflineBanner` component uses NetInfo, shown above all screens
- ✅ React error boundary — `ErrorBoundary` wraps the entire app tree; renders a "Try again" screen on uncaught render errors; logs to console (`componentDidCatch`)
- ✅ Photo library permission errors — `useImagePicker` hook centralises all 7 `launchImageLibrary` callsites; `errorCode === 'permission'` shows Alert with "Open Settings" link
- Camera permission already handled — `CameraScreen` has `hasPermission`/`permissionDenied` states with "Grant Permission" / "Open Settings" UI

- **Deferred (requires native install):** Background photo upload — needs `react-native-background-fetch` or `react-native-background-actions`
- **Deferred (requires native install):** Crash reporting — needs `@sentry/react-native` with Xcode/Gradle configuration

---

## Priority Order

### P0 — Must fix before any production traffic

1. ✅ Add global Express error handler middleware
2. ✅ Add rate limiting on `/login` and `/register`
3. ✅ Lock CORS to specific origins (via `ALLOWED_ORIGINS` env var)
4. ✅ Implement JWT refresh token flow (opaque tokens in Redis, 30-day TTL, rotation on use)
5. ✅ Serve `.well-known/apple-app-site-association` and `.well-known/assetlinks.json` (configure via `IOS_TEAM_ID`, `IOS_BUNDLE_ID`, `ANDROID_PACKAGE`, `ANDROID_SHA256_CERT` env vars)

### P1 — Fix before public launch

6. Add structured logging (winston/pino) + request ID middleware
7. Integrate Sentry (backend + React Native)
8. Implement password reset flow (email token → hash new password)
9. Add backend integration tests for auth + permissions + uploads
10. ✅ Add React error boundary to `RootStack`
11. ✅ Validate file type and size server-side before presigning (contentType allowlist; optional fileSize max 50 MB; TTL reduced 30 min → 15 min)
12. ✅ Add Zod max-length constraints to all text input schemas (auth, galleries, groups, users, photos, search queries)
13. ✅ Wire LIKE notification on photo like (already implemented in `likePhoto()` — in-app record + FCM push with Redis dedup)

### P2 — Fix within first sprint post-launch

14. Add Prisma transactions to gallery create and ownership transfer
15. Add cleanup job for soft-delete orphans (likes, tags, attempts)
16. Implement community join approval API
17. Surface sync errors to the user (toast / banner)
18. Add readiness checks to `/health`
19. Dockerize backend + add CI/CD pipeline
20. ✅ Add camera/library permission error handling screens

### P3 — Backlog

21. Implement photo download to device
22. Expose edit-gallery-permission PATCH endpoint
23. Implement `GalleryType.EVENT` special behavior
24. Add photo trash / recovery UI
25. Background upload support
26. 2FA (TOTP)
27. Audit log table for GDPR compliance
28. Load testing + capacity planning
