// ==================== COMMENT DTOs ====================

import {
  IsMongoId,
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Create Comment DTO
export class CreateCommentDto {
  @ApiProperty({ description: 'ID của post' })
  @IsMongoId()
  @IsNotEmpty()
  postId: string;

  @ApiProperty({ description: 'Nội dung comment', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: 'ID của comment cha (nếu là reply)' })
  @IsMongoId()
  @IsOptional()
  parentCommentId?: string;
}

// Update Comment DTO
export class UpdateCommentDto {
  @ApiProperty({ description: 'Nội dung comment mới', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}

// Get Comments Query DTO
export class GetCommentsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

// Comment Author DTO
export class CommentAuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;
}

// Comment Response DTO
export class CommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  postId: string;

  @ApiProperty({ type: CommentAuthorDto })
  author: CommentAuthorDto;

  @ApiProperty()
  content: string;

  @ApiProperty({ required: false })
  parentCommentId?: string;

  @ApiProperty()
  likesCount: number;

  @ApiProperty()
  isLikedByMe: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Comments List Response DTO
export class CommentsListResponseDto {
  @ApiProperty({ type: [CommentResponseDto] })
  comments: CommentResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  totalPages: number;
}

// ==================== LIKE DTOs ====================

// Like/Unlike DTO
export class LikePostDto {
  @ApiProperty({ description: 'ID của post' })
  @IsMongoId()
  @IsNotEmpty()
  postId: string;
}

export class LikeCommentDto {
  @ApiProperty({ description: 'ID của comment' })
  @IsMongoId()
  @IsNotEmpty()
  commentId: string;
}

// Likes List Response DTO
export class LikeUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;
}

export class PostLikesResponseDto {
  @ApiProperty({ type: [LikeUserDto] })
  users: LikeUserDto[];

  @ApiProperty()
  total: number;
}
