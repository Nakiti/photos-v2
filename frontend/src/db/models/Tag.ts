import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class Tag extends Model {
  static table = 'tags';

  static associations = {
    galleries: { type: 'belongs_to' as const, key: 'gallery_id' },
  };

  @field('name') name!: string;
  @field('gallery_id') galleryId!: string;
  @field('color') color?: string;
}


