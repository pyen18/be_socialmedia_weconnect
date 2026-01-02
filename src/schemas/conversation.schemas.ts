import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ============= Message Schema =============
export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ trim: true })
  content?: string;

  @Prop()
  imgUrl?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, createdAt: -1 });

// ============= Conversation Schema =============
export type ConversationDocument = Conversation & Document;

@Schema({ _id: false })
class Participant {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;
}

@Schema({ _id: false })
class Group {
  @Prop({ trim: true })
  name?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

@Schema({ _id: false })
class LastMessage {
  @Prop()
  _id?: string;

  @Prop({ default: null })
  content?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  senderId?: Types.ObjectId;

  @Prop({ default: null })
  createdAt?: Date;
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: String, enum: ['direct', 'group'], required: true })
  type: 'direct' | 'group';

  @Prop({ type: [Participant], required: true })
  participants: Participant[];

  @Prop({ type: [Group] })
  group?: Group[];

  @Prop()
  lastMessageAt?: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  seenBy: Types.ObjectId[];

  @Prop({ type: LastMessage, default: null })
  lastMessage?: LastMessage;

  @Prop({ type: Map, of: Number, default: {} })
  unreadCounts: Map<string, number>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ 'participants.userId': 1, lastMessageAt: -1 });
