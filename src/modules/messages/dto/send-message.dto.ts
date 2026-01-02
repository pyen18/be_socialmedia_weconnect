import {
  IsMongoId,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'ID của conversation' })
  @IsMongoId()
  @IsNotEmpty()
  conversationId: string;

  @ApiPropertyOptional({ description: 'Nội dung tin nhắn' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'URL hình ảnh' })
  @IsUrl()
  @IsOptional()
  imgUrl?: string;
}
