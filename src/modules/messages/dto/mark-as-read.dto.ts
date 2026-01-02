import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class MarkAsReadDto {
  @ApiProperty({ description: 'ID của conversation' })
  @IsMongoId()
  @IsNotEmpty()
  conversationId: string;
}
