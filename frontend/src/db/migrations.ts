import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 25,
      steps: [
        // Previous migration steps
      ],
    },
    // Migration 25: Add photo_attempts table, rate limit fields to galleries, retry_after to photos
    {
      toVersion: 25,
      steps: [
        // Add rate limit fields to galleries
        addColumns({
          table: 'galleries',
          columns: [
            { name: 'upload_limit_per_hour', type: 'number', isOptional: true },
            { name: 'rate_limit_state_token', type: 'string', isOptional: true },
            { name: 'rate_limit_last_synced', type: 'number', isOptional: true },
          ],
        }),
        
        // Add retry_after to photos
        addColumns({
          table: 'photos',
          columns: [
            { name: 'retry_after', type: 'number', isOptional: true },
          ],
        }),
        
        // Create photo_attempts table
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
