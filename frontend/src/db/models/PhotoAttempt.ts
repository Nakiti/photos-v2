import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

export default class PhotoAttempt extends Model {
  static table = 'photo_attempts';
  
  static associations = {
    galleries: { type: 'belongs_to', key: 'gallery_id' },
    users: { type: 'belongs_to', key: 'user_id' },
    photos: { type: 'belongs_to', key: 'photo_id' },
  } as const;

  @field('gallery_id') galleryId!: string;
  @field('user_id') userId!: string;
  @field('attempted_at') attemptedAt!: number;
  @field('status') status!: 'pending' | 'confirmed' | 'rejected';
  @field('photo_id') photoId?: string;
  @field('server_rejected') serverRejected?: boolean;
  @field('retry_after') retryAfter?: number;

  @relation('galleries', 'gallery_id') gallery!: any;
  @relation('users', 'user_id') user!: any;
  @relation('photos', 'photo_id') photo?: any;
}

