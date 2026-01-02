import { ApiProperty } from '@nestjs/swagger';

export class UserBasicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;
}

export class FriendResponseDto {
  @ApiProperty({ type: [UserBasicDto] })
  friends: UserBasicDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  totalPages: number;
}
