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
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../schemas/user.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostsQueryDto } from './dto/get-posts-query.dto';
import {
  PostResponseDto,
  PostsListResponseDto,
  PostImagesResponseDto,
} from './dto/post-response.dto';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';

@ApiTags('Posts')
@Controller('posts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo bài viết mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo bài viết thành công',
    type: PostResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createPost(
    @CurrentUser() user: UserDocument,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.postsService.createPost(user._id.toString(), createPostDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả bài viết (feed)' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: PostsListResponseDto,
  })
  async getAllPosts(
    @CurrentUser() user: UserDocument,
    @Query() query: GetPostsQueryDto,
  ) {
    return this.postsService.getAllPosts(user._id.toString(), query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy bài viết theo ID' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: PostResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  @ApiResponse({ status: 403, description: 'Không có quyền xem bài viết' })
  async getPostById(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.postsService.getPostById(id, user._id.toString());
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa bài viết' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa bài viết' })
  async deletePost(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.postsService.deletePost(id, user._id.toString());
  }

  @Get('author/:authorId')
  @ApiOperation({ summary: 'Lấy bài viết theo tác giả' })
  @ApiParam({ name: 'authorId', description: 'User ID của tác giả' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: PostsListResponseDto,
  })
  async getPostsByAuthor(
    @CurrentUser() user: UserDocument,
    @Param('authorId', ParseMongoIdPipe) authorId: string,
    @Query() query: GetPostsQueryDto,
  ) {
    return this.postsService.getPostsByAuthor(
      authorId,
      user._id.toString(),
      query,
    );
  }

  @Get('author/:authorId/images')
  @ApiOperation({ summary: 'Lấy tất cả ảnh của tác giả' })
  @ApiParam({ name: 'authorId', description: 'User ID của tác giả' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: PostImagesResponseDto,
  })
  async getPostImagesByAuthor(
    @Param('authorId', ParseMongoIdPipe) authorId: string,
  ) {
    return this.postsService.getPostImagesByAuthor(authorId);
  }
}
