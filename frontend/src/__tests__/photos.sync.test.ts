import { makeTestDatabase } from './testDatabase';
import { syncPhotos, updateOptimisticPhoto, reconcileDeletedPhotos, reconcileDeletedPhotosSince } from '../services/sync/photos.sync';
import type { Database } from '@nozbe/watermelondb';
import type Photo from '../db/models/Photo';
import type PhotoTag from '../db/models/PhotoTag';
import { Q } from '@nozbe/watermelondb';

function makeRemotePhoto(overrides: Record<string, any> = {}) {
  return {
    id: 'photo-server-1',
    galleryId: 'gallery-1',
    uploaderId: 'user-1',
    s3Key: 'photos/gallery-1/abc.jpg',
    s3Url: 'https://cdn.test.com/photos/gallery-1/abc.jpg',
    thumbnailUrl: 'https://cdn.test.com/thumbnails/gallery-1/abc.jpg',
    createdAt: new Date('2024-01-01').toISOString(),
    photoTags: [] as { tagId: string }[],
    ...overrides,
  };
}

async function seedPhoto(db: Database, overrides: Record<string, any> = {}) {
  let created: Photo | undefined;
  await db.write(async () => {
    created = await db.collections.get<Photo>('photos').create(record => {
      (record as any)._raw.id = overrides.id ?? 'photo-server-1';
      record.galleryId = overrides.galleryId ?? 'gallery-1';
      record.uploaderId = overrides.uploaderId ?? 'user-1';
      record.s3Key = overrides.s3Key;
      record.s3Url = overrides.s3Url;
      record.status = overrides.status ?? 'synced';
    });
  });
  return created!;
}

async function seedPhotoTag(db: Database, photoId: string, tagId: string) {
  await db.write(async () => {
    await db.collections.get<PhotoTag>('photo_tags').create(record => {
      record.photoId = photoId;
      record.tagId = tagId;
    });
  });
}

// ───────────────────────────────────────────
// syncPhotos — conflict resolution
// ───────────────────────────────────────────

describe('syncPhotos — skip upload-in-progress photos', () => {
  let db: Database;
  beforeEach(() => { db = makeTestDatabase(); });

  it.each(['queued', 'uploading', 'sync_pending'] as const)(
    'does not overwrite a photo with status=%s',
    async (status) => {
      await seedPhoto(db, { status, s3Key: undefined, s3Url: undefined });

      await syncPhotos(db, [makeRemotePhoto()]);

      const local = await db.collections.get<Photo>('photos').find('photo-server-1');
      expect(local.status).toBe(status);
      // LokiJS stores null for empty text fields; verify s3Key was not set
      expect(local.s3Key).toBeFalsy();
    }
  );
});

describe('syncPhotos — s3Key deduplication for optimistic photos', () => {
  let db: Database;
  beforeEach(() => { db = makeTestDatabase(); });

  it('does not create a remote photo when an optimistic record with the same s3Key exists', async () => {
    // Seed a sync_pending optimistic photo with the same s3Key the server is returning
    await seedPhoto(db, {
      id: 'temp-local-id',
      s3Key: 'photos/gallery-1/abc.jpg',
      status: 'sync_pending',
    });

    await syncPhotos(db, [makeRemotePhoto({ s3Key: 'photos/gallery-1/abc.jpg' })]);

    // The permanent server ID must NOT have been created
    await expect(
      db.collections.get<Photo>('photos').find('photo-server-1')
    ).rejects.toThrow();

    // The optimistic record must still be there
    const optimistic = await db.collections.get<Photo>('photos').find('temp-local-id');
    expect(optimistic).toBeDefined();
    expect(optimistic.status).toBe('sync_pending');
  });

  it('creates the permanent photo when no optimistic record shares the s3Key', async () => {
    // A different-gallery optimistic photo — should not match
    await seedPhoto(db, {
      id: 'other-gallery-temp',
      galleryId: 'gallery-OTHER',
      s3Key: 'photos/gallery-1/abc.jpg',
      status: 'sync_pending',
    });

    await syncPhotos(db, [makeRemotePhoto()]);

    const created = await db.collections.get<Photo>('photos').find('photo-server-1');
    expect(created.status).toBe('synced');
  });

  it('creates the permanent photo when remote has no s3Key (edge case)', async () => {
    await syncPhotos(db, [makeRemotePhoto({ s3Key: undefined })]);

    const created = await db.collections.get<Photo>('photos').find('photo-server-1');
    expect(created.status).toBe('synced');
  });
});

describe('syncPhotos — create and update', () => {
  let db: Database;
  beforeEach(() => { db = makeTestDatabase(); });

  it('creates a new synced record when no local record exists', async () => {
    await syncPhotos(db, [makeRemotePhoto()]);

    const created = await db.collections.get<Photo>('photos').find('photo-server-1');
    expect(created.status).toBe('synced');
    expect(created.s3Key).toBe('photos/gallery-1/abc.jpg');
    expect(created.galleryId).toBe('gallery-1');
  });

  it('updates s3Url and sets status=synced when local photo has changed s3Url', async () => {
    await seedPhoto(db, {
      s3Key: 'photos/gallery-1/abc.jpg',
      s3Url: 'https://old.cdn.com/photos/gallery-1/abc.jpg',
      status: 'synced',
    });

    await syncPhotos(db, [makeRemotePhoto({ s3Url: 'https://new.cdn.com/photos/gallery-1/abc.jpg' })]);

    const updated = await db.collections.get<Photo>('photos').find('photo-server-1');
    expect(updated.s3Url).toBe('https://new.cdn.com/photos/gallery-1/abc.jpg');
    expect(updated.status).toBe('synced');
  });

  it('does not create a duplicate when syncing the same photo twice', async () => {
    const remote = makeRemotePhoto();
    await syncPhotos(db, [remote]);
    await syncPhotos(db, [remote]);

    const all = await db.collections.get<Photo>('photos').query(
      Q.where('id', 'photo-server-1')
    ).fetch();
    expect(all).toHaveLength(1);
  });
});

// ───────────────────────────────────────────
// syncPhotos — tag reconciliation
// ───────────────────────────────────────────

describe('syncPhotos — tag reconciliation', () => {
  let db: Database;
  beforeEach(() => { db = makeTestDatabase(); });

  it('creates photo_tag records for tags returned by the server', async () => {
    await syncPhotos(db, [
      makeRemotePhoto({ photoTags: [{ tagId: 'tag-1' }, { tagId: 'tag-2' }] }),
    ]);

    const tags = await db.collections.get<PhotoTag>('photo_tags').query().fetch();
    const tagIds = tags.map(t => t.tagId).sort();
    expect(tagIds).toEqual(['tag-1', 'tag-2']);
    tags.forEach(t => expect(t.photoId).toBe('photo-server-1'));
  });

  it('removes tags that no longer exist on the server', async () => {
    await seedPhoto(db, {
      s3Key: 'photos/gallery-1/abc.jpg',
      status: 'synced',
    });
    await seedPhotoTag(db, 'photo-server-1', 'tag-1');
    await seedPhotoTag(db, 'photo-server-1', 'tag-2');

    // Server now only has tag-1
    await syncPhotos(db, [makeRemotePhoto({ photoTags: [{ tagId: 'tag-1' }] })]);

    const remaining = await db.collections.get<PhotoTag>('photo_tags').query().fetch();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.tagId).toBe('tag-1');
  });

  it('adds new tags without duplicating existing ones', async () => {
    await seedPhoto(db, { s3Key: 'photos/gallery-1/abc.jpg', status: 'synced' });
    await seedPhotoTag(db, 'photo-server-1', 'tag-1');

    // Server now has tag-1 and tag-2
    await syncPhotos(db, [makeRemotePhoto({ photoTags: [{ tagId: 'tag-1' }, { tagId: 'tag-2' }] })]);

    const all = await db.collections.get<PhotoTag>('photo_tags').query().fetch();
    expect(all).toHaveLength(2);
  });

  it('does NOT reconcile tags for an optimistic-deduped photo (skipped via continue)', async () => {
    // There's an optimistic record with the same s3Key → sync skips the whole photo
    await seedPhoto(db, { id: 'temp-id', s3Key: 'photos/gallery-1/abc.jpg', status: 'sync_pending' });

    await syncPhotos(db, [
      makeRemotePhoto({
        s3Key: 'photos/gallery-1/abc.jpg',
        photoTags: [{ tagId: 'tag-1' }],
      }),
    ]);

    const tags = await db.collections.get<PhotoTag>('photo_tags').query().fetch();
    expect(tags).toHaveLength(0); // no orphaned photo_tags for the skipped permanent ID
  });
});

// ───────────────────────────────────────────
// updateOptimisticPhoto
// ───────────────────────────────────────────

describe('updateOptimisticPhoto — happy path', () => {
  let db: Database;
  const tempId = 'temp-123';
  const finalId = 'server-456';

  beforeEach(() => { db = makeTestDatabase(); });

  async function seedTempWithTags() {
    await db.write(async () => {
      await db.collections.get<Photo>('photos').create(record => {
        (record as any)._raw.id = tempId;
        record.galleryId = 'gallery-1';
        record.uploaderId = 'user-1';
        record.s3Key = 'photos/gallery-1/old.jpg';
        record.status = 'uploading';
        record.localThumbnailUri = 'file:///local/thumb.jpg';
      });
      await db.collections.get<PhotoTag>('photo_tags').create(r => {
        r.photoId = tempId;
        r.tagId = 'tag-1';
      });
    });
  }

  const finalPhoto = {
    id: finalId,
    galleryId: 'gallery-1',
    uploaderId: 'user-1',
    s3Key: 'photos/gallery-1/new.jpg',
    s3Url: 'https://cdn.test.com/photos/gallery-1/new.jpg',
    thumbnailUrl: 'https://cdn.test.com/thumbnails/gallery-1/new.jpg',
    createdAt: new Date('2024-01-01').toISOString(),
    photoTags: [],
  } as any;

  it('deletes the temp record and creates the permanent record', async () => {
    await seedTempWithTags();
    await updateOptimisticPhoto(db, tempId, finalPhoto);

    await expect(db.collections.get<Photo>('photos').find(tempId)).rejects.toThrow();
    const permanent = await db.collections.get<Photo>('photos').find(finalId);
    expect(permanent.status).toBe('synced');
    expect(permanent.s3Key).toBe('photos/gallery-1/new.jpg');
    expect(permanent.galleryId).toBe('gallery-1');
  });

  it('re-points photo_tags from the temp ID to the final ID', async () => {
    await seedTempWithTags();
    await updateOptimisticPhoto(db, tempId, finalPhoto);

    const tags = await db.collections.get<PhotoTag>('photo_tags').query().fetch();
    expect(tags).toHaveLength(1);
    expect(tags[0]!.photoId).toBe(finalId);
    expect(tags[0]!.tagId).toBe('tag-1');
  });

  it('preserves the local thumbnail URI from the temp record', async () => {
    await seedTempWithTags();
    await updateOptimisticPhoto(db, tempId, finalPhoto);

    const permanent = await db.collections.get<Photo>('photos').find(finalId);
    expect(permanent.localThumbnailUri).toBe('file:///local/thumb.jpg');
  });
});

describe('updateOptimisticPhoto — race condition', () => {
  let db: Database;
  const tempId = 'temp-123';
  const finalId = 'server-456';

  beforeEach(() => { db = makeTestDatabase(); });

  it('cleans up temp record when permanent already exists (socket sync beat the confirm response)', async () => {
    await db.write(async () => {
      // Permanent record already created by syncPhotos (socket-triggered)
      await db.collections.get<Photo>('photos').create(record => {
        (record as any)._raw.id = finalId;
        record.galleryId = 'gallery-1';
        record.uploaderId = 'user-1';
        record.s3Key = 'photos/gallery-1/new.jpg';
        record.status = 'synced';
      });
      // Temp record still exists
      await db.collections.get<Photo>('photos').create(record => {
        (record as any)._raw.id = tempId;
        record.galleryId = 'gallery-1';
        record.uploaderId = 'user-1';
        record.s3Key = 'photos/gallery-1/new.jpg';
        record.status = 'uploading';
      });
      // Tag still pointing at temp ID
      await db.collections.get<PhotoTag>('photo_tags').create(r => {
        r.photoId = tempId;
        r.tagId = 'tag-1';
      });
    });

    await updateOptimisticPhoto(db, tempId, {
      id: finalId, galleryId: 'gallery-1', uploaderId: 'user-1',
      s3Key: 'photos/gallery-1/new.jpg', s3Url: '', thumbnailUrl: '', createdAt: '',
    } as any);

    // Temp must be gone
    await expect(db.collections.get<Photo>('photos').find(tempId)).rejects.toThrow();
    // Orphaned tags must be deleted
    const tags = await db.collections.get<PhotoTag>('photo_tags').query().fetch();
    expect(tags).toHaveLength(0);
    // Permanent record untouched
    const permanent = await db.collections.get<Photo>('photos').find(finalId);
    expect(permanent.status).toBe('synced');
  });
});

// ───────────────────────────────────────────
// reconcileDeletedPhotos
// ───────────────────────────────────────────

describe('reconcileDeletedPhotos', () => {
  let db: Database;
  beforeEach(() => { db = makeTestDatabase(); });

  it('deletes synced photos that are not in the remote ID list', async () => {
    await seedPhoto(db, { id: 'photo-keep', status: 'synced', s3Key: 'k1' });
    await seedPhoto(db, { id: 'photo-delete', status: 'synced', s3Key: 'k2' });

    await reconcileDeletedPhotos(db, 'gallery-1', ['photo-keep']);

    await expect(db.collections.get<Photo>('photos').find('photo-delete')).rejects.toThrow();
    const kept = await db.collections.get<Photo>('photos').find('photo-keep');
    expect(kept).toBeDefined();
  });

  it('does not delete photos that are still uploading (non-synced)', async () => {
    await seedPhoto(db, { id: 'photo-uploading', status: 'uploading', s3Key: undefined });

    // The uploading photo has no server ID yet, so it won't appear in remotePhotoIds
    await reconcileDeletedPhotos(db, 'gallery-1', []);

    // Should still exist because reconcileDeletedPhotos only deletes 'synced' photos
    const stillExists = await db.collections.get<Photo>('photos').find('photo-uploading');
    expect(stillExists).toBeDefined();
  });
});

describe('reconcileDeletedPhotosSince', () => {
  let db: Database;
  beforeEach(() => { db = makeTestDatabase(); });

  it('deletes synced photos by ID', async () => {
    await seedPhoto(db, { id: 'photo-deleted', status: 'synced', s3Key: 'k1' });

    await reconcileDeletedPhotosSince(db, 'gallery-1', ['photo-deleted']);

    await expect(db.collections.get<Photo>('photos').find('photo-deleted')).rejects.toThrow();
  });

  it('skips photos with status=uploading (never deletes in-flight uploads)', async () => {
    await seedPhoto(db, { id: 'photo-uploading', status: 'uploading', s3Key: undefined });

    await reconcileDeletedPhotosSince(db, 'gallery-1', ['photo-uploading']);

    const stillExists = await db.collections.get<Photo>('photos').find('photo-uploading');
    expect(stillExists).toBeDefined();
  });

  it('is a no-op for empty deletedPhotoIds', async () => {
    await seedPhoto(db, { id: 'photo-1', status: 'synced', s3Key: 'k1' });

    await reconcileDeletedPhotosSince(db, 'gallery-1', []);

    const photo = await db.collections.get<Photo>('photos').find('photo-1');
    expect(photo).toBeDefined();
  });
});
