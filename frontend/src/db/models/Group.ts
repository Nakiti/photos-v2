import { Model } from '@nozbe/watermelondb';
import { text, field, readonly, date, relation, children } from '@nozbe/watermelondb/decorators';

export default class Group extends Model {
  static table = 'communities';

  static associations = {
    community_memberships: { type: 'has_many' as const, foreignKey: 'community_id' },
    galleries: { type: 'has_many' as const, foreignKey: 'community_id' },
    users: { type: 'belongs_to' as const, key: 'owner_id' },
  };

  @text('name') name!: string;
  @text('description') description?: string;
  @text('icon_url') iconUrl?: string;
  @field('owner_id') ownerId!: string;
  @field('join_requires_approval') joinRequiresApproval?: boolean;
  @text('add_permission') addPermission?: 'ANYONE' | 'ADMIN';
  @text('delete_permission') deletePermission?: 'ADMINS_AUTHORS' | 'ADMIN';
  @field('member_count') memberCount!: number;
  @field('gallery_count') galleryCount!: number;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;

  @children('community_memberships') memberships!: any;
  @children('galleries') galleries!: any;
  @relation('users', 'owner_id') owner!: any;
}
