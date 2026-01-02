import {
  IsMongoId,
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendFriendRequestDto {
  @ApiProperty({ description: 'User ID to send friend request to' })
  @IsMongoId({ message: 'Invalid user ID format' })
  @IsNotEmpty()
  to: string;

  @ApiProperty({ required: false, maxLength: 300 })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  message?: string;
}
