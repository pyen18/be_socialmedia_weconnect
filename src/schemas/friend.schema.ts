import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FriendDocument = Friend & Document;

@Schema({ timestamps: true })
export class Friend {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userA: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userB: Types.ObjectId;
}

export const FriendSchema = SchemaFactory.createForClass(Friend);

FriendSchema.pre<Friend>('save', function () {
  const a = this.userA.toString();
  const b = this.userB.toString();

  if (a > b) {
    this.userA = new Types.ObjectId(b);
    this.userB = new Types.ObjectId(a);
  }
});

FriendSchema.index({ userA: 1, userB: 1 }, { unique: true });
