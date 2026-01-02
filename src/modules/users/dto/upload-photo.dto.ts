import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUrl,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadPhotoDto {
  @ApiProperty({ description: 'URL của ảnh đã upload' })
  @IsUrl()
  @IsNotEmpty()
  photoUrl: string;

  @ApiProperty({
    enum: ['avatar', 'cover'],
    description: 'Loại ảnh: avatar hoặc cover',
  })
  @IsEnum(['avatar', 'cover'])
  @IsNotEmpty()
  type: 'avatar' | 'cover';

  @ApiProperty({
    required: false,
    description: 'ID của ảnh trên cloud storage',
  })
  @IsString()
  @IsOptional()
  photoId?: string;
}
