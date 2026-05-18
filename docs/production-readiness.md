# Production Readiness Assessment — Focal

Last updated: 2026-05-15 (post-hardening re-evaluation)

## Verdict: Closed Beta Ready — NOT Public Launch Ready

Security foundations are now solid. The app is stable enough for a closed TestFlight/internal beta with known users. What remains before a public launch is operational infrastructure (monitoring, CI/CD, health checks) and two newly-identified security gaps (avatar upload validation, user email exposure in search). Zero backend tests remain the biggest ongoing risk regardless of launch stage.

---

## What Is Working

- Photo upload pipeline (presigned S3, dual upload, thumbnail worker)
- JWT authentication with opaque refresh tokens (15-min access, 30-day refresh, rotation on use, revocation on logout and password reset)
- Auth rate limiting (10 attempts / 15 min on login, register, forgot/reset password)
- CORS locked to `ALLOWED_ORIGINS` env var
- Password policy: 8+ chars, uppercase + lowercase + digit required
- Full password reset flow (6-digit OTP, email delivery, Redis TTL, one-time use)
- Session revocation on password reset (all refresh tokens purged via per-user Redis set)
- Real-time events (Socket.IO, Redis pub/sub)
- Gallery/group CRUD + permission system (owner / admin / member)
- Push notifications (FCM, device token management, dedup, invalid token pruning)
- LIKE notifications (in-app record + FCM push with Redis dedup)
- WatermelonDB offline-first local cache with sync services
- Optimistic UI with conflict resolution via `clientId`
- Rate limiting on photo uploads (atomic Redis Lua, sliding window)
- File type allowlist + 50 MB cap on presign; presigned URL TTL 15 min
- Avatar presign: content-type + extension allowlist (jpeg/png/webp only)
- User search: email excluded from results; minimum 2-char search term required (no enumeration)
- Zod max-length constraints on all input schemas
- Global Express error handler (4-arg middleware)
- React error boundary wrapping the entire app tree
- Offline banner (NetInfo)
- Photo library + camera permission error handling
- Member mutations atomic (`prisma.$transaction` on all add/remove/join/leave)
- Denormalized counts transactional; daily reconciliation job as safety net
- Soft-delete orphan cleanup (PhotoLike + PhotoTag deleted with photo)
- `.well-known/apple-app-site-association` and `.well-known/assetlinks.json` served
- Firebase Admin: supports `FIREBASE_SERVICE_ACCOUNT_JSON` (base64) — no committed credential files needed
- React Navigation stack with auth gate
- All core screens (gallery, camera, profile, settings)

---

## Remaining Gaps

### 🔴 Security — Fix before any public traffic

No open items. All critical security gaps resolved.

### 🟡 Operational — Fix before sustained production traffic

| Gap | Detail |
|-----|--------|
| **No structured logging** | All logging via `console.*`. In production you cannot query logs, correlate requests, or set alert thresholds. Minimum: `pino` with JSON output + request ID middleware. |
| **No APM / error tracking** | No Sentry or equivalent on backend or frontend. Silent crashes and regressions are invisible. |
| **`/health` is shallow** | Returns `{ status: "ok" }` always. Load balancers and uptime monitors will report healthy even if MySQL, Redis, or S3 are unreachable. Add actual dependency pings. |
| **No CI/CD pipeline** | Manual deploys. Any deploy can break production without a gate. Minimum: lint + typecheck + migrate on PR; deploy-on-merge to staging. |
| **No staging environment** | Schema migrations and new features go untested before production. |
| **Zero backend tests** | The highest ongoing risk. Auth flows, permission matrices, upload lifecycle, and rate limiting are entirely unverified by automation. A refactor or dependency upgrade can silently break core flows. |
| **No `.env.example`** | No reference for required env vars. Onboarding a new developer or setting up CI requires reading source code. Risk: `.env` with real credentials gets committed. |

### 🟢 Minor / Deferred

| Gap | Detail |
|-----|--------|
| **JWT auth hits DB on every request** | `auth.middleware.ts` calls `prisma.user.findUnique` for every authenticated request to verify the user still exists. Adds 1–5 ms latency per request, multiplies DB load. Acceptable now; revisit under load. |
| **No secrets manager** | AWS credentials in `.env`; Firebase via env var (no file dependency). Secrets rotation and audit require AWS Secrets Manager / Vault — infrastructure task. |
| **`PhotoAttempt` orphan cleanup** | `deletePhoto` cleans up PhotoLike and PhotoTag but not PhotoAttempt records. Low data risk; deferred. |
| **No audit trail** | No `updatedBy` or audit log table. Needed for GDPR compliance at scale. |

---

## Incomplete Features

### Broken / No-op (visible to users)

| Feature | File | Notes |
|--------|------|-------|
| Photo download to device | `SingleImageScreen.tsx:242` | Button renders, no-op |
| Photo re-upload | `SingleImageScreen.tsx:246` | Button renders, no-op |
| Edit gallery permission | `EditPermissionScreen.tsx:29` | Screen exists, backend PATCH endpoint not exposed |

### Partially Implemented

| Feature | Status |
|--------|-------|
| Deep link invite flow | `.well-known` files ✅ served; `JoinGalleryScreen` + `JoinGroupScreen` ✅ functional; gallery/group name shown is from URL params (not a fresh API fetch — stale if name changed) |
| Community join approval | `MembershipStatus.PENDING` exists in schema; no API endpoint to approve/reject |
| `GalleryType.EVENT` | Schema field exists; treated identically to GROUP |
| Photo soft-delete recovery | Soft-delete + deleted-since endpoint exist; no recovery UI |

---

## Logging & Monitoring

All `console.*` — no structured logging, no correlation IDs, no log levels.

**Minimum before public launch:**
1. Add `pino` (or `winston`) with JSON output — structured logs that can be queried in CloudWatch / Datadog / Logtail
2. Add request ID middleware — correlate all log lines for a single request
3. Add Sentry to backend (`@sentry/node`) and React Native (`@sentry/react-native`) — catches unhandled exceptions and slow transactions
4. Fix `/health` to ping MySQL (`prisma.$queryRaw\`SELECT 1\``), Redis (`redis.ping()`), and S3 (HEAD on a known key)

---

## Testing

- **Backend:** Zero tests
- **Frontend:** 1 smoke test (`App.test.tsx`), tests nothing meaningful

**Minimum viable coverage:**
- Auth: register, login, refresh, logout, rate limit enforcement, password reset
- Permission matrix: owner / admin / member / non-member for each gallery operation
- Photo upload: presign → S3 PUT → confirm, idempotency, rate limit
- WatermelonDB migration integrity (no regression from v25 → v36)
- Sync conflict resolution in `photos.sync.ts`

---

## Infrastructure

- No Docker / docker-compose for local dev parity
- No CI/CD pipeline (GitHub Actions, etc.)
- No staging environment
- No deployment runbook (migration order, rollback procedure)
- No database backup schedule documented
- CloudFront: `CLOUDFRONT_BASE_URL` wired in `config.ts` but should be verified against actual distribution

---

## Priority Order (revised)

### Must fix before public traffic

1. ✅ Global Express error handler
2. ✅ Auth rate limiting
3. ✅ CORS locked to allowlist
4. ✅ Refresh token system (rotation, revocation, 401 interceptor)
5. ✅ `.well-known` deep link files served
6. ✅ Password reset flow
7. ✅ Password complexity policy
8. ✅ Session revocation on password reset
9. ✅ Firebase credential via env var (no committed files)
10. ✅ Avatar presign content-type validation (allowlist: jpeg/png/webp)
11. ✅ Remove email from user search results; require minimum 2-char search term
12. Add structured logging (pino) + request ID middleware
13. Integrate Sentry (backend + React Native)
14. Fix `/health` to check DB + Redis + S3
15. Add backend integration tests (auth, permissions, upload lifecycle)

### Fix within first sprint post-launch

16. ✅ `prisma.$transaction` on all member mutations
17. ✅ Soft-delete orphan cleanup (PhotoLike + PhotoTag)
18. ✅ Daily count reconciliation job
19. ✅ React error boundary
20. ✅ Offline banner + permission error handling
21. Implement community join approval API
22. Surface sync errors to user (toast / banner)
23. Dockerize backend + add CI/CD pipeline
24. Add `.env.example` with all required keys

### Backlog

25. Implement photo download to device
26. Expose edit-gallery-permission PATCH endpoint
27. Implement `GalleryType.EVENT` special handling
28. Add photo trash / recovery UI
29. Background upload (`react-native-background-fetch`)
30. 2FA (TOTP)
31. Audit log table (GDPR)
32. Secrets manager (AWS Secrets Manager / Vault)
33. Load testing + capacity planning
34. Remove DB lookup from JWT middleware (or add Redis cache) — revisit under load
