import { Model } from '@nozbe/watermelondb';
import { text, readonly, date, children, field } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
  static table = 'users';

  static associations = {
    memberships: { type: 'has_many' as const, foreignKey: 'user_id' },
    photos: { type: 'has_many' as const, foreignKey: 'uploader_id' },
  };

  @text('name') name?: string;
  @text('avatar_url') avatarUrl?: string;
  @field('email') email?: string;
  @field('handle') handle!: string;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;

  @children('photos') photos!: any;
  @children('memberships') memberships!: any;
}
