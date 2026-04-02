# Focal — Codebase Guide

## Architecture
React Native frontend with WatermelonDB (SQLite) as local database.
Express.js backend with Prisma ORM and PostgreSQL.
Socket.IO for real-time sync.
AWS S3 with presigned URLs for media storage.
Branch.io for deep linking.
Groups and Communities refer to the same things

## Key Patterns
All database writes go through database.write() with batch operations.
API calls follow the pattern in services/api/photos.service.ts.
Sync operations follow services/sync/photos.sync.ts.
Optimistic UI — create local WatermelonDB record first, then upload.
Upload queue handles offline — status: queued -> uploading -> synced

## Conventions
Functional components and hooks only — no class components.
TypeScript strict — avoid any unless absolutely necessary.
Never introduce new error handling patterns — follow existing ones.
New API endpoints follow existing controller/service/validation pattern.