import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';

export default class GroupMembership extends Model {
  static table = 'community_memberships';

  static associations = {
    communities: { type: 'belongs_to' as const, key: 'community_id' },
    users: { type: 'belongs_to' as const, key: 'user_id' },
  };

  @field('user_id') userId!: string;
  @field('community_id') communityId!: string;
  @field('role') role!: 'ADMIN' | 'MEMBER';
  @field('status') status!: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED';
  @date('joined_at') joinedAt!: number;

  @relation('communities', 'community_id') community!: any;
  @relation('users', 'user_id') user!: any;
}
