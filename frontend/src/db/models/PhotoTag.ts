import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class PhotoTag extends Model {
  static table = 'photo_tags';

  static associations = {
    photo: { type: 'belongs_to' as const, key: 'photo_id' },
    tag: { type: 'belongs_to' as const, key: 'tag_id' },
  };

  @field('photo_id') photoId!: string;
  @field('tag_id') tagId!: string;
}