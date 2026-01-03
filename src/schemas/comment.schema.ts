import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true, index: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  authorId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'Comment' })
  parentCommentId?: Types.ObjectId;

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likedBy: Types.ObjectId[];

  @Prop({ default: false })
  isDeleted: boolean;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Indexes
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ authorId: 1, createdAt: -1 });
CommentSchema.index({ parentCommentId: 1 });
