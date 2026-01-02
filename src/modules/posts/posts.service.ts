import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../../schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostsQueryDto } from './dto/get-posts-query.dto';
import { PostResponseDto, PostsListResponseDto } from './dto/post-response.dto';

@Injectable()
export class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async createPost(userId: string, dto: CreatePostDto) {
    const { content, images = [], visibility = 'public' } = dto;

    // Validate: Phải có content hoặc images
    if (!content && images.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_POST',
        message: 'Bài viết phải có nội dung hoặc ảnh',
      });
    }

    const newPost = await this.postModel.create({
      authorId: userId,
      content: content || '',
      images,
      visibility,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      likedBy: [],
      isDeleted: false,
    });

    // Populate author info
    await newPost.populate('authorId', 'username displayName avatarUrl');

    return this.mapToPostResponse(newPost, userId);
  }

  async getAllPosts(userId: string, query: GetPostsQueryDto) {
    const { page = 1, limit = 20, sortBy = 'latest' } = query;
    const skip = (page - 1) * limit;

    // Build sort criteria
    const sortCriteria: any = {};
    if (sortBy === 'latest') {
      sortCriteria.createdAt = -1;
    } else if (sortBy === 'popular') {
      sortCriteria.likesCount = -1;
      sortCriteria.createdAt = -1;
    }

    // Query posts (public + friends posts)
    const [posts, total] = await Promise.all([
      this.postModel
        .find({
          isDeleted: false,
          $or: [
            { visibility: 'public' },
            { authorId: userId }, // Own posts
          ],
        })
        .populate('authorId', 'username displayName avatarUrl')
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.postModel.countDocuments({
        isDeleted: false,
        $or: [{ visibility: 'public' }, { authorId: userId }],
      }),
    ]);

    const postResponses = posts.map((post: any) =>
      this.mapToPostResponse(post, userId),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      posts: postResponses,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  async getPostById(postId: string, userId: string) {
    const post = await this.postModel
      .findOne({ _id: postId, isDeleted: false })
      .populate('authorId', 'username displayName avatarUrl')
      .lean();

    if (!post) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Không tìm thấy bài viết',
      });
    }

    // Check visibility
    if (
      post.visibility === 'private' &&
      post.authorId._id.toString() !== userId
    ) {
      throw new ForbiddenException({
        code: 'POST_PRIVATE',
        message: 'Bạn không có quyền xem bài viết này',
      });
    }

    return this.mapToPostResponse(post, userId);
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.postModel.findOne({
      _id: postId,
      isDeleted: false,
    });

    if (!post) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Không tìm thấy bài viết',
      });
    }

    // Check ownership
    if (post.authorId.toString() !== userId) {
      throw new ForbiddenException({
        code: 'NOT_POST_OWNER',
        message: 'Bạn chỉ có thể xóa bài viết của mình',
      });
    }

    // Soft delete
    post.isDeleted = true;
    await post.save();

    return {
      message: 'Đã xóa bài viết thành công',
    };
  }

  async getPostsByAuthor(
    authorId: string,
    userId: string,
    query: GetPostsQueryDto,
  ) {
    const { page = 1, limit = 20, sortBy = 'latest' } = query;
    const skip = (page - 1) * limit;

    const sortCriteria: any = {};
    if (sortBy === 'latest') {
      sortCriteria.createdAt = -1;
    } else if (sortBy === 'popular') {
      sortCriteria.likesCount = -1;
      sortCriteria.createdAt = -1;
    }

    // Build query based on viewer
    const query_filter: any = {
      authorId,
      isDeleted: false,
    };

    // If viewing own profile, show all posts
    // If viewing others, only show public posts
    if (authorId !== userId) {
      query_filter.visibility = 'public';
    }

    const [posts, total] = await Promise.all([
      this.postModel
        .find(query_filter)
        .populate('authorId', 'username displayName avatarUrl')
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.postModel.countDocuments(query_filter),
    ]);

    const postResponses = posts.map((post: any) =>
      this.mapToPostResponse(post, userId),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      posts: postResponses,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  async getPostImagesByAuthor(authorId: string) {
    const posts = await this.postModel
      .find({
        authorId,
        isDeleted: false,
        images: { $exists: true, $ne: [] },
      })
      .select('images')
      .sort({ createdAt: -1 })
      .lean();

    // Flatten all images
    const allImages: string[] = [];
    posts.forEach((post: any) => {
      allImages.push(...post.images);
    });

    return {
      images: allImages,
      total: allImages.length,
    };
  }

  // Helper method to map post to response DTO
  private mapToPostResponse(post: any, currentUserId: string): PostResponseDto {
    const isLikedByMe =
      post.likedBy?.some((id: any) => id.toString() === currentUserId) || false;

    return {
      id: post._id.toString(),
      author: {
        id: post.authorId._id.toString(),
        username: post.authorId.username,
        displayName: post.authorId.displayName,
        avatarUrl: post.authorId.avatarUrl,
      },
      content: post.content,
      images: post.images || [],
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      sharesCount: post.sharesCount || 0,
      isLikedByMe,
      visibility: post.visibility,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}
