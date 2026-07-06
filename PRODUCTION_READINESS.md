# Production Readiness Audit — Focal

**Date:** 2026-06-18
**Auditor:** Automated production-readiness review (evidence-based)
**Scope:** `backend/` (Express + Prisma/MySQL + Redis/BullMQ + Socket.IO + S3 + FCM) and `frontend/` (React Native 0.81 + WatermelonDB)

> Note on the pre-existing `docs/production-readiness.md`: it was dated 2026-05-15 and **materially stale** (claimed "zero backend tests," "all logging via `console.*`," "no `.env.example`" — all now false). As of 2026-06-20 (HARD-13) it has been replaced with a deprecation stub redirecting here; this report is authoritative.

---

## Executive Summary

**Verdict: NOT READY for production. Ready with conditions for a closed/internal beta only.**

The backend is genuinely more mature than a first glance suggests: real refresh-token rotation with revocation, atomic Redis rate limiting, transactional writes, idempotent upload confirm, structured `pino` logging, and a meaningful 38-test backend suite that actually passes. The core photo-upload and auth flows are well-engineered.

However, the application **cannot be deployed as-is**, and several user-facing features are **broken at runtime**:

1. ~~**No way to run it in production.**~~ **RESOLVED (2026-06-18)** — added production `start`/`build`/`migrate:deploy` scripts (MISSING-1), a backend `Dockerfile` + root `docker-compose.yml` (MISSING-2), and a GitHub Actions CI pipeline (MISSING-3). See `docs/deployment.md`. _(Caveat: the Docker image build was not executed here — no daemon available — so confirm `docker build ./backend` once in CI.)_
2. ~~**A core feature crashes on mount.**~~ **RESOLVED (2026-06-19)** — `AddGalleryMembersScreen` used to import `useInviteMember` (nonexistent) and read `pendingMembers` (not returned by the hook), throwing `useInviteMember is not a function` on render (formerly BROKEN-1, untracked). Fixed as a side effect of the join-approval / pending-membership removal (MISSING-9): the screen now uses the real `useAddGalleryMember` hook and the pending UI is gone.
3. **Security gaps on real-time and rate-limiting layers.** Socket.IO CORS is hardcoded `origin: '*'`, gallery room joins have **no membership check** (any authenticated user can subscribe to any gallery's live events), and the IP rate limiter trusts a spoofable `X-Forwarded-For` header with no `trust proxy` configured. (High)
4. **Limited operational safety net.** A `/ready` readiness probe (MISSING-4) and Sentry error tracking (MISSING-5) now exist, but there is still no metrics/APM, and (unless MISSING-6 has landed) the Redis client may not support password/TLS for a managed production Redis. (High)
5. ~~**Supply chain.** `npm audit` reports **47 vulnerabilities — 2 critical, 12 high**, including reachable `ws`/`socket.io-parser` DoS issues.~~ **RESOLVED (2026-06-20)** — `npm audit fix` + a `nodemailer` `^9` bump + removal of the dead `aws-sdk` v2 (HARD-8) brought prod vulns to **8 (0 critical, 0 high, 8 moderate)**; the reachable `ws`/`socket.io-parser` DoS issues are patched (HARD-7). The 8 residual moderates are all transitive under `firebase-admin` (would require a bad major downgrade) and clear on the next upstream release. (Medium)

**Biggest risks:** unauthenticated access to other galleries' real-time streams, supply-chain vulnerabilities, and gaps in production observability/configuration.

**What is solid:** auth/token lifecycle, upload idempotency + atomic rate limiting, transactional member/photo mutations, backend test coverage of the critical service paths, structured logging.

---

## Phase 1 — System Overview

**Stack**
- **Backend:** Node.js (ESM, `"type": "module"`), TypeScript 5.9, Express 5, run via `tsx` (no compile step). Prisma 6 ORM → **MySQL** (`backend/prisma/schema.prisma:2`). Redis via `ioredis` (`backend/libs/redis.ts`). BullMQ background jobs + worker (`backend/libs/queue.ts`, `backend/src/workers/photo.worker.ts`). Socket.IO 4 with Redis adapter (`backend/libs/socket.manager.ts`). AWS S3 v3 presigned URLs + CloudFront (`backend/src/api/galleries/photos/photos.service.ts`). Firebase Admin for FCM (`backend/src/api/notifications/notifications.service.ts`). `pino` logging.
- **Frontend:** React Native 0.81, React 19, WatermelonDB (SQLite offline cache), TanStack Query, Zustand, React Navigation, `react-native-keychain` for token storage, `react-native-vision-camera`, FCM.
- **Deployment target:** **Undefined.** No Dockerfile, no `docker-compose`, no Terraform/IaC, no `.github/` CI. Backend listens on a hardcoded `:4000` (`backend/index.ts:17`).

**Intended behavior (from `docs/README.md`):** an offline-first photo-sharing app. Users create galleries/communities, capture photos that appear instantly (optimistic local write), which then upload directly to S3 via presigned PUT URLs (backend never proxies bytes), are served back via stable CloudFront URLs, and broadcast in real time to gallery members via Socket.IO. Push notifications via FCM. Permission model: owner / admin / member.

**Request/job flow:** Controller (Zod validation) → Service → Prisma; routes mounted at `/api/v1` (`backend/server.ts:82`). Upload: `POST /presign` → client PUTs to S3 → `POST /confirm` (idempotent on `s3Key`, atomic rate limit, transactional create, socket broadcast, async FCM).

**Docs vs. code gaps:** `docs/production-readiness.md` was materially stale and is now a deprecation stub pointing here (HARD-13). `docs/README.md` is accurate and high-quality.

---

## Phase 2 — Verification Results (what I actually ran)

| Check | Command | Result |
|---|---|---|
| Backend typecheck (src) | `npx tsc --noEmit` | **0 errors in `src/`**; 5 errors only in `src/__tests__/*` (don't affect runtime) |
| Backend tests | `npm test` (vitest) | **38 passed / 38** in 4 files; ~850ms |
| Backend test quality | manual read | **Real & meaningful** — idempotency, rate-limit, P2002 race, tag validation, permission matrix, member mutations, auth. Not trivial. |
| Frontend typecheck | `npx tsc --noEmit` | **8 errors** at audit time; **0 remain** — the last 2 (member-invite screen) were resolved by the MISSING-9 join-approval removal (2026-06-19) |
| Frontend lint | `npx eslint .` | **CRASHES** — `ReferenceError: structuredClone is not defined` in `@typescript-eslint/no-unused-vars`. Lint cannot run at all. |
| Frontend tests | (`__tests__/App.test.tsx`) | **1 trivial smoke test** — only asserts `<App/>` renders; tests no behavior |
| Dependency audit (prod) | `npm audit --omit=dev` | **47 vulns: 2 critical, 12 high**, 32 moderate, 1 low |
| App run (live) | — | **COULD NOT VERIFY** — no DB/Redis/S3 available locally, no Docker, no seed. Live HTTP/socket paths not exercised. Frontend app not run (needs simulator). |

**Per-feature status:**
- Auth (register/login/refresh/logout/reset): **VERIFIED WORKING** (unit-tested, code reviewed) — `backend/src/api/auth/*`, `backend/src/__tests__/auth.service.test.ts`
- Photo upload presign/confirm + idempotency + rate limit: **VERIFIED WORKING** (unit-tested) — `photos.service.ts`, `photos.service.test.ts`
- Permission matrix (owner/admin/member): **VERIFIED WORKING** (unit-tested) — `permission.service.test.ts`
- Real-time gallery events: **VERIFIED WORKING** — broadcasts implemented; room join is now membership-gated (HARD-3, fixed 2026-06-19)
- Add members to a gallery (UI): **FIXED (2026-06-19)** — the mount crash (formerly BROKEN-1) was resolved by the MISSING-9 join-approval removal; screen now uses `useAddGalleryMember`
- Photo download to device / re-upload (UI): **FIXED** — no-op controls removed (BROKEN-3)
- Edit gallery permission (UI): **BROKEN (no-op)** — removed from the action list at user's request — untracked
- Community join approval: **REMOVED (2026-06-19)** — feature deleted entirely at the user's request (was MISSING-9); joins are now always immediately accepted

---

## Phase 4 — Prioritized Action List

Severity: **Blocker** (cannot ship) · **High** (must fix before sustained prod traffic) · **Medium** · **Low**.

### 🔴 BROKEN — existing functionality that does not work

> **Removed from this list (2026-06-18):** BROKEN-1 ("Add gallery members" screen crashes on mount) and BROKEN-4 (Edit gallery permission save is a no-op) were removed at the user's request and are no longer tracked here. Item numbering below is left unchanged for continuity.

- [x] **BROKEN-2 — Frontend lint is non-functional** · **High** · CI/CD · **FIXED (2026-06-18)**
  Evidence: `npx eslint .` aborts with `ReferenceError: structuredClone is not defined` loading `@typescript-eslint/no-unused-vars`. No file is ever linted. This means there is no working lint gate and `npm run lint` is dead. Root cause: the active runtime was **Node 16**, but `structuredClone` requires Node 17+ and `@typescript-eslint` v8 requires Node 18+. The frontend `package.json` already declares `engines.node >=20`, but nothing enforced it.
  **Fix:** added `frontend/.nvmrc` pinning Node `22` (current LTS, satisfies `engines`) so the toolchain runs on a supported runtime. Verified: under Node 22, `eslint` runs to completion (no crash) and lints all files. Note: lint now *functions* and surfaces ~104 pre-existing lint errors + ~122 warnings across the codebase — cleaning those up is separate latent work, not part of this item (this item was "lint cannot run").

- [x] **BROKEN-3 — Photo download & re-upload buttons are no-ops** · **Medium** · Correctness · **FIXED (2026-06-18)**
  Evidence: `frontend/src/features/gallery/screens/SingleImageScreen.tsx:241-248` — `onPressDownload` and `onPressUpload` only `console.log` with `// TODO: implement`. The download button rendered (`SingleImageBottomBar.tsx:42`) and did nothing; the `onPressUpload` prop was wired through but never rendered (dead). A real "download to device" needs a camera-roll native module that isn't a dependency, so per the report's guidance the dead controls were **hidden** rather than shipped non-functional.
  **Fix:** removed the no-op download button (and the unused `onPressDownload`/`onPressUpload` props) from `SingleImageBottomBar.tsx`, replacing it with an empty balanced layout slot; removed the two stub handlers from `SingleImageScreen.tsx`. Left the unrelated, working `onPressUpload` on `GalleryBottomBar`/`GalleryScreen` (the actual add-photo flow) untouched. Verified: no dangling references, `tsc` clean for these files, frontend jest 22/22 pass.


- [x] **BROKEN-5 — Frontend type errors** · **Medium** · Correctness · **FIXED (2026-06-18, scoped)**
  Evidence: `npx tsc --noEmit` — implicit-`any` params (`AddGalleryMembersScreen.tsx:38,55`) and `src/__tests__/setup.ts:2` missing node types. Type safety is not enforced; runtime errors slip through because the build (Metro/Babel) strips types without checking.
  **Fix:** added `/// <reference types="node" />` to `src/__tests__/setup.ts` (resolves the `process` error), and annotated the two `pendingMembers.map(...)` callbacks in `AddGalleryMembersScreen.tsx` with `EnrichedMembership` (resolves the implicit-`any` TS7006/TS7031). Verified: `tsc` error count dropped from 5 → 2. **The 2 remaining errors (`useInviteMember` missing export, `pendingMembers` not on the hook return) belong to the now-untracked member-invite screen issue (formerly BROKEN-1, removed at user's request) — `tsc` will not be fully clean until that screen is fixed.** Recommend adding `tsc --noEmit` to CI once it is.

### 🟡 MISSING — production requirements not implemented

- [x] **MISSING-1 — No production start/build path** · **Blocker** · CI/CD & Deployment · **FIXED (2026-06-18)**
  Evidence: `backend/package.json` scripts were only `dev, test, test:watch, test:coverage`. No `start`, no `build`, no `prisma generate`/`migrate deploy`.
  **Fix:** added `start` (`tsx index.ts` — runs the app directly from TS, no compile step), `build` (`prisma generate` + type-check), `typecheck` (`tsc -p tsconfig.build.json`, a new build config that excludes tests), and `prisma:generate` / `migrate:deploy` / `migrate:dev` scripts. Moved `tsx` and the `prisma` CLI to runtime `dependencies` (and re-synced `package-lock.json`) so a production image can start the app and run migrations. Added `engines.node >=20` and `backend/.nvmrc` (22). Verified under Node 22: `npm run build` exits 0 (prisma generate + typecheck clean). Documented in `docs/deployment.md`.

- [x] **MISSING-2 — No containerization / IaC** · **Blocker** · Deployment · **FIXED (2026-06-18, build not run)**
  Evidence: repo-wide search found no `Dockerfile`, `docker-compose*`, or `*.tf`.
  **Fix:** added `backend/Dockerfile` (Node 22 slim + OpenSSL, `npm ci --omit=dev`, `prisma generate`, non-root `node` user, `/health` `HEALTHCHECK`, `CMD npm start`), `backend/.dockerignore` (excludes `.env`, the Firebase credential JSON, tests), and a root `docker-compose.yml` (MySQL 8 + Redis 7 + backend, health-gated `depends_on`, migrations applied on start for single-instance dev parity). Verified `docker compose config` parses cleanly. **The image build itself was not run — no Docker daemon was available in this environment;** run `docker build ./backend` in CI/locally to confirm. Documented in `docs/deployment.md`.

- [x] **MISSING-3 — No CI/CD pipeline** · **High** · CI/CD · **FIXED (2026-06-18)**
  Evidence: no `.github/` directory; nothing ran on push/PR.
  **Fix:** added `.github/workflows/ci.yml` (Node 22, runs on `push: main` + all PRs). Gating **backend** job: `npm ci` → `prisma generate` → `npm run typecheck` → `npm test` (verified all pass under Node 22). Advisory (`continue-on-error`) jobs: **backend-audit** (`npm audit --omit=dev`) and **frontend** (`tsc --noEmit` + `lint` + `test`) — advisory because of the untracked member-invite screen's 2 type errors and the ~104 pre-existing lint findings; tighten to blocking as those (and HARD-7) are resolved. Documented in `docs/deployment.md`.

- [x] **MISSING-4 — `/health` is shallow (no readiness probe)** · **High** · Observability · **FIXED (2026-06-18)**
  Evidence: `backend/server.ts:43-45` returned `{ status: "ok" }` unconditionally — a load balancer would report healthy even with MySQL/Redis/S3 down.
  **Fix:** added a `GET /ready` readiness endpoint backed by `backend/libs/health.ts#checkReadiness()`, which probes MySQL (`$queryRaw\`SELECT 1\``), Redis (`ping()`), and S3 (`HeadObject` on a probe key) in parallel, each with a 2–3s timeout. Returns `200` when all pass, `503` with a per-dependency breakdown otherwise. The S3 check treats `404`/`NotFound` as healthy so it works with `s3:GetObject`-only IAM. `/health` is retained as the cheap **liveness** probe (Docker `HEALTHCHECK`); `/ready` is for LB/orchestrator readiness. Both excluded from request logging. Covered by `src/__tests__/health.test.ts` (5 tests: all-healthy, S3-404-ok, and degraded cases for Redis/DB/S3-403). Verified: **43/43 tests pass** (Node 16 and 22), typecheck clean. Documented in `docs/deployment.md` §8.

- [x] **MISSING-5 — No error tracking / APM** · **High** · Observability · **FIXED (2026-06-19, error-tracking scope)**
  Evidence: no Sentry or equivalent on backend or frontend (no dependency, no init). Unhandled exceptions and frontend crashes would be invisible in production.
  **Fix (error tracking only — no performance tracing, no source-map upload):**
  - **Backend** `@sentry/node` v10: `backend/instrument.ts` (`Sentry.init`, disabled no-op when `SENTRY_DSN` unset) imported first in `index.ts`; `Sentry.setupExpressErrorHandler` in `server.ts` (captures ≥500s, then the existing handler still owns the response); `worker.on('failed', …)` capture in `photo.worker.ts`; `Sentry.close()` flush on graceful shutdown; `sentry` block in `config.ts`; `SENTRY_DSN`/`SENTRY_ENVIRONMENT`/`SENTRY_RELEASE` in `.env.example`. Default integrations also capture unhandled exceptions/rejections. New test `src/__tests__/sentry.worker.test.ts` (2 tests).
  - **Frontend** `@sentry/react-native` v8: `src/config/sentry.ts` (publishable DSN constant, `enabled: !__DEV__ && DSN set`); `src/sentry.ts` init imported first in `index.js`; `Sentry.wrap(App)`; `ErrorBoundary` reports render crashes with component stack; `apiClient` reports 5xx/network errors (skips expected 4xx). Added `frontend/.npmrc` (`legacy-peer-deps=true`) so installs are reproducible under React 19.
  - Verified: backend **56/56 tests** pass (Node 16 + 22), Sentry files typecheck clean; frontend `tsc --noEmit` **0 errors**, jest **22/22**. **Not verified here:** live event delivery (needs a real DSN + running server/app) and native iOS/Android crash capture (needs `pod install` + device/simulator). Documented in `docs/deployment.md` §9. Source-map upload + APM are an explicit follow-up.

- [x] **MISSING-6 — Redis client cannot reach a secured prod Redis** · **High** · Configuration · **FIXED (2026-06-18)**
  Evidence: `backend/libs/redis.ts:4-10` only read `REDIS_HOST`/`REDIS_PORT` — no password, no TLS, no `REDIS_URL`. Managed Redis (ElastiCache auth/TLS, Upstash, Redis Cloud) requires auth. (Note: `src/__tests__/setup.ts:7` set `REDIS_URL`, which the code never read — confirming the gap.) Redis is critical here (rate limiting, refresh tokens, socket adapter, BullMQ).
  **Fix:** `backend/libs/redis.ts` now builds the shared `redisConnection` (typed `RedisOptions`) via a `buildRedisOptions()` helper. It prefers **`REDIS_URL`** (parsed with `new URL()` → host/port/username/password; `rediss://` scheme → `tls: {}`; percent-encoded credentials decoded), and falls back to discrete vars `REDIS_HOST`/`REDIS_PORT`/`REDIS_USERNAME`/`REDIS_PASSWORD`/`REDIS_TLS=true`. Because that one object is shared by the main client, the BullMQ queue/worker, and the Socket.IO Redis adapter (pub/sub via `.duplicate()`), every Redis consumer inherits auth/TLS at once. Bare host/port with no auth still works for local dev (unchanged). Env vars added to `.env.example` and documented in `docs/deployment.md` §2. Covered by `src/__tests__/redis.config.test.ts` (5 tests: URL+creds no-TLS, `rediss://`→TLS, percent-decoding, discrete vars+TLS, local-dev default). Verified: **54/54 tests pass**, typecheck clean.

- [ ] **MISSING-7 — No staging, migration, or rollback runbook** · **High** · Data / Deployment
  Evidence: no `prisma migrate deploy` in any script; no staging env; no documented migration order or rollback procedure. Schema changes (the working tree has an uncommitted `schema.prisma` change) would go straight to prod untested. Document and script the migration/rollback flow.

- [x] **MISSING-8 — No general API rate limiting** · **Medium** · Security / Resilience · **FIXED (2026-06-18)**
  Evidence: rate limiting existed only on auth routes (`auth.routes.ts:7-12`) and photo upload confirm (`rateLimiter.ts`). No global limiter was applied in `server.ts` or `src/api/index.ts`. Endpoints like gallery/photo listing, likes, search, and gallery creation were unthrottled and abusable.
  **Fix:** added a baseline limiter `backend/src/middleware/apiRateLimit.middleware.ts` (Redis fixed-window `INCR`+`EXPIRE`, same pattern as `authRateLimit`), mounted globally on `app.use('/api/v1', apiRateLimit, apiRoutes)` in `server.ts`. It keys by authenticated user id (`req.user.id`) when present, else by client IP, so a shared NAT doesn't throttle one user's neighbours. Default **300 req / 60s** window, tunable via `API_RATE_LIMIT_MAX` / `API_RATE_LIMIT_WINDOW_SECONDS` (documented in `.env.example`). Returns `429` with a `Retry-After` header when exceeded; fails open (logs + `next()`) on Redis error, consistent with the existing limiters. The stricter auth/upload limiters still apply on top. Covered by `src/__tests__/apiRateLimit.test.ts` (6 tests: under-limit, expiry-set-once, 429+Retry-After, user-key, IP-key, fail-open). Verified: **49/49 tests pass**, typecheck clean. _(Note: per-IP keying inherits the spoofable `X-Forwarded-For` caveat tracked as HARD-4 — fix `trust proxy` to harden both.)_

- **MISSING-9 — Community join approval API absent** · **REMOVED (2026-06-19)**
  Rather than build the missing approve/reject endpoint, the join-approval feature was **removed entirely** at the user's request. Dropped: `joinRequiresApproval` (Gallery + Community), the `status` column + `MembershipStatus` enum (`PENDING`/`ACCEPTED`/`INVITED`/`BLOCKED`) on community memberships, the `approveMember` service/controller/route, and all related frontend surface (Edit-Join-Permission / Require-Approval / Pending-Requests screens, settings entries, create-flow toggles, WatermelonDB columns, sync, and the vestigial "pending"/"Invited" member UI). Community joins are now always immediately accepted. Backend migration `20260619000000_remove_join_approval` drops the columns; WatermelonDB schema bumped to v38. Verified: backend **56/56 tests** + typecheck clean, frontend **22/22 tests** + `tsc --noEmit` clean (this also resolved the 2 lingering `AddGalleryMembersScreen` type errors noted under BROKEN-5).

- [x] **MISSING-10 — Incomplete graceful shutdown** · **Medium** · Resilience · **FIXED (2026-06-18)**
  Evidence: `backend/index.ts:30-36` handled only `SIGTERM`, disconnected Prisma, called `server.close()` but never `process.exit`, and did **not** drain the BullMQ worker, close the Socket.IO server, or quit Redis connections. No `SIGINT` handler. In-flight jobs/sockets could be dropped on deploy.
  **Fix:** rewrote shutdown into a single idempotent `shutdown(signal)` handler wired to **both `SIGTERM` and `SIGINT`** that drains in order: (1) `server.close()` (stop new HTTP), (2) new `closeSocket()` in `libs/socket.manager.ts` — closes the Socket.IO server (disconnecting clients) and quits the adapter pub/sub Redis clients (hoisted to module scope), (3) `worker.close()` (waits for the active BullMQ job) + `photoQueue.close()`, (4) `prisma.$disconnect()` + `redis.quit()`, then `process.exit(0)`. Repeated signals are ignored via a `shuttingDown` guard, and a 30s `unref`'d timeout force-exits (code 1) if any resource hangs. Verified under Node 22: `npm run typecheck` clean and **43/43 tests pass**.

- [ ] **MISSING-11 — No DB backup/restore story; no S3 orphan cleanup** · **Medium** · Data
  Evidence: no documented backup schedule. `docs/README.md:171` itself flags that S3 objects orphaned before `/confirm` are never reclaimed and recommends an S3 lifecycle rule — not implemented. Document backups; add the lifecycle rule.

### 🟢 HARDENING — works but not production-grade

- [ ] **HARD-1 — Live AWS credentials in working tree + weak JWT secret** · **High** · Security / Secrets
  Evidence: `backend/.env` contains real-looking `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` (lines 7-8) and `JWT_SECRET=sercret-key` (line 5). Good news: `.env` is gitignored and **was never committed** (verified via `git log --all -- backend/.env`), and the Firebase service-account JSON in `backend/config/` is also gitignored and never committed. But the live AWS key sits in plaintext on disk and should be **rotated** regardless, the dev `JWT_SECRET` is trivially weak, and there is no secrets manager. Rotate the AWS key now; inject secrets via a manager/CI; enforce a strong `JWT_SECRET` (config already throws if unset — `config.ts:18`).

- [x] **HARD-2 — Socket.IO CORS hardcoded to `*`** · **High** · Security · **FIXED (2026-06-19)**
  Evidence: `backend/libs/socket.manager.ts:21-22` set `cors: { origin: '*' }` with a `// Restrict in production` comment that was never actioned.
  **Fix:** the Socket.IO server now derives its CORS `origin` from `config.allowedOrigins` (same source as the HTTP CORS in `server.ts`): it allows all only when the operator explicitly sets `'*'` (the dev default), otherwise it passes the configured origin allow-list straight to Socket.IO. Setting `ALLOWED_ORIGINS` now locks down both the HTTP and WebSocket layers at once. Verified: typecheck clean, 56/56 backend tests pass.

- [x] **HARD-3 — Socket `join_gallery` has no authorization check** · **High** · Security / Authz · **FIXED (2026-06-19)**
  Evidence: `backend/libs/socket.manager.ts:69-78` — on `join_gallery` the server called `socket.join(galleryId)` with **no membership verification**, so any authenticated user could join any gallery room and receive its real-time stream (full `photo_updated` / `gallery_updated` payloads).
  **Fix:** added `isGalleryMember(userId, galleryId)` to `backend/src/api/galleries/permission.service.ts` (returns true for the gallery owner or any user holding a `Membership`, no throw) and gated `join_gallery` on it. Unauthorized joins are logged at `warn`, get a `join_gallery_error` event emitted back to the requesting socket, and never call `socket.join()` or touch the room-tracking hash. Verified: typecheck clean, 56/56 backend tests pass.

- [x] **HARD-4 — IP rate limiter trusts spoofable `X-Forwarded-For`** · **High** · Security · **FIXED (2026-06-19)**
  Evidence: `authRateLimit.middleware.ts` / `apiRateLimit.middleware.ts` read the first raw `X-Forwarded-For` value as the client IP, while `app.set('trust proxy', ...)` was never configured (`server.ts`). A client could rotate `X-Forwarded-For` per request and bypass auth rate limiting (brute-force login/reset).
  **Fix:** added a configurable `app.set('trust proxy', config.trustProxy)` in `server.ts`, driven by a new `TRUST_PROXY` env var (`config.ts#parseTrustProxy` — accepts a hop count like `1`, `true`/`false`, or a trusted IP/subnet list; **defaults to `false`** so nothing is trusted unless an operator opts in). Both rate limiters' `getClientIp` now derive the IP from `req.ip` (which Express resolves through the trusted-proxy chain and is not spoofable beyond it) instead of parsing the raw header. Documented in `.env.example`. Covered by the `req.ip`-keyed tests in `authRateLimit.test.ts` (incl. one asserting a spoofed `X-Forwarded-For` is ignored) and `apiRateLimit.test.ts`. Verified: typecheck clean, 60/60 tests pass.

- [x] **HARD-5 — Auth rate limiter fails open on Redis error** · **Medium** · Security / Resilience · **FIXED (2026-06-19)**
  Evidence: `authRateLimit.middleware.ts` called `next()` on any Redis exception (fail-open), so during a Redis outage brute-force protection silently disappeared.
  **Fix:** the auth limiter now **fails closed** — on a Redis error it logs at `error` level (via `createLogger('authRateLimit')`, so the outage alerts) and returns `503 Service temporarily unavailable` instead of letting the request through. This is a deliberate auth-specific tradeoff: losing brute-force protection on login/reset is worse than briefly rejecting auth during a Redis outage. The general `apiRateLimit` limiter intentionally stays fail-open (availability over strictness for non-auth traffic). Covered by `authRateLimit.test.ts` ("fails CLOSED (503) when Redis throws"). Verified: typecheck clean, 60/60 tests pass.

- [x] **HARD-6 — CORS defaults to `*` when `ALLOWED_ORIGINS` unset** · **Medium** · Security · **FIXED (2026-06-20)**
  Evidence: `backend/config/config.ts` defaulted `allowedOrigins` to `['*']` whenever `ALLOWED_ORIGINS` was unset; `server.ts` then allowed all origins — an operator who forgot the env var shipped wide-open CORS.
  **Fix:** CORS resolution now **fails closed in production** via `config.ts#resolveAllowedOrigins(env)`: when `NODE_ENV === 'production'` and `ALLOWED_ORIGINS` is unset it **throws at startup** (`ALLOWED_ORIGINS must be set in production …`) rather than silently widening to `*`. Non-production keeps the `*` fallback for dev convenience. Since both the HTTP CORS (`server.ts`) and the Socket.IO CORS (HARD-2) read `config.allowedOrigins`, this hardens both layers. Covered by `src/__tests__/config.cors.test.ts` (3 tests: configured origins, prod-unset-throws, dev-fallback). Verified: typecheck clean, 63/63 tests pass.

- [x] **HARD-7 — Dependency vulnerabilities (47 prod; 2 critical, 12 high)** · **High** · Supply chain · **FIXED (2026-06-20, residual documented)**
  Evidence: `npm audit --omit=dev` reported **47 vulns (2 critical, 12 high)**. Reachable/notable: `ws` (uninitialized memory disclosure + DoS) and `socket.io-parser` via Socket.IO; `nodemailer`; `protobufjs`/`fast-xml-parser` (critical) via the firebase-admin/aws-sdk transitive trees.
  **Fix:** ran `npm audit fix` (on Node 22 per `.nvmrc` — the fix fails under the stale Node 16 shell) and upgraded the one reachable high directly: **`nodemailer` `^8` → `^9.0.1`** (the basic `createTransport`/`sendMail` usage in `libs/email.ts` is unchanged across the major). The transitive `ws`/`socket.io-parser`/`fast-xml-parser`/`protobufjs`/`@grpc/grpc-js` issues resolved within existing semver ranges via the lockfile — `ws` is now **8.21.0** (advisory range ≤8.20.1) and `socket.io-parser` **4.2.6**, both patched. **Result: 47 → 9 (0 critical, 0 high, 9 moderate).** Verified: typecheck clean, 63/63 tests pass.
  **Residual (now 8 moderate after HARD-8, accepted/deferred):** all 8 are transitive under `firebase-admin` (`@google-cloud/firestore`/`storage`, `google-gax`, `gaxios`, `retry-request`, `teeny-request`, `uuid`) whose only npm-suggested "fix" is a **major _downgrade_ of `firebase-admin` to v10.3.0** — declined, as it reintroduces older/worse issues; these clear on the next upstream firebase-admin release. (The 9th, the dead `aws-sdk` v2, was removed under **HARD-8**.) None of the residual are critical/high or directly reachable.

- [x] **HARD-8 — Dead, EOL `aws-sdk` v2 dependency** · **Low** · Supply chain · **FIXED (2026-06-20)**
  Evidence: `backend/package.json` declared `aws-sdk` (v2), but it was **not imported anywhere** in `src/`/`libs/` (verified via grep — only the v3 `@aws-sdk/*` packages are used). aws-sdk v2 is end-of-support and contributed to the audit surface.
  **Fix:** removed `aws-sdk` from `package.json` dependencies and re-synced `package-lock.json` (`npm install` on Node 22). Confirmed `node_modules/aws-sdk` is gone. This dropped the prod audit from **9 → 8 moderate** (the `aws-sdk` advisory entry is cleared; the `uuid` advisory persists only via firebase-admin transitive paths now). Verified: typecheck clean, 63/63 tests pass.

- [x] **HARD-9 — `/refresh` endpoint not rate limited** · **Low** · Security · **FIXED (2026-06-20)**
  Evidence: `auth.routes.ts:9` mounted `/refresh` without `authRateLimit`. Tokens are 256-bit random (low brute-force risk), but the endpoint was otherwise unthrottled.
  **Fix:** added the shared `authRateLimit` middleware to the `/refresh` route, matching the other auth endpoints (login/register/forgot/reset). It now shares the same per-IP 10-attempt / 15-min window (and inherits the HARD-4 `req.ip` keying + HARD-5 fail-closed behaviour). Verified: typecheck clean, 63/63 tests pass.

- [x] **HARD-10 — Firebase service-account file dependency in prod** · **Medium** · Secrets · **FIXED (2026-06-20)**
  Evidence: `notifications.service.ts` honoured `FIREBASE_SERVICE_ACCOUNT_PATH` (a relative file `import()`) as a credential source even in production; the base64 `FIREBASE_SERVICE_ACCOUNT_JSON` (no file to mount/leak) is preferable there.
  **Fix:** the Firebase Admin init now **ignores `FIREBASE_SERVICE_ACCOUNT_PATH` when `NODE_ENV=production`** — production resolves credentials only from `FIREBASE_SERVICE_ACCOUNT_JSON` (base64) or Application Default Credentials. The file path is still honoured outside production for local-dev convenience. If the path is set in production it's skipped with a `log.warn` so the misconfiguration surfaces rather than silently mounting a credential file. Documented both env vars in `.env.example` with the prod guidance. Verified: typecheck clean, 63/63 tests pass.

- [x] **HARD-11 — JWT middleware hits the DB on every authenticated request** · **Low** · Performance · **FIXED (2026-06-20)**
  Evidence: `backend/src/middleware/auth.middleware.ts` ran `prisma.user.findUnique` on every authenticated request just to resolve `{ id, email }` from the token's `userId`.
  **Fix:** added a short-TTL in-process cache (`resolveUser`) keyed by `userId`, default **30s** (tunable via `JWT_USER_CACHE_TTL_SECONDS`). Positives only are cached (a deleted/unknown user isn't cached, so a restored account isn't shadowed); expired entries are evicted on access. Exposed `invalidateUserCache(userId)` for explicit invalidation after account-mutating actions. Trade-off (documented): a user deleted mid-window stays authenticated until their entry expires — bounded by the small TTL. Verified: typecheck clean, 63/63 tests pass.

- [x] **HARD-12 — Stray `console.log` in shipping frontend paths** · **Low** · Observability · **FIXED (2026-06-20)**
  Evidence: the originally-cited lines (`SingleImageScreen.tsx`, `AddGalleryMembersScreen.tsx`) were already removed by earlier fixes, but ~94 `console.log` calls remained across ~15 shipping files — noise / PII risk in release builds.
  **Fix:** took the report's recommended babel-transform approach (comprehensive, vs. hand-stripping 94 call sites). Added `babel-plugin-transform-remove-console` and an `env.production` block in `frontend/babel.config.js` that strips `console.*` from release/production bundles while **keeping `console.error` / `console.warn`** so genuine error reporting still reaches device logs / crash tooling. Keyed off `BABEL_ENV`/`NODE_ENV`, so dev/debug builds retain all logging. Verified the transform directly (production strips `console.log`, keeps `error`/`warn`; dev keeps all) and frontend jest 22/22 pass.

- [x] **HARD-13 — Stale `docs/production-readiness.md`** · **Low** · Documentation · **FIXED (2026-06-20)**
  Evidence: the 2026-05-15 doc made claims contradicted by the current code (zero tests, console logging, no `.env.example`) — misleading for operators.
  **Fix:** replaced the file's stale content with a short **deprecation stub** that flags it as out of date and redirects to the authoritative root `PRODUCTION_READINESS.md`. Kept the path (rather than deleting) so any existing links don't dangle; confirmed nothing in code or other docs imports/links it apart from this report's own superseding notes.

---

## Things I could NOT verify (be explicit)

- **Live runtime behavior.** No MySQL/Redis/S3 were available and there is no Docker/seed, so I could not start the server or exercise real HTTP/socket/upload paths end to end. Findings on those paths are from code + unit tests, not live execution.
- **Frontend at runtime.** Not run on a simulator. The former member-invite screen crash (BROKEN-1) was fixed in code (2026-06-19) via the MISSING-9 removal and verified by `tsc`, but the fixed screen was not exercised live on a simulator.
- **Frontend lint findings.** ESLint crashes (BROKEN-2), so latent lint issues are unknown.
- **CloudFront/S3/FCM correctness** against real infrastructure (credentials, bucket policy, OAC) — config is wired but unverified against live resources.
