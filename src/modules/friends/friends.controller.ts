// src/modules/friends/friends.controller.ts
import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../schemas/user.schema';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';

@ApiTags('Friends')
@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('requests')
  @ApiOperation({ summary: 'Gửi lời mời kết bạn' })
  async sendFriendRequest(
    @CurrentUser() user: UserDocument,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendFriendRequest(user._id.toString(), dto);
  }

  @Post('requests/:requestId/accept')
  @ApiOperation({ summary: 'Chấp nhận lời mời kết bạn' })
  async acceptFriendRequest(
    @CurrentUser() user: UserDocument,
    @Param('requestId') requestId: string,
  ) {
    return this.friendsService.acceptFriendRequest(
      user._id.toString(),
      requestId,
    );
  }

  @Post('requests/:requestId/decline')
  @ApiOperation({ summary: 'Từ chối lời mời kết bạn' })
  async declineFriendRequest(
    @CurrentUser() user: UserDocument,
    @Param('requestId') requestId: string,
  ) {
    return this.friendsService.declineFriendRequest(
      user._id.toString(),
      requestId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bạn bè' })
  async getAllFriends(@CurrentUser() user: UserDocument) {
    return this.friendsService.getAllFriends(user._id.toString());
  }

  @Get('requests')
  @ApiOperation({ summary: 'Lấy danh sách lời mời kết bạn' })
  async getFriendRequests(@CurrentUser() user: UserDocument) {
    return this.friendsService.getFriendRequests(user._id.toString());
  }
}
