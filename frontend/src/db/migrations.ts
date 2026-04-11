import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

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
  ],
});
