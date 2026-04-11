# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

**Focal** is a photo-sharing app with a React Native frontend and Express.js backend.

- **Frontend**: React Native (RN 0.81) + WatermelonDB (SQLite) as local cache/offline DB, Zustand for global auth state, TanStack Query for server state, React Navigation for routing.
- **Backend**: Express.js v5, Prisma ORM with MySQL, Socket.IO for real-time events, BullMQ + Redis for background jobs, AWS S3 with presigned URLs for media.
- **Real-time**: Socket.IO connects frontend → backend. Sync hooks (e.g. `useGallerySocket`) subscribe to room events and call the appropriate `.sync.ts` service.
- **Push notifications**: Firebase Admin SDK on backend, `@react-native-firebase/messaging` on frontend.

**"Groups" and "Communities" are the same concept** — used interchangeably throughout the codebase.

## Development Commands

### Backend (`/backend`)
```bash
npm run dev          # Start with nodemon (tsx, hot reload)
```
Backend runs on port 4000. Requires `.env` with `DATABASE_URL` and Redis/S3 credentials.

### Frontend (`/frontend`)
```bash
npm start            # Start Metro bundler
npm run ios          # Build and run on iOS simulator
npm run android      # Build and run on Android emulator
npm run lint         # ESLint
npm test             # Jest
npx jest path/to/test.ts   # Run a single test file
```

First-time iOS setup:
```bash
bundle install
bundle exec pod install
```

### Database
```bash
npx prisma migrate dev       # Apply migrations in dev
npx prisma generate          # Regenerate Prisma client after schema changes
npx prisma studio            # GUI browser for the database
```

The frontend WatermelonDB schema is versioned in `frontend/src/db/schema.ts` (currently v32). Add migrations in `frontend/src/db/migrations.ts` whenever the schema changes.

## Key Patterns

### Backend: Controller → Service → Prisma
All API endpoints follow: `controller` validates with Zod → calls `service` → service uses Prisma. Validation schemas live in `*.validation.ts` alongside the controller. Error handling uses the pattern already in the controllers — do not introduce new patterns.

Routes are mounted at `/api/v1` in `server.ts`. Each domain (galleries, groups, users, auth, notifications) has its own subdirectory under `backend/src/api/`.

### Frontend: Optimistic UI + Sync
1. Write to WatermelonDB first (optimistic, instant UI).
2. Queue API call or upload.
3. On success, confirm/update the local record; on failure, roll back or mark error.

**All WatermelonDB writes must go through `database.write()` with batch operations** — never write outside a batch. Photo upload status lifecycle: `queued → uploading → sync_pending → synced`.

### Frontend: API Calls
Follow `frontend/src/services/api/photos.service.ts` — use `apiClient` (Axios instance in `services/apiClient.ts`), which auto-handles 401 by clearing auth and disconnecting socket.

### Frontend: Sync Services
Each entity has a `*.sync.ts` in `frontend/src/services/sync/`. Sync functions take the WatermelonDB `database` instance and remote API data, batch-fetch local records first to avoid N+1 queries, then apply creates/updates/deletes in a single `database.write()` batch.

### Data Hooks
Custom hooks in `frontend/src/hooks/` wrap WatermelonDB `observe()` queries and return live-updating observables. Data hooks (e.g. `useGalleryData`, `usePhotoData`) are the primary way screens access data — avoid querying WatermelonDB directly in components.

### Background Jobs (Backend)
BullMQ queues (`libs/queue.ts`, `libs/thumbnail.queue.ts`) + Redis. Workers run in `backend/src/workers/photo.worker.ts`. A daily cleanup cron runs at 3am via BullMQ repeat.

## Data Model Overview

Core Prisma models: `User`, `Gallery`, `Community`, `Membership`, `CommunityMembership`, `Photo`, `Tag`, `PhotoTag`, `Notification`, `Device`.

- A `Gallery` belongs to a `Community` (optional) and has type `GROUP` or `EVENT`.
- Gallery permissions: `addPermission`, `deletePermission`, `editPermission`, `joinRequiresApproval`.
- `Photo` upload flow uses presigned S3 URLs — backend generates URL, client PUTs directly to S3, client confirms with backend.

## Frontend Structure

```
frontend/src/
  db/           WatermelonDB schema, migrations, models
  features/     Screen components grouped by domain (gallery, groups, auth, camera, profile)
  hooks/        Data and socket hooks
  navigation/   Stack and tab navigators; RootStack handles auth gate
  services/
    api/        API call functions (one file per domain)
    sync/       WatermelonDB sync functions (one file per domain)
    apiClient.ts  Axios instance (base URL, 401 interceptor)
    socketClient.ts  Socket.IO client
  stores/       auth.store.ts (Zustand — isAuthenticated, user)
  theme/        Colors, typography
  types/        Shared TypeScript types
```

## Conventions

- Functional components and hooks only — no class components.
- TypeScript strict — avoid `any` unless absolutely necessary.
- Never introduce new error handling patterns — follow existing ones.
- New API endpoints follow the existing controller/service/validation pattern.
- `Groups` and `Communities` are the same thing — don't rename existing usages.
