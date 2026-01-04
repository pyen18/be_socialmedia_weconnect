import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      console.log('☁️  Cloudinary configured successfully');
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'social-media',
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          transformation: [
            { width: 1200, crop: 'limit' }, // Max width 1200px
            { quality: 'auto' }, // Auto quality
            { fetch_format: 'auto' }, // Auto format (WebP if supported)
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new BadRequestException(
                'Upload failed: ' + (error?.message ?? 'Unknown error'),
              ),
            );
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            size: result.bytes,
          });
        },
      );

      // Create readable stream from buffer (no need for streamifier)
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'social-media',
  ) {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteImage(publicId: string) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new BadRequestException('Delete failed: ' + error.message);
    }
  }

  async deleteMultipleImages(publicIds: string[]) {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      return result;
    } catch (error) {
      throw new BadRequestException('Bulk delete failed: ' + error.message);
    }
  }

  isConfigured(): boolean {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    return !!(cloudName && apiKey && apiSecret);
  }
}
