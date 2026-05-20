import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  // Version 37: last_viewed_at + last_viewed_photo_count on galleries (local-only, tracks unseen count)
  version: 37,
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
        { name: 'default_tag_id', type: 'string', isOptional: true },
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
        { name: 'join_requires_approval', type: 'boolean', isOptional: true },
        { name: 'add_permission', type: 'string', isOptional: true },   // 'ANYONE' | 'ADMIN'
        { name: 'delete_permission', type: 'string', isOptional: true }, // 'ADMINS_AUTHORS' | 'ADMIN'
        { name: 'edit_permission', type: 'string', isOptional: true },   // 'ANYONE' | 'ADMIN'
        { name: 'last_photo_at', type: 'number', isOptional: true },
        { name: 'photo_count', type: 'number' },
        { name: 'member_count', type: 'number' },
        // Rate limiting fields
        { name: 'upload_limit_per_hour', type: 'number', isOptional: true },
        { name: 'rate_limit_state_token', type: 'string', isOptional: true },
        { name: 'rate_limit_last_synced', type: 'number', isOptional: true },
        { name: 'last_uploaded_by_name', type: 'string', isOptional: true },
        { name: 'last_viewed_at', type: 'number', isOptional: true },
        { name: 'last_viewed_photo_count', type: 'number', isOptional: true },
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
        { name: 'status', type: 'string' }, // 'queued', 'uploading', 'upload_failed', 'synced', 'sync_pending'
        { name: 'retry_after', type: 'number', isOptional: true }, // Timestamp when sync_pending photos should retry
        { name: 'is_liked', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number' },
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
        { name: 'member_count', type: 'number' },
        { name: 'gallery_count', type: 'number' },
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
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'joined_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'photo_attempts',
      columns: [
        { name: 'gallery_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'attempted_at', type: 'number', isIndexed: true },
        { name: 'status', type: 'string', isIndexed: true }, // 'pending' | 'confirmed' | 'rejected'
        { name: 'photo_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'server_rejected', type: 'boolean', isOptional: true },
        { name: 'retry_after', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'notifications',
      columns: [
        { name: 'recipient_id', type: 'string', isIndexed: true },
        { name: 'actor_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string', isIndexed: true }, // 'LIKE', 'COMMENT', 'INVITE', 'SYSTEM'
        { name: 'reference_id', type: 'string', isOptional: true },
        { name: 'reference_type', type: 'string', isOptional: true },
        { name: 'data', type: 'string', isOptional: true }, // JSON string
        { name: 'is_read', type: 'boolean', isIndexed: true },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});

