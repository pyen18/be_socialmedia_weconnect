import { ApiProperty } from '@nestjs/swagger';

export class PostAuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;
}

export class PostResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: PostAuthorDto })
  author: PostAuthorDto;

  @ApiProperty({ required: false })
  content?: string;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty()
  likesCount: number;

  @ApiProperty()
  commentsCount: number;

  @ApiProperty()
  sharesCount: number;

  @ApiProperty()
  isLikedByMe: boolean;

  @ApiProperty({ enum: ['public', 'friends', 'private'] })
  visibility: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PostsListResponseDto {
  @ApiProperty({ type: [PostResponseDto] })
  posts: PostResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasMore: boolean;
}

export class PostImagesResponseDto {
  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty()
  total: number;
}
