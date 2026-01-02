import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../schemas/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { ResetPhotoDto } from './dto/reset-photo.dto';
import {
  UserProfileDto,
  UserPublicProfileDto,
  GetUserFriendsResponseDto,
} from './dto/user-response.dto';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin user hiện tại (own profile)' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: UserProfileDto,
  })
  async getMe(@CurrentUser() user: UserDocument) {
    return this.usersService.getMe(user._id.toString());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết user (public profile)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: UserPublicProfileDto,
  })
  @ApiResponse({ status: 404, description: 'Người dùng không tồn tại' })
  async getUserById(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.usersService.getUserById(id, user._id.toString());
  }

  @Patch('update-profile')
  @ApiOperation({ summary: 'Cập nhật profile của user' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(
      user._id.toString(),
      updateProfileDto,
    );
  }

  @Post('upload-photo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload ảnh profile hoặc cover' })
  @ApiResponse({ status: 200, description: 'Upload thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async uploadPhoto(
    @CurrentUser() user: UserDocument,
    @Body() uploadPhotoDto: UploadPhotoDto,
  ) {
    return this.usersService.uploadPhoto(user._id.toString(), uploadPhotoDto);
  }

  @Delete('reset-photo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset ảnh profile hoặc cover về mặc định' })
  @ApiResponse({ status: 200, description: 'Reset thành công' })
  async resetPhoto(
    @CurrentUser() user: UserDocument,
    @Body() resetPhotoDto: ResetPhotoDto,
  ) {
    return this.usersService.resetPhoto(user._id.toString(), resetPhotoDto);
  }

  @Get(':userId/friends')
  @ApiOperation({ summary: 'Lấy danh sách bạn bè của user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: GetUserFriendsResponseDto,
  })
  async getUserFriends(
    @CurrentUser() user: UserDocument,
    @Param('userId', ParseMongoIdPipe) userId: string,
  ) {
    return this.usersService.getUserFriends(userId, user._id.toString());
  }
}
