import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    // This tells WatermelonDB how to upgrade to version 13.
    // Even with empty steps, it satisfies the requirement and prevents the DB wipe.
    {
      toVersion: 16,
      steps: [
        // If you added columns specifically for v13, you would put them here.
        // e.g. addColumns({ table: 'users', columns: [{ name: 'bio', type: 'string' }] })
      ],
    },
  ],
});