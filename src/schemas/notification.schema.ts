import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recipientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({
    type: String,
    enum: [
      'friend_request',
      'friend_accepted',
      'message',
      'post_like',
      'post_comment',
      'comment_like',
      'comment_reply',
      'story_view',
      'story_reaction',
      'mention',
    ],
    required: true,
  })
  type: string;

  @Prop({ type: Types.ObjectId, refPath: 'entityModel' })
  entityId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['Post', 'Message', 'Story', 'FriendRequest', 'Comment'],
  })
  entityModel?: string;

  @Prop({ trim: true, maxlength: 500 })
  content?: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  actionUrl?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes for performance
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1 });

// Auto-delete notifications after 30 days
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);
