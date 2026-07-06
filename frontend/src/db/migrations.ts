import { schemaMigrations, addColumns, createTable, unsafeExecuteSql } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 25,
      steps: [
      ],
    },
    {
      toVersion: 26,
      steps: [
        createTable({
          name: 'notifications',
          columns: [
            { name: 'recipient_id', type: 'string', isIndexed: true },
            { name: 'actor_id', type: 'string', isIndexed: true },
            { name: 'type', type: 'string', isIndexed: true },
            { name: 'reference_id', type: 'string', isOptional: true },
            { name: 'reference_type', type: 'string', isOptional: true },
            { name: 'data', type: 'string', isOptional: true },
            { name: 'is_read', type: 'boolean', isIndexed: true },
            { name: 'created_at', type: 'number', isIndexed: true },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 27,
      steps: [
        addColumns({
          table: 'galleries',
          columns: [
            { name: 'edit_permission', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 28,
      steps: [
        addColumns({
          table: 'galleries',
          columns: [
            { name: 'upload_limit_per_hour', type: 'number', isOptional: true },
            { name: 'rate_limit_state_token', type: 'string', isOptional: true },
            { name: 'rate_limit_last_synced', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 29,
      steps: [],
    },
    {
      toVersion: 30,
      steps: [],
    },
    {
      toVersion: 31,
      steps: [
        addColumns({
          table: 'photos',
          columns: [
            { name: 'retry_after', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 32,
      steps: [
        createTable({
          name: 'photo_attempts',
          columns: [
            { name: 'gallery_id', type: 'string', isIndexed: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'attempted_at', type: 'number', isIndexed: true },
            { name: 'status', type: 'string', isIndexed: true },
            { name: 'photo_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'server_rejected', type: 'boolean', isOptional: true },
            { name: 'retry_after', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      // WatermelonDB cannot drop columns; the status column is simply
      // dropped from the schema and ignored going forward. Existing rows
      // keep the column value in SQLite but it is never read or written.
      toVersion: 33,
      steps: [],
    },
    {
      toVersion: 34,
      steps: [
        addColumns({
          table: 'galleries',
          columns: [
            { name: 'last_uploaded_by_name', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 35,
      steps: [
        addColumns({
          table: 'photos',
          columns: [
            { name: 'is_liked', type: 'boolean', isOptional: true },
          ],
        }),
      ],
    },
    {
      // v29/v30 were released with empty steps so some devices already have
      // these tables while others don't. Use IF NOT EXISTS via unsafeExecuteSql
      // so both device populations migrate safely.
      toVersion: 36,
      steps: [
        unsafeExecuteSql(
          `CREATE TABLE IF NOT EXISTS "communities" (
            "id" TEXT PRIMARY KEY NOT NULL,
            "name" TEXT NOT NULL DEFAULT '',
            "description" TEXT,
            "icon_url" TEXT,
            "owner_id" TEXT NOT NULL DEFAULT '' REFERENCES "users" ("id"),
            "join_requires_approval" INTEGER,
            "add_permission" TEXT,
            "delete_permission" TEXT,
            "member_count" REAL NOT NULL DEFAULT 0,
            "gallery_count" REAL NOT NULL DEFAULT 0,
            "created_at" REAL NOT NULL DEFAULT 0,
            "updated_at" REAL NOT NULL DEFAULT 0,
            "_changed" TEXT NOT NULL DEFAULT '',
            "_status" TEXT NOT NULL DEFAULT ''
          );`
        ),
        unsafeExecuteSql(
          `CREATE TABLE IF NOT EXISTS "community_memberships" (
            "id" TEXT PRIMARY KEY NOT NULL,
            "user_id" TEXT NOT NULL DEFAULT '',
            "community_id" TEXT NOT NULL DEFAULT '',
            "role" TEXT NOT NULL DEFAULT '',
            "status" TEXT NOT NULL DEFAULT '',
            "joined_at" REAL NOT NULL DEFAULT 0,
            "_changed" TEXT NOT NULL DEFAULT '',
            "_status" TEXT NOT NULL DEFAULT ''
          );`
        ),
        unsafeExecuteSql(`CREATE INDEX IF NOT EXISTS "community_memberships_user_id" ON "community_memberships" ("user_id");`),
        unsafeExecuteSql(`CREATE INDEX IF NOT EXISTS "community_memberships_community_id" ON "community_memberships" ("community_id");`),
        unsafeExecuteSql(`CREATE INDEX IF NOT EXISTS "communities_owner_id" ON "communities" ("owner_id");`),
      ],
    },
    {
      toVersion: 37,
      steps: [
        addColumns({
          table: 'galleries',
          columns: [
            { name: 'last_viewed_at', type: 'number', isOptional: true },
            { name: 'last_viewed_photo_count', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      // Join-approval functionality removed. WatermelonDB cannot drop columns, so
      // `join_requires_approval` (galleries/communities) and `status`
      // (community_memberships) are simply removed from the schema and ignored
      // going forward. Existing rows keep the column values in SQLite but they
      // are never read or written.
      toVersion: 38,
      steps: [],
    },
  ],
});
