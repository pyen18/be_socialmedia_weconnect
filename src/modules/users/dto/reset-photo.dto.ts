import { IsString, IsNotEmpty, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class ResetPhotoDto {
  @ApiProperty({
    enum: ['avatar', 'cover'],
    description: 'Loại ảnh cần reset',
  })
  @IsEnum(['avatar', 'cover'])
  @IsNotEmpty()
  type: 'avatar' | 'cover';
}
