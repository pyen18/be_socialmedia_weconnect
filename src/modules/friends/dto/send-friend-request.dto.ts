// src/modules/friends/dto/send-friend-request.dto.ts
import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendFriendRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  message?: string;
}
