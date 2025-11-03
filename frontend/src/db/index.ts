import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { mySchema } from './schema';
import Gallery from './models/Gallery';
import Photo from './models/Photo';
import User from './models/User';
import Membership from './models/Membership';
import Friendship from './models/Friendship';

// First, create the adapter to the underlying database driver (SQLite in this case)
const adapter = new SQLiteAdapter({
  schema: mySchema,
  // (You might want to add `jsi: true` here for performance enhancement)
});

// Then, make a WatermelonDB database from it!
export const database = new Database({
  adapter,
  modelClasses: [
    Gallery,
    Photo,
    User,
    Membership,
    Friendship,
  ],
});
