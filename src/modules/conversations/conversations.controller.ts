import {
  Controller,
  Get,
  Post,
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
import { ConversationsService } from './conversation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../schemas/user.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { GetConversationsQueryDto } from './dto/get-conversations-query.dto';
import { MarkAsReadDto } from '../messages/dto/mark-as-read.dto';
import {
  ConversationDto,
  ConversationsListDto,
} from './dto/conversation-response.dto';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';

@ApiTags('Conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo cuộc hội thoại mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
    type: ConversationDto,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Chỉ nhắn tin với bạn bè' })
  async createConversation(
    @CurrentUser() user: UserDocument,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    return this.conversationsService.createConversation(
      user._id.toString(),
      createConversationDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách conversations' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: ConversationsListDto,
  })
  async getConversations(
    @CurrentUser() user: UserDocument,
    @Query() query: GetConversationsQueryDto,
  ) {
    return this.conversationsService.getConversations(
      user._id.toString(),
      query,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: ConversationDto,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy conversation' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async getConversationById(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.conversationsService.getConversationById(
      id,
      user._id.toString(),
    );
  }

  @Post('mark-as-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu conversation là đã đọc' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async markAsRead(
    @CurrentUser() user: UserDocument,
    @Body() markAsReadDto: MarkAsReadDto,
  ) {
    return this.conversationsService.markAsRead(
      markAsReadDto.conversationId,
      user._id.toString(),
    );
  }

  @Get('direct/:userId')
  @ApiOperation({ summary: 'Lấy hoặc tạo conversation với user (shortcut)' })
  @ApiParam({ name: 'userId', description: 'User ID để nhắn tin' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    schema: {
      example: {
        conversation: {
          id: 'conv_id',
          type: 'direct',
          participants: [],
        },
        isNew: false,
      },
    },
  })
  async getOrCreateDirectConversation(
    @CurrentUser() user: UserDocument,
    @Param('userId', ParseMongoIdPipe) userId: string,
  ) {
    return this.conversationsService.getOrCreateDirectConversation(
      user._id.toString(),
      userId,
    );
  }
}
