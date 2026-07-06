# Deployment & Operations — Focal Backend

How to build, run, containerize, and ship the Express/Prisma backend. Covers
the scripts added for production start/build (MISSING-1), the Docker setup
(MISSING-2), and the CI pipeline (MISSING-3).

> The backend runs its TypeScript **directly via `tsx`** — there is no
> compile-to-`dist` step. `npm run build` is a build-time *gate*
> (`prisma generate` + type-check), not a bundler. The production process is
> `tsx index.ts` (`npm start`).

---

## 1. Runtime requirements

| Component | Version |
|-----------|---------|
| Node.js   | **22 LTS** (pinned in `backend/.nvmrc`; `engines.node >=20`). Prisma 6 and the lint toolchain require Node ≥ 18; Node 16 is **not** supported for build/lint. |
| MySQL     | 8.x |
| Redis     | 7.x (used for rate limiting, refresh tokens, the Socket.IO adapter, and BullMQ) |

Local dev that only runs the backend test suite can still use older Node
(Vitest 0.34.6 runs on 16–22), but build/lint/CI use Node 22.

```bash
cd backend
nvm use            # picks up .nvmrc → Node 22
```

---

## 2. Environment variables

Copy `backend/.env.example` and fill it in. The app **fails loudly on boot**
if `NODE_ENV` or `JWT_SECRET` are missing (see `config/config.ts`).

| Variable | Required | Notes |
|----------|----------|-------|
| `NODE_ENV` | ✅ | `production` / `development` / `test`. App throws if unset. |
| `JWT_SECRET` | ✅ | Strong random secret. App throws if unset. **Do not** reuse the dev value. |
| `DATABASE_URL` | ✅ | `mysql://user:pass@host:3306/db` |
| `REDIS_URL` | prod-preferred | Single connection string, e.g. `rediss://default:pass@host:6380`. Use the `rediss://` scheme for TLS. Takes precedence over the discrete vars below — the normal way to wire a managed Redis (ElastiCache/Upstash/Redis Cloud). |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_USERNAME` / `REDIS_PASSWORD` / `REDIS_TLS` | ✅ (prod, if no `REDIS_URL`) | Discrete fallback. Host/port default to `127.0.0.1:6379`; `REDIS_TLS=true` enables TLS. Good for local dev. |
| `ALLOWED_ORIGINS` | ✅ (prod) | Comma-separated CORS allowlist. Defaults to `*` if unset — **set it in production**. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `AWS_S3_BUCKET` | ✅ | S3 media storage. Inject via a secrets manager; never bake into the image. |
| `CLOUDFRONT_BASE_URL` | optional | Stable CDN URLs; falls back to direct S3 URLs if unset. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | prod-preferred | **base64** of the service-account JSON. Preferred over `FIREBASE_SERVICE_ACCOUNT_PATH` (no file to mount). Falls back to ADC if neither is set. |
| `LOG_LEVEL` | optional | `info` by default (pino). |

Secrets must come from the environment / a secrets manager. `.env` is
git-ignored and excluded from the Docker image (`.dockerignore`).

---

## 3. npm scripts (`backend/`)

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `nodemon --exec tsx index.ts` | Local hot-reload dev server |
| `npm start` | `tsx index.ts` | **Production process** (binds `0.0.0.0:4000`) |
| `npm run build` | `prisma generate && tsc -p tsconfig.build.json` | Build gate: generate client + type-check app code (tests excluded) |
| `npm run typecheck` | `tsc -p tsconfig.build.json` | Type-check app code only |
| `npm run prisma:generate` | `prisma generate` | Regenerate the Prisma client |
| `npm run migrate:deploy` | `prisma migrate deploy` | Apply pending migrations (**production**) |
| `npm run migrate:dev` | `prisma migrate dev` | Create/apply migrations (dev only) |
| `npm test` | `vitest run` | Unit tests (fully mocked — no DB/Redis needed) |

---

## 4. Database migrations

Migrations live in `backend/prisma/migrations/`. **Apply them as a separate
release step**, before rolling new app instances — never on container start
in a multi-replica deployment (concurrent `migrate deploy` calls race).

```bash
# Release step (run once per deploy, from a single job):
cd backend
npm run migrate:deploy
```

`prisma migrate deploy` only applies committed migrations and never generates
new ones or prompts — it is safe for CI/CD.

**Rollback:** Prisma has no automatic down-migrations. To roll back, deploy a
new forward migration that reverses the change, or restore from a database
backup taken immediately before the release. Take a backup before every
migration that drops or alters columns.

---

## 5. Docker

### Build the image

```bash
docker build -t focal-backend ./backend
```

The image (`backend/Dockerfile`):
- Base `node:22-bookworm-slim` + OpenSSL (Prisma requirement).
- Installs **production** deps only (`npm ci --omit=dev`) — which include
  `tsx`, `sharp`, `@prisma/client`, and the `prisma` CLI, so the same image
  serves traffic **and** can run `migrate:deploy`.
- Runs `prisma generate` at build time.
- Runs as the non-root `node` user.
- Declares a `HEALTHCHECK` against `/health` (liveness — see §8).

### Run

```bash
docker run --rm -p 4000:4000 --env-file ./backend/.env focal-backend
# migrations (separate step, same image):
docker run --rm --env-file ./backend/.env focal-backend npm run migrate:deploy
```

### Local dev parity (compose)

`docker-compose.yml` (repo root) brings up MySQL + Redis + the backend, wired
together, and applies migrations on start (single-instance dev convenience):

```bash
docker compose up --build
# backend → http://localhost:4000  (GET /health)
```

Compose reads secrets from `backend/.env` (`env_file`) and overrides
`DATABASE_URL` / `REDIS_HOST` to point at the compose services.

> Verified statically with `docker compose config`. The image build itself was
> **not** run in this environment (no Docker daemon available at authoring
> time) — run `docker build ./backend` once in CI/locally to confirm.

---

## 6. CI (`.github/workflows/ci.yml`)

Runs on pushes to `main` and all PRs, on Node 22.

| Job | Gating? | Steps |
|-----|---------|-------|
| **backend** | ✅ blocking | `npm ci` → `prisma generate` → `npm run typecheck` → `npm test` |
| **backend-audit** | advisory (`continue-on-error`) | `npm audit --omit=dev` — tighten to blocking once HARD-7 is resolved |
| **frontend** | advisory (`continue-on-error`) | `npm ci` → `tsc --noEmit` → `npm run lint` → `npm test` |

The frontend job is advisory because of known pre-existing issues (the
untracked member-invite screen leaves 2 type errors, and there is a backlog of
~104 lint errors). Lint itself runs correctly under Node 22; the previous
"crash" was only Node 16 lacking `structuredClone`.

**Recommended branch protection:** require the **backend** check; treat the
advisory jobs as informational until their underlying issues are cleared.

---

## 8. Health & readiness endpoints

| Endpoint | Purpose | Checks | Status codes |
|----------|---------|--------|--------------|
| `GET /health` | **Liveness** — is the process up? | none (cheap) | always `200` |
| `GET /ready` | **Readiness** — can it serve traffic? | MySQL (`SELECT 1`), Redis (`PING`), S3 (`HeadObject` on a probe key) | `200` if all pass, else `503` |

`/ready` returns a per-dependency breakdown so failures are diagnosable:

```json
{ "status": "degraded",
  "checks": { "database": { "ok": true },
              "redis": { "ok": false, "error": "ECONNREFUSED" },
              "s3": { "ok": true } } }
```

Each check has a 2–3s timeout so a hung dependency can't hang the probe. The S3
check treats a `404`/`NotFound` as healthy (bucket reachable, creds valid — the
probe key just doesn't exist), so it works with `s3:GetObject`-only IAM.

**Wire it up:** container `HEALTHCHECK` → `/health` (don't kill the pod on a
dependency blip); load-balancer / orchestrator readiness probe → `/ready`.

Logic lives in `backend/libs/health.ts`; covered by `src/__tests__/health.test.ts`.

## 9. Error tracking (Sentry)

Error tracking is wired on both apps (errors only — **no** performance tracing
and **no** source-map upload yet; see the upgrade note below).

**Backend (`@sentry/node`)**
- `backend/instrument.ts` calls `Sentry.init()` and is imported on the very
  first line of `index.ts` (before any other module). Disabled (safe no-op)
  when `SENTRY_DSN` is unset.
- Captures: unhandled exceptions/rejections (default integrations), Express
  errors ≥ 500 (`Sentry.setupExpressErrorHandler` in `server.ts`), and BullMQ
  job failures (`worker.on('failed', …)` in `photo.worker.ts`). Buffered events
  are flushed on graceful shutdown.
- Config via env: `SENTRY_DSN` (enable/disable), `SENTRY_ENVIRONMENT`
  (defaults to `NODE_ENV`), `SENTRY_RELEASE`.

**Frontend (`@sentry/react-native`)**
- DSN lives in `frontend/src/config/sentry.ts` (a Sentry DSN is a *publishable*
  client key, safe to commit). `SENTRY_ENABLED` is `!__DEV__ && DSN set`, so it
  only reports from release builds. Paste the project DSN there to enable.
- `Sentry.init()` runs first via `frontend/src/sentry.ts` (imported first in
  `index.js`); `App` is wrapped with `Sentry.wrap()`; the existing
  `ErrorBoundary` reports render crashes; `apiClient` reports 5xx/network errors.
- iOS needs `pod install` (autolinking). Android autolinks with no Gradle change.

**Upgrade path (not done):** source-map / native-symbol upload (so production
stack traces are readable) needs the Sentry Metro + Gradle plugins, Xcode
build-phase changes, and a `SENTRY_AUTH_TOKEN` in CI. Performance tracing (APM)
is off (`tracesSampleRate: 0`) — raise it to sample transactions.

## 10. Production checklist (still open)

These are tracked in `PRODUCTION_READINESS.md` and are **not** addressed here:

- HARD-1 — rotate the AWS key currently in `backend/.env`; move secrets to a
  manager.
- HARD-7 — resolve dependency vulnerabilities, then make the audit job blocking.
