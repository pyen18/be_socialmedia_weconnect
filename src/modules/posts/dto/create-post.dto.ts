import {
  IsString,
  IsOptional,
  MaxLength,
  IsArray,
  IsEnum,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiPropertyOptional({ maxLength: 5000, description: 'Nội dung bài viết' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({ type: [String], description: 'Danh sách URL ảnh' })
  @IsArray()
  @IsOptional()
  @IsUrl({ require_tld: false }, { each: true })
  images?: string[];

  @ApiPropertyOptional({
    enum: ['public', 'friends', 'private'],
    default: 'public',
    description: 'Quyền riêng tư của bài viết',
  })
  @IsEnum(['public', 'friends', 'private'])
  @IsOptional()
  visibility?: 'public' | 'friends' | 'private';
}
