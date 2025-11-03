import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Friendship extends Model {
  static table = 'friendships';

  static associations = {
    requester: { type: 'belongs_to' as const, key: 'requester_id' },
    receiver: { type: 'belongs_to' as const, key: 'receiver_id' },
  };

  @field('requester_id') requesterId!: string;
  @field('receiver_id') receiverId!: string;
  @field('status') status!: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}