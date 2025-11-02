import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators';

export default class Membership extends Model {
  static table = 'memberships';

  static associations = {
    gallery: { type: 'belongs_to' as const, key: 'gallery_id' },
    user: { type: 'belongs_to' as const, key: 'user_id' },
  };

  @field('user_id') userId!: string;
  @field('gallery_id') galleryId!: string;
  @date('joined_at') joinedAt!: number;
  @field('status') status!: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED';
  @field('role') role!: 'ADMIN' | 'MEMBER';
  @field('is_muted') isMuted!: boolean;

  @relation('galleries', 'gallery_id') gallery!: any;
  @relation('users', 'user_id') user!: any;
}
