import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private uploadDir: string;
  private maxFileSize: number;
  private allowedTypes: string[];
  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('upload.dir', './uploads');

    this.maxFileSize = this.configService.get<number>(
      'upload.maxFileSize',
      10 * 1024 * 1024, // 10MB
    );

    this.allowedTypes = this.configService.get<string[]>(
      'upload.allowedTypes',
      ['image/jpeg', 'image/png', 'image/webp'],
    );

    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      console.log(`📁 Created upload directory: ${this.uploadDir}`);
    }
  }

  async uploadSingle(file: Express.Multer.File, userId: string) {
    // Validate file
    this.validateFile(file);

    // Generate unique filename using crypto.randomUUID()
    const fileExt = path.extname(file.originalname);
    const fileName = `${userId}_${randomUUID()}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Return URL (trong production, nên dùng CDN hoặc cloud storage)
    const fileUrl = `${this.getBaseUrl()}/uploads/${fileName}`;

    return {
      url: fileUrl,
      filename: fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async uploadMultiple(files: Express.Multer.File[], userId: string) {
    const uploadedFiles: Array<{
      url: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
    }> = [];

    for (const file of files) {
      const result = await this.uploadSingle(file, userId);
      uploadedFiles.push(result);
    }

    return uploadedFiles;
  }

  async deleteFile(filename: string) {
    const filePath = path.join(this.uploadDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { message: 'File deleted successfully' };
    }

    throw new BadRequestException('File not found');
  }

  private validateFile(file: Express.Multer.File) {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    // Check file type
    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedTypes.join(', ')}`,
      );
    }
  }

  private getBaseUrl(): string {
    // Get BASE_URL from config (set via environment variable)
    const baseUrl = this.configService.get<string>('baseUrl');
    return (
      baseUrl || `http://localhost:${this.configService.get<number>('port')}`
    );
  }
}
