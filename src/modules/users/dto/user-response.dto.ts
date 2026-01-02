import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UserPublicProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ description: 'Có phải bạn bè không' })
  isFriend: boolean;

  @ApiProperty({ description: 'Đã gửi lời mời kết bạn chưa' })
  friendRequestSent: boolean;

  @ApiProperty({ description: 'Có lời mời kết bạn từ user này chưa' })
  friendRequestReceived: boolean;
}

export class UserBasicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional()
  avatarUrl?: string;
}

export class GetUserFriendsResponseDto {
  @ApiProperty({ type: [UserBasicDto] })
  friends: UserBasicDto[];

  @ApiProperty()
  total: number;
}
