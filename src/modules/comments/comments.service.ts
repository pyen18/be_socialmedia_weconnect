import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from '../../schemas/comment.schema';
import { Post, PostDocument } from '../../schemas/post.schema';
import { CreateCommentDto } from '../posts/dto/likes-comments.dto';
import { UpdateCommentDto } from '../posts/dto/likes-comments.dto';
import { GetCommentsQueryDto } from '../posts/dto/likes-comments.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private notificationsService: NotificationsService,
  ) {}

  async createComment(userId: string, dto: CreateCommentDto) {
    const { postId, content, parentCommentId } = dto;

    // Check post exists
    const post = await this.postModel.findById(postId);
    if (!post || post.isDeleted) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Không tìm thấy bài viết',
      });
    }

    // If reply, check parent comment exists
    if (parentCommentId) {
      const parentComment = await this.commentModel.findById(parentCommentId);
      if (!parentComment || parentComment.isDeleted) {
        throw new NotFoundException({
          code: 'COMMENT_NOT_FOUND',
          message: 'Không tìm thấy comment gốc',
        });
      }
    }

    // Create comment
    const newComment = await this.commentModel.create({
      postId: new Types.ObjectId(postId),
      authorId: new Types.ObjectId(userId),
      content,
      parentCommentId: parentCommentId
        ? new Types.ObjectId(parentCommentId)
        : undefined,
      likesCount: 0,
      likedBy: [],
      isDeleted: false,
    });

    // Update post comments count
    post.commentsCount += 1;
    await post.save();

    // Send notification to post author (if not commenting on own post)
    if (post.authorId.toString() !== userId) {
      await this.notificationsService.createNotification({
        recipientId: post.authorId.toString(),
        senderId: userId,
        type: 'post_comment',
        entityId: postId,
        entityModel: 'Post',
        content: `đã bình luận: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        actionUrl: `/posts/${postId}`,
      });
    }

    // If reply, notify parent comment author
    if (parentCommentId) {
      const parentComment = await this.commentModel.findById(parentCommentId);
      if (parentComment && parentComment.authorId.toString() !== userId) {
        await this.notificationsService.createNotification({
          recipientId: parentComment.authorId.toString(),
          senderId: userId,
          type: 'comment_reply',
          entityId: parentCommentId,
          entityModel: 'Comment',
          content: `đã trả lời: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          actionUrl: `/posts/${postId}#comment-${parentCommentId}`,
        });
      }
    }

    await newComment.populate('authorId', 'username displayName avatarUrl');
    return this.mapToCommentDto(newComment, userId);
  }

  async getCommentsByPost(
    postId: string,
    userId: string,
    query: GetCommentsQueryDto,
  ) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Check post exists
    const post = await this.postModel.findById(postId);
    if (!post || post.isDeleted) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Không tìm thấy bài viết',
      });
    }

    const [comments, total] = await Promise.all([
      this.commentModel
        .find({
          postId,
          isDeleted: false,
          parentCommentId: null, // Only top-level comments
        })
        .populate('authorId', 'username displayName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.commentModel.countDocuments({
        postId,
        isDeleted: false,
        parentCommentId: null,
      }),
    ]);

    const commentDtos = comments.map((comment) =>
      this.mapToCommentDto(comment, userId),
    );

    return {
      comments: commentDtos,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getReplies(commentId: string, userId: string) {
    const replies = await this.commentModel
      .find({
        parentCommentId: commentId,
        isDeleted: false,
      })
      .populate('authorId', 'username displayName avatarUrl')
      .sort({ createdAt: 1 })
      .lean();

    return replies.map((reply) => this.mapToCommentDto(reply, userId));
  }

  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ) {
    const comment = await this.commentModel.findById(commentId);

    if (!comment || comment.isDeleted) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Không tìm thấy comment',
      });
    }

    if (comment.authorId.toString() !== userId) {
      throw new ForbiddenException({
        code: 'NOT_COMMENT_OWNER',
        message: 'Bạn chỉ có thể chỉnh sửa comment của mình',
      });
    }

    comment.content = dto.content;
    await comment.save();

    await comment.populate('authorId', 'username displayName avatarUrl');
    return this.mapToCommentDto(comment, userId);
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.commentModel.findById(commentId);

    if (!comment || comment.isDeleted) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Không tìm thấy comment',
      });
    }

    if (comment.authorId.toString() !== userId) {
      throw new ForbiddenException({
        code: 'NOT_COMMENT_OWNER',
        message: 'Bạn chỉ có thể xóa comment của mình',
      });
    }

    // Soft delete
    comment.isDeleted = true;
    await comment.save();

    // Update post comments count
    const post = await this.postModel.findById(comment.postId);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }

    return { message: 'Đã xóa comment' };
  }

  async likeComment(commentId: string, userId: string) {
    const comment = await this.commentModel.findById(commentId);

    if (!comment || comment.isDeleted) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Không tìm thấy comment',
      });
    }

    const userObjectId = new Types.ObjectId(userId);
    const alreadyLiked = comment.likedBy.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      // Unlike
      comment.likedBy = comment.likedBy.filter(
        (id) => id.toString() !== userId,
      );
      comment.likesCount = Math.max(0, comment.likesCount - 1);
    } else {
      // Like
      comment.likedBy.push(userObjectId);
      comment.likesCount += 1;

      // Notify comment author (if not liking own comment)
      if (comment.authorId.toString() !== userId) {
        await this.notificationsService.createNotification({
          recipientId: comment.authorId.toString(),
          senderId: userId,
          type: 'comment_like',
          entityId: commentId,
          entityModel: 'Comment',
          content: 'đã thích bình luận của bạn',
          actionUrl: `/posts/${comment.postId}#comment-${commentId}`,
        });
      }
    }

    await comment.save();

    return {
      isLiked: !alreadyLiked,
      likesCount: comment.likesCount,
    };
  }

  // Helper method
  private mapToCommentDto(comment: any, currentUserId: string) {
    const isLikedByMe =
      comment.likedBy?.some((id: any) => id.toString() === currentUserId) ||
      false;

    return {
      id: comment._id.toString(),
      postId: comment.postId.toString(),
      author: {
        id: comment.authorId._id.toString(),
        username: comment.authorId.username,
        displayName: comment.authorId.displayName,
        avatarUrl: comment.authorId.avatarUrl,
      },
      content: comment.content,
      parentCommentId: comment.parentCommentId?.toString(),
      likesCount: comment.likesCount || 0,
      isLikedByMe,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
