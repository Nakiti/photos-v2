import { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import Tag from '../../db/models/Tag';
import { TagApi } from '../api/tags.service';

/**
 * Upserts and reconciles tags for a specific gallery.
 * - Creates/updates tags present in remote list
 * - Deletes local tags that no longer exist remotely
 */
export async function syncTags(
  database: Database,
  galleryId: string,
  remoteTags: TagApi[],
) {
  const tagsCollection = database.collections.get<Tag>('tags');

  // Fetch local tags for this gallery
  const localTags = await tagsCollection
    .query(Q.where('gallery_id', galleryId))
    .fetch();

  const localMap = new Map(localTags.map((t) => [t.id, t]));
  const remoteIdSet = new Set(remoteTags.map((t) => t.id));

  const ops: any[] = [];

  // Upsert remote tags
  for (const remote of remoteTags) {
    const existing = localMap.get(remote.id);
    if (existing) {
      // Update if changed
      if (existing.name !== remote.name || existing.color !== (remote.color ?? null)) {
        ops.push(
          existing.prepareUpdate((rec) => {
            rec.name = remote.name;
            rec.color = remote.color ?? null as any;
          }),
        );
      }
    } else {
      // Create new
      ops.push(
        tagsCollection.prepareCreate((rec) => {
          (rec as any)._raw.id = remote.id;
          rec.name = remote.name;
          rec.galleryId = galleryId;
          rec.color = remote.color ?? null as any;
        }),
      );
    }
  }

  // Delete locals not in remote
  for (const local of localTags) {
    if (!remoteIdSet.has(local.id)) {
      ops.push(local.prepareDestroyPermanently());
    }
  }

  if (ops.length > 0) {
    await database.write(async () => {
      await database.batch(...ops);
    });
  }
}


