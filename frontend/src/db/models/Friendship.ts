import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation } from '@nozbe/watermelondb/decorators';

export default class Friendship extends Model {
  static table = 'friendships';

  static associations = {
    requester: { type: 'belongs_to' as const, key: 'requester_id' },
    receiver: { type: 'belongs_to' as const, key: 'receiver_id' },
  };
}