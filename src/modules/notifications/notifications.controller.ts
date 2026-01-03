import {
  Controller,
  Get,
  Post,
  Delete,
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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../schemas/user.schema';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getNotifications(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getNotifications(
      user._id.toString(),
      page,
      limit,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Lấy số lượng notifications chưa đọc' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getUnreadCount(@CurrentUser() user: UserDocument) {
    return this.notificationsService.getUnreadCount(user._id.toString());
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu notification là đã đọc' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async markAsRead(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(id, user._id.toString());
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu tất cả notifications là đã đọc' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async markAllAsRead(@CurrentUser() user: UserDocument) {
    return this.notificationsService.markAllAsRead(user._id.toString());
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async deleteNotification(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.notificationsService.deleteNotification(
      id,
      user._id.toString(),
    );
  }
}
