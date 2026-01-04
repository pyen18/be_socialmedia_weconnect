import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Search query (username, displayName, email)',
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class SearchUserResultDto {
  @ApiPropertyOptional()
  id: string;

  @ApiPropertyOptional()
  username: string;

  @ApiPropertyOptional()
  displayName: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional({ description: 'Có phải bạn bè không' })
  isFriend: boolean;

  @ApiPropertyOptional({ description: 'Đã gửi friend request chưa' })
  hasSentRequest: boolean;

  @ApiPropertyOptional({ description: 'Có friend request từ user này chưa' })
  hasReceivedRequest: boolean;
}

export class SearchUsersResponseDto {
  @ApiPropertyOptional({ type: [SearchUserResultDto] })
  users: SearchUserResultDto[];

  @ApiPropertyOptional()
  total: number;

  @ApiPropertyOptional()
  page: number;

  @ApiPropertyOptional()
  totalPages: number;
}
