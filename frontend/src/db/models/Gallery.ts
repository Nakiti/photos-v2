import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation, children } from '@nozbe/watermelondb/decorators';

export default class Gallery extends Model {
  static table = 'galleries';

  // Define relationships
  static associations = {
    memberships: { type: 'has_many' as const, foreignKey: 'gallery_id' },
    photos: { type: 'has_many' as const, foreignKey: 'gallery_id' },
  };

  // Define fields
  @text('name') name!: string;
  @field('owner_id') ownerId!: string;
  @field('default_tag_id') defaultTagId!: string;
  @text('icon_url') iconUrl?: string;
  @field('type') type!: 'GROUP' | 'EVENT';
  @field('start_date') startDate?: number;
  @field('end_date') endDate?: number;
  @text('location') location?: string;
  @text('shareable_link') shareableLink?: string;
  // Settings
  @text('join_requires_approval') joinRequiresApproval?: 'all' | 'admin_approval';
  @text('add_permission') addPermission?: 'all' | 'admin';
  @text('delete_permission') deletePermission?: 'admins_authors' | 'admin';
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;

  // Define children relationships
  @children('photos') photos!: any; // Replace 'any' with a proper type if available
  @children('memberships') memberships!: any;

  // Define relation to the owner (User)
  @relation('users', 'owner_id') owner!: any;
  @relation('tags', 'default_tag_id') defaultTag!: any;
}
