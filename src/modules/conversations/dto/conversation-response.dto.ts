import { ApiProperty } from '@nestjs/swagger';

export class ParticipantDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;

  @ApiProperty()
  joinedAt: Date;
}

export class LastMessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  createdAt: Date;
}

export class ConversationDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['direct', 'group'] })
  type: 'direct' | 'group';

  @ApiProperty({ type: [ParticipantDto] })
  participants: ParticipantDto[];

  @ApiProperty({ required: false })
  groupName?: string;

  @ApiProperty({ required: false, type: LastMessageDto })
  lastMessage?: LastMessageDto;

  @ApiProperty({ required: false })
  lastMessageAt?: Date;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ConversationsListDto {
  @ApiProperty({ type: [ConversationDto] })
  conversations: ConversationDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  totalPages: number;
}
