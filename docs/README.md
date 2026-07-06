# Focal — Architecture & Design Notes

> **Build, run & deploy the backend:** see [`deployment.md`](./deployment.md)
> (npm scripts, Docker, docker-compose, CI).

## Infrastructure

### AWS

The app uses a single AWS service: **S3** for media storage.

**Bucket structure**
```
focal-media-prod/
  photos/{galleryId}/{fileId}.jpg
  thumbnails/{galleryId}/{fileId}.jpg
  avatars/{userId}-{uuid}{ext}
  icons/{galleryId}-{uuid}.jpg
  community-icons/{groupId}/{uuid}.png
```

**Required IAM permissions** (scoped to bucket only)
```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
  "Resource": "arn:aws:s3:::focal-media-prod/*"
}
```

**Bucket config**: Block all public access enabled. Objects are private. Access is served via CloudFront (see below).

**Environment variables**
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION=us-east-2
AWS_S3_BUCKET=focal-media-prod
CLOUDFRONT_BASE_URL=https://cdn.focal.app
```

---

### CloudFront

CloudFront sits in front of S3 as a CDN. S3 stays fully private — CloudFront is the only entity that can read from it, via Origin Access Control (OAC).

**Why CloudFront instead of presigned GET URLs**

Presigned GET URLs expire (24h–7d), rotate on every sync, and break FastImage's disk cache because FastImage uses the full URL as its cache key. When the URL changes, the old cached image is orphaned and the new URL requires a network fetch — killing offline image viewing.

CloudFront URLs are permanent and stable for the lifetime of an object. FastImage caches them by URL normally, and offline viewing works indefinitely from the device's disk cache.

```
Presigned GET:  App → expiring signed URL → S3 (us-east-2)
CloudFront:     App → stable CDN URL → nearest edge → S3 (on cache miss only)
```

**Setup steps**
1. Create a CloudFront distribution pointed at the S3 bucket as origin
2. Enable OAC — grants CloudFront read access to S3, revoke all other access
3. Set a cache policy (photos never change after upload → 1-year TTL is appropriate)
4. Optionally attach a custom domain + ACM SSL certificate
5. Set `CLOUDFRONT_BASE_URL` in backend config

**How it changes the backend**

Instead of generating presigned GET URLs, the backend constructs stable CloudFront URLs from the S3 key:

```typescript
// Before
const url = await getSignedUrl(s3, new GetObjectCommand({ Key }), { expiresIn: 86400 });

// After
const url = `${config.cloudfront.baseUrl}/${key}`;
```

Presigned PUT URLs (for upload) are unchanged — clients still upload directly to S3.

---

### Firebase

Firebase Cloud Messaging (FCM) handles push notifications. AWS SNS was not chosen because SNS routes Android notifications through FCM anyway and adds an abstraction layer with no benefit. FCM is free, purpose-built for mobile, and the standard choice for React Native.

---

## Photo Upload Flow

```
ACTORS
──────
 App (RN)          Backend            S3              CloudFront       BullMQ/Redis      WatermelonDB
    │                  │               │                   │                │                  │

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 1 — OPTIMISTIC (instant, works offline)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 User picks photo
    │ resize to display thumb
    │ copy to Documents dir
    │─────────────────────────────────────────────────────────────────────────────►write record
    │                                                                               status=queued
    │                                                                               localUri
    │                                                                               localThumbnailUri
    │
    │ Gallery renders immediately using localThumbnailUri ◄────────────────────────observe()


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 2 — UPLOAD (requires network)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Upload queue picks up queued record
    │ resize full + thumb images
    │
    │──POST /presign──────────────►│
    │                              │ generate presigned
    │                              │ PUT URL (S3 signs it)
    │◄─{ presignedUrl, s3Key }─────│
    │                              │
    │──PUT full image─────────────────────────────────►│  (direct, bypasses backend)
    │──PUT thumbnail──────────────────────────────────►│
    │
    │──POST /confirm──────────────►│
    │  { s3Key,                    │ create Photo row
    │    thumbnailKey,             │ s3Url       = https://cdn.focal.app/photos/…
    │    tagIds }                  │ thumbnailUrl = https://cdn.focal.app/thumbnails/…
    │                              │──socket: new_photo──►│ (broadcast to gallery room)
    │◄─{ photo with CF urls }──────│
    │                              │
    │────────────────────────────────────────────────────────────────────────────►update record
    │                                                                              status=synced
    │                                                                              s3Url (CF)
    │                                                                              thumbnailUri (CF)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 3 — DISPLAY (any device, any time)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 FastImage requests https://cdn.focal.app/thumbnails/…
    │──────────────────────────────────────────────────────────►│
    │                                                            │ cache HIT?
    │                                                            │──────► serve from edge
    │                                                            │
    │                                                            │ cache MISS?
    │                                                            │──GET (via OAC)──►│
    │                                                            │◄─ image bytes ───│
    │                                                            │ cache + serve
    │◄─ image bytes ─────────────────────────────────────────────│
    │ FastImage disk-caches by stable URL
    │ (works offline from cache indefinitely)
```

**Key properties of this flow**

- The backend never handles image bytes at any point — uploads go App → S3 directly, display goes App → CloudFront → S3
- The photo appears in the gallery instantly (local thumbnail), before any network activity
- Offline photo capture works: photos are queued in WatermelonDB and uploaded when connectivity returns
- Offline viewing works: CloudFront URLs are stable, so FastImage's disk cache is always valid

---

## Design Decisions & Tradeoffs

### 1. Client uploads directly to S3 via presigned PUT URLs

The backend generates a short-lived signed URL; the client PUTs image bytes directly to S3. The backend never proxies binary data.

**Pro**: Saves substantial server bandwidth and compute costs at scale. Upload speed is limited by S3's infrastructure, not your server.

**Con**: Creates a two-phase commit problem. If the client uploads successfully but crashes before calling `/confirm`, the object is orphaned in S3. The codebase mitigates this with idempotency on `s3Key` and cleanup on confirm failure, but objects orphaned before the PUT completes are never recovered. A S3 lifecycle rule to expire objects in `photos/` older than 24h that aren't referenced in the DB is the standard mitigation.

---

### 2. Client-only thumbnail generation

The client resizes to 400px and uploads the thumbnail directly to S3 before calling `/confirm`. The backend stores the thumbnail URL as-is — no server-side reprocessing.

**Why**: Server-side regeneration would download the full image, run Sharp, and re-upload on every photo — meaningful compute and S3 cost for minimal quality gain. The client-side resize with `react-native-image-manipulator` already produces a consistent 400px JPEG. The only benefit of server-side regeneration would be the ability to retroactively resize all thumbnails if dimensions ever change — a hypothetical future concern that doesn't justify the ongoing cost.

**Tradeoff**: Thumbnail dimensions are fixed at upload time. Changing them later would require re-uploading from a client (impossible) or re-processing from the full-size S3 objects via a one-off migration script.

---

### 3. WatermelonDB for offline-first local state

A local SQLite database (WatermelonDB) is the primary data layer. The server is synced into it; the UI observes the local DB.

**Pro**: True offline-first. Photos taken without network persist across app restarts and upload automatically when connectivity returns. Reactive `observe()` queries mean the UI updates without manual state management.

**Con**: Significant complexity — schema versioning, migrations, sync conflict resolution, and WatermelonDB's immutable record IDs (which force delete-and-recreate in `updateOptimisticPhoto` when a temporary ID is replaced by a permanent server ID).

Without WatermelonDB, photos taken offline would be lost on app restart and the app would be entirely non-functional without network.

---

### 4. Optimistic UI with outbox pattern

Photos appear in the gallery instantly using local file URIs, before any network activity begins.

**Pro**: Perceived performance is instant. Works fully offline.

**Con**: Complex conflict resolution. The sync must detect whether an incoming server record is the same photo as a pending optimistic record (matched via `s3Key`). There is also a race between the socket `new_photo` event and the `/confirm` response both attempting to create the same permanent record — handled by the `matchedOptimistic` guard in the sync.

---

### 5. Client-side resizing before upload

Photos are resized to 1920px (full) and 400px (thumbnail) on device before upload.

**Pro**: Reduces upload size from 10–15MB (raw iPhone photo) to 1–3MB. Faster uploads, lower S3 storage cost.

**Con**: Quality and dimension decisions are baked in at capture time. Changing thumbnail dimensions later requires re-uploading all existing photos. The server worker resizes again anyway, making client-side thumbnail resizing redundant for quality purposes — its only value is reducing upload size.

---

### 6. Rate limiting at two layers

Client-side rate limiting (`checkLocalUploadLimit` via WatermelonDB) and server-side (Redis `checkAndRecordUpload`).

**Why both**: Client-side prevents wasted bandwidth on requests that would be rejected server-side. Server-side is authoritative and cannot be bypassed.

**Tradeoff**: Two systems that can drift — e.g., a Redis eviction resets the server count while the client still thinks the limit is hit, blocking uploads unnecessarily. The current design treats client-side as advisory (`sync_pending`) and server-side as final, which handles drift correctly.

---

### 7. Firebase FCM + AWS S3 (two vendors)

**Why not consolidate to AWS SNS**: SNS routes Android push notifications through FCM anyway. Using SNS would add an abstraction layer on top of FCM with no functional benefit, higher per-notification cost, and worse React Native SDK support.

Best-in-class tool for each job: FCM for mobile push (free, standard, single SDK for iOS + Android), S3 for object storage.
