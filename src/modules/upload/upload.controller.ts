import {
  Controller,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../schemas/user.schema';
import { UploadService } from './upload.service';
import { CloudinaryService } from './cloudinary.service';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload single image (Local Storage)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Upload thành công',
    schema: {
      example: {
        url: 'http://localhost:5002/uploads/user123_abc-def-123.jpg',
        filename: 'user123_abc-def-123.jpg',
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 245678,
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @CurrentUser() user: UserDocument,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.uploadService.uploadSingle(file, user._id.toString());
  }

  @Post('images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload multiple images (Local Storage)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Upload thành công',
    schema: {
      example: [
        {
          url: 'http://localhost:5002/uploads/user123_abc-def-123.jpg',
          filename: 'user123_abc-def-123.jpg',
          originalName: 'photo1.jpg',
          mimeType: 'image/jpeg',
          size: 245678,
        },
        {
          url: 'http://localhost:5002/uploads/user123_xyz-789.png',
          filename: 'user123_xyz-789.png',
          originalName: 'photo2.png',
          mimeType: 'image/png',
          size: 189234,
        },
      ],
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadImages(
    @CurrentUser() user: UserDocument,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return this.uploadService.uploadMultiple(files, user._id.toString());
  }

  @Post('cloudinary/image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload single image (Cloudinary)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Upload thành công',
    schema: {
      example: {
        url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/social-media/abc123.jpg',
        publicId: 'social-media/abc123',
        format: 'jpg',
        width: 1200,
        height: 800,
        size: 245678,
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadToCloudinary(
    @CurrentUser() user: UserDocument,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.cloudinaryService.isConfigured()) {
      throw new BadRequestException(
        'Cloudinary is not configured. Please set CLOUDINARY_* environment variables.',
      );
    }

    return this.cloudinaryService.uploadImage(file, `users/${user._id}`);
  }

  @Post('cloudinary/images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload multiple images (Cloudinary)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleToCloudinary(
    @CurrentUser() user: UserDocument,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (!this.cloudinaryService.isConfigured()) {
      throw new BadRequestException(
        'Cloudinary is not configured. Please set CLOUDINARY_* environment variables.',
      );
    }

    return this.cloudinaryService.uploadMultipleImages(
      files,
      `users/${user._id}`,
    );
  }

  @Delete('file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete file from local storage' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          example: 'user123_abc-def-123.jpg',
        },
      },
    },
  })
  async deleteFile(@Body('filename') filename: string) {
    if (!filename) {
      throw new BadRequestException('Filename is required');
    }

    return this.uploadService.deleteFile(filename);
  }

  @Delete('cloudinary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete file from Cloudinary' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        publicId: {
          type: 'string',
          example: 'social-media/abc123',
        },
      },
    },
  })
  async deleteFromCloudinary(@Body('publicId') publicId: string) {
    if (!publicId) {
      throw new BadRequestException('Public ID is required');
    }

    if (!this.cloudinaryService.isConfigured()) {
      throw new BadRequestException('Cloudinary is not configured');
    }

    return this.cloudinaryService.deleteImage(publicId);
  }
}
