import { ApiProperty } from '@nestjs/swagger';
import { UserBasicDto } from './friend-response.dto';

export class FriendRequestItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: UserBasicDto })
  from: UserBasicDto;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty()
  createdAt: Date;
}

export class FriendRequestResponseDto {
  @ApiProperty({ type: [FriendRequestItemDto] })
  requests: FriendRequestItemDto[];

  @ApiProperty()
  total: number;
}
