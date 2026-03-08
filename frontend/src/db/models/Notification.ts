import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation } from '@nozbe/watermelondb/decorators';

export default class Notification extends Model {
  static table = 'notifications';

  static associations = {
    recipient: { type: 'belongs_to' as const, key: 'recipient_id' },
    actor: { type: 'belongs_to' as const, key: 'actor_id' },
  };

  @field('recipient_id') recipientId!: string;
  @field('actor_id') actorId!: string;
  @field('type') type!: 'LIKE' | 'COMMENT' | 'INVITE' | 'SYSTEM';
  @text('reference_id') referenceId?: string;
  @text('reference_type') referenceType?: string;
  @text('data') data?: string; // JSON string
  @field('is_read') isRead!: boolean;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;

  @relation('users', 'recipient_id') recipient!: any;
  @relation('users', 'actor_id') actor!: any;
}


