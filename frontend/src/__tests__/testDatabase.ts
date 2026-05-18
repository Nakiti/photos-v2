import { Database } from '@nozbe/watermelondb';
// LokiJS adapter is pure JS (no native module required) — correct for Node.js test environment
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { mySchema } from '../db/schema';
import migrations from '../db/migrations';
import Gallery from '../db/models/Gallery';
import Photo from '../db/models/Photo';
import User from '../db/models/User';
import Membership from '../db/models/Membership';
import Tag from '../db/models/Tag';
import PhotoTag from '../db/models/PhotoTag';
import Group from '../db/models/Group';
import GroupMembership from '../db/models/GroupMembership';
import PhotoAttempt from '../db/models/PhotoAttempt';
import Notification from '../db/models/Notification';

// Each call creates a fresh isolated in-memory database using LokiJS (pure JS, no native bridge).
export function makeTestDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: mySchema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });

  return new Database({
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
}
