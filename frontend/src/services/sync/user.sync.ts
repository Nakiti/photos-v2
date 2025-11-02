import { Database } from '@nozbe/watermelondb';
import User from '../../db/models/User';
import { UserProfile } from '../api/userService';

/**
 * Upsert the authenticated user's profile into the local WatermelonDB `users` table.
 * This keeps the local cache in sync with the server for the current user.
 */
export const syncCurrentUser = async (
  database: Database,
  profile: UserProfile
) => {
  const usersCollection = database.collections.get<User>('users');
  let preparedAction;

  try {
    // 1. Try to find the user
    const user = await usersCollection.find(profile.id);

    // 2. If found, prepare an update
    preparedAction = user.prepareUpdate((record) => {
      // Use the model's properties (e.g., record.name)
      // WatermelonDB maps these to your schema columns (e.g., name)
      record.name = profile.name ?? record.name;
      record.handle = profile.handle ?? record.handle;
      record.avatarUrl = profile.avatarUrl ?? record.avatarUrl;
      
      // if (profile.createdAt) {
      //   record.created_at = new Date(profile.createdAt).getTime();
      // }
      // if (profile.updatedAt) {
      //   record.updated_at = new Date(profile.updatedAt).getTime();
      // }
    });

  } catch (error) {
    // 3. If not found, prepare a create
    preparedAction = usersCollection.prepareCreate((record) => {
      record._raw.id = profile.id; 
      
      record.name = profile.name;
      record.handle = profile.handle;
      record.avatarUrl = profile.avatarUrl;

      // if (profile.createdAt) {
      //   record.created_at = new Date(profile.createdAt).getTime();
      // }
      // if (profile.updatedAt) {
      //   record.updated_at = new Date(profile.updatedAt).getTime();
      // }
    });
  }

  // 4. Run the prepared action (either create or update) in a batch
  await database.write(async () => {
    await database.batch([preparedAction]); // batch expects an array
  });
};
