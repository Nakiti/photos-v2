import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators';

export default class Tags extends Model {
  static table = 'tags';

  @field('name') name!: string;
  @field('description') description!: string;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
}