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
  ],
});
