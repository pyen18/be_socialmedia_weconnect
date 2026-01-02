import {
  Controller,
  Get,
  Post,
  Delete,
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
  ApiParam,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../schemas/user.schema';
import { SendMessageDto } from './dto/send-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { MessageDto, MessagesListDto } from './dto/message-response.dto';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gửi tin nhắn' })
  @ApiResponse({
    status: 201,
    description: 'Gửi thành công',
    type: MessageDto,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền gửi tin nhắn' })
  async sendMessage(
    @CurrentUser() user: UserDocument,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(
      user._id.toString(),
      sendMessageDto,
    );
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Lấy danh sách tin nhắn trong conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: MessagesListDto,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy conversation' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async getMessages(
    @CurrentUser() user: UserDocument,
    @Param('conversationId', ParseMongoIdPipe) conversationId: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.messagesService.getMessages(
      conversationId,
      user._id.toString(),
      query,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa tin nhắn' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tin nhắn' })
  @ApiResponse({ status: 403, description: 'Chỉ xóa tin nhắn của mình' })
  async deleteMessage(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.messagesService.deleteMessage(id, user._id.toString());
  }
}
