import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { mySchema } from './schema';
import migrations from './migrations';
import Gallery from './models/Gallery';
import Photo from './models/Photo';
import User from './models/User';
import Membership from './models/Membership';
import Tag from './models/Tag';
import PhotoTag from './models/PhotoTag';
import GroupMembership from './models/GroupMembership';
import Group from './models/Group';
import PhotoAttempt from './models/PhotoAttempt';
import Notification from './models/Notification';

// First, create the adapter to the underlying database driver (SQLite in this case)
const adapter = new SQLiteAdapter({
  schema: mySchema,
  migrations
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
    Tag,
    PhotoTag,
    Group,
    GroupMembership,
    PhotoAttempt,
    Notification,
  ],
});
