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
  @field('default_tag_id') defaultTagId?: string | null;
  @field('community_id') communityId?: string | null;
  @text('community_name') communityName?: string | null;
  @text('icon_url') iconUrl?: string;
  @field('type') type!: 'GROUP' | 'EVENT';
  @field('start_date') startDate?: number;
  @field('end_date') endDate?: number;
  @text('location') location?: string;
  @text('shareable_link') shareableLink?: string;
  // Settings
  @field('join_requires_approval') joinRequiresApproval?: boolean;
  @text('add_permission') addPermission?: 'ANYONE' | 'ADMIN';
  @text('delete_permission') deletePermission?: 'ADMINS_AUTHORS' | 'ADMIN';
  @text('edit_permission') editPermission?: 'ANYONE' | 'ADMIN';
  @date('last_photo_at') lastPhotoAt?: number;
  @field('photo_count') photoCount!: number;
  @field('member_count') memberCount!: number;
  // Rate limiting fields
  @field('upload_limit_per_hour') uploadLimitPerHour?: number;
  @field('rate_limit_state_token') rateLimitStateToken?: string;
  @field('rate_limit_last_synced') rateLimitLastSynced?: number;
  @text('last_uploaded_by_name') lastUploadedByName?: string;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;

  // Define children relationships
  @children('photos') photos!: any; // Replace 'any' with a proper type if available
  @children('memberships') memberships!: any;

  // Define relation to the owner (User)
  @relation('users', 'owner_id') owner!: any;
  @relation('tags', 'default_tag_id') defaultTag!: any;
  @relation('communities', 'community_id') community!: any;
}
