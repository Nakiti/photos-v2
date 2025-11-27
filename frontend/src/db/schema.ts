import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  // Ensure version matches the latest changes (added last_photo_at to galleries)
  version: 19,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'name', type: 'string', isOptional: true },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'handle', type: 'string', isIndexed: true }, 
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'galleries',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'default_tag_id', type: 'string'},
        { name: 'owner_id', type: 'string', isIndexed: true },
        { name: 'community_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'community_name', type: 'string', isOptional: true },
        { name: 'icon_url', type: 'string', isOptional: true },
        { name: 'type', type: 'string' }, // 'GROUP' or 'EVENT'
        { name: 'start_date', type: 'number', isOptional: true },
        { name: 'end_date', type: 'number', isOptional: true },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'shareable_link', type: 'string', isOptional: true },
        // Settings
        { name: 'join_requires_approval', type: 'boolean', isOptional: true }, // true | false
        { name: 'add_permission', type: 'string', isOptional: true },  // 'all' | 'admin'
        { name: 'delete_permission', type: 'string', isOptional: true }, // 'admins_authors' | 'admin'
        { name: 'last_photo_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'memberships',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'gallery_id', type: 'string', isIndexed: true },
        { name: 'joined_at', type: 'number' },
        { name: 'status', type: 'string', isIndexed: true }, 
        { name: 'role', type: 'string', isIndexed: true },
        { name: 'is_muted', type: 'boolean' }
      ],
    }),
    tableSchema({
      name: 'photos',
      columns: [
        { name: 'gallery_id', type: 'string', isIndexed: true },
        { name: 'uploader_id', type: 'string', isIndexed: true },
        { name: 's3_key', type: 'string', isOptional: true },
        { name: 's3_url', type: 'string', isOptional: true },
        { name: 'local_uri', type: 'string', isOptional: true },
        { name: 'local_thumbnail_uri', type: 'string', isOptional: true },
        { name: 'thumbnail_url', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // 'queued', 'uploading', 'upload_failed', 'synced'
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'friendships',
      columns: [
        { name: 'requester_id', type: 'string', isIndexed: true },
        { name: 'receiver_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string', isIndexed: true }, // 'PENDING', 'ACCEPTED', 'BLOCKED'
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'tags',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'gallery_id', type: 'string', isIndexed: true },
        { name: 'color', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'photo_tags',
      columns: [
        { name: 'photo_id', type: 'string', isIndexed: true },
        { name: 'tag_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'communities',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'icon_url', type: 'string', isOptional: true },
        { name: 'owner_id', type: 'string', isIndexed: true },
        { name: 'join_requires_approval', type: 'boolean', isOptional: true },
        { name: 'add_permission', type: 'string', isOptional: true },
        { name: 'delete_permission', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'community_memberships',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'community_id', type: 'string', isIndexed: true },
        { name: 'role', type: 'string' },
        { name: 'joined_at', type: 'number' },
      ],
    }),
  ],
});

