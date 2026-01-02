import {
  IsMongoId,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    type: [String],
    description: 'Danh sách user IDs (không bao gồm bản thân)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  participantIds: string[];

  @ApiPropertyOptional({ description: 'Tên nhóm (chỉ dùng cho group chat)' })
  @IsString()
  @IsOptional()
  groupName?: string;
}
