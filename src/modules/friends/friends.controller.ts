import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../schemas/user.schema';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { GetFriendsQueryDto } from './dto/get-friends-query.dto';
import { FriendResponseDto } from './dto/friend-response.dto';
import { FriendRequestResponseDto } from './dto/friend-request-response.dto';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';

@ApiTags('Friends')
@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gửi lời mời kết bạn' })
  @ApiResponse({ status: 201, description: 'Đã gửi lời mời thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Người dùng không tồn tại' })
  @ApiResponse({ status: 409, description: 'Đã là bạn bè hoặc đã gửi request' })
  async sendFriendRequest(
    @CurrentUser() user: UserDocument,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendFriendRequest(user._id.toString(), dto);
  }

  @Post('requests/:requestId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chấp nhận lời mời kết bạn' })
  @ApiResponse({ status: 200, description: 'Đã chấp nhận thành công' })
  @ApiResponse({
    status: 400,
    description: 'Invalid request ID hoặc không có quyền',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lời mời' })
  async acceptFriendRequest(
    @CurrentUser() user: UserDocument,
    @Param('requestId', ParseMongoIdPipe) requestId: string,
  ) {
    return this.friendsService.acceptFriendRequest(
      user._id.toString(),
      requestId,
    );
  }

  @Post('requests/:requestId/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Từ chối lời mời kết bạn' })
  @ApiResponse({ status: 200, description: 'Đã từ chối thành công' })
  @ApiResponse({
    status: 400,
    description: 'Invalid request ID hoặc không có quyền',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lời mời' })
  async declineFriendRequest(
    @CurrentUser() user: UserDocument,
    @Param('requestId', ParseMongoIdPipe) requestId: string,
  ) {
    return this.friendsService.declineFriendRequest(
      user._id.toString(),
      requestId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bạn bè' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: FriendResponseDto,
  })
  async getAllFriends(
    @CurrentUser() user: UserDocument,
    @Query() query: GetFriendsQueryDto,
  ) {
    return this.friendsService.getAllFriends(user._id.toString(), query);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Lấy danh sách lời mời kết bạn' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: FriendRequestResponseDto,
  })
  async getFriendRequests(@CurrentUser() user: UserDocument) {
    return this.friendsService.getFriendRequests(user._id.toString());
  }
}
