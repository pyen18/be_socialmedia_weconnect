import { ApiProperty } from '@nestjs/swagger';

export class MessageSenderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;
}

export class MessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty({ type: MessageSenderDto })
  sender: MessageSenderDto;

  @ApiProperty({ required: false })
  content?: string;

  @ApiProperty({ required: false })
  imgUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MessagesListDto {
  @ApiProperty({ type: [MessageDto] })
  messages: MessageDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  hasMore: boolean;
}
