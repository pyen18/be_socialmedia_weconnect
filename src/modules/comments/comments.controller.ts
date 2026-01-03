import {
  Controller,
  Get,
  Post,
  Patch,
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
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../schemas/user.schema';
import {
  CreateCommentDto,
  UpdateCommentDto,
  GetCommentsQueryDto,
  CommentResponseDto,
  CommentsListResponseDto,
} from '../posts/dto/likes-comments.dto';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';

@ApiTags('Comments')
@Controller('comments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo comment mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo comment thành công',
    type: CommentResponseDto,
  })
  async createComment(
    @CurrentUser() user: UserDocument,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(
      user._id.toString(),
      createCommentDto,
    );
  }

  @Get('post/:postId')
  @ApiOperation({ summary: 'Lấy comments của post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: CommentsListResponseDto,
  })
  async getCommentsByPost(
    @CurrentUser() user: UserDocument,
    @Param('postId', ParseMongoIdPipe) postId: string,
    @Query() query: GetCommentsQueryDto,
  ) {
    return this.commentsService.getCommentsByPost(
      postId,
      user._id.toString(),
      query,
    );
  }

  @Get(':commentId/replies')
  @ApiOperation({ summary: 'Lấy replies của comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getReplies(
    @CurrentUser() user: UserDocument,
    @Param('commentId', ParseMongoIdPipe) commentId: string,
  ) {
    return this.commentsService.getReplies(commentId, user._id.toString());
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateComment(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.updateComment(
      id,
      user._id.toString(),
      updateCommentDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async deleteComment(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.commentsService.deleteComment(id, user._id.toString());
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like/Unlike comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async likeComment(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.commentsService.likeComment(id, user._id.toString());
  }
}
