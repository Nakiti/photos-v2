import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation } from '@nozbe/watermelondb/decorators';

export default class Photo extends Model {
  static table = 'photos';

  // Define relationships
  static associations = {
    gallery: { type: 'belongs_to' as const, key: 'gallery_id' },
    user: { type: 'belongs_to' as const, key: 'uploader_id' },
  };

  @field('gallery_id') galleryId!: string;
  @field('uploader_id') uploaderId!: string;
  @text('s3_key') s3Key?: string;
  @text('s3_url') s3Url?: string;
  @text('local_uri') localUri?: string;
  @text('local_thumbnail_uri') localThumbnailUri?: string;
  @text('thumbnail_url') thumbnailUri?: string;
  @text('visible') visible?: 'IN_REVIEW' | 'VISIBLE';
  @field('status') status!: 'queued' | 'uploading' | 'upload_failed' | 'synced';
  @readonly @date('created_at') createdAt!: number;

  @relation('galleries', 'gallery_id') gallery!: any;
  @relation('users', 'uploader_id') uploader!: any;
}
