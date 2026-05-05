import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import ImageKit = require('imagekit');

/**
 * Vị trí watermark được hỗ trợ
 */
export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ImageUploadResult {
  url: string;
  thumbnailUrl: string;
  fileId: string;
  name: string;
  size: number;
}

/**
 * Service xử lý upload ảnh lên ImageKit
 * - Nén ảnh với Sharp (đảm bảo chất lượng)
 * - Thêm watermark (configurable)
 */
@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);
  private imagekit: ImageKit;

  private readonly watermarkEnabled: boolean;
  private readonly watermarkPath: string;
  private readonly watermarkPosition: WatermarkPosition;
  private readonly watermarkOpacity: number;

  constructor(private readonly configService: ConfigService) {
    // Khởi tạo ImageKit
    this.imagekit = new ImageKit({
      publicKey: this.configService.get<string>('IMAGEKIT_PUBLIC_KEY') || '',
      privateKey: this.configService.get<string>('IMAGEKIT_PRIVATE_KEY') || '',
      urlEndpoint:
        this.configService.get<string>('IMAGEKIT_URL_ENDPOINT') || '',
    });

    // Cấu hình watermark
    this.watermarkEnabled =
      this.configService.get<string>('WATERMARK_ENABLED') === 'true';
    this.watermarkPath =
      this.configService.get<string>('WATERMARK_PATH') ||
      './assets/watermark.png';
    this.watermarkPosition = (this.configService.get<string>(
      'WATERMARK_POSITION',
    ) || 'bottom-right') as WatermarkPosition;
    this.watermarkOpacity = parseFloat(
      this.configService.get<string>('WATERMARK_OPACITY') || '0.5',
    );
  }

  /**
   * Xử lý và upload ảnh
   * @param file - Buffer của file ảnh
   * @param originalName - Tên file gốc
   * @param folder - Thư mục lưu trên ImageKit
   */
  async processAndUpload(
    file: Buffer,
    originalName: string,
    folder: string = '/warehouse-templates',
  ): Promise<ImageUploadResult> {
    // Bước 1: Nén ảnh
    let processedImage = await this.compressImage(file);

    // Bước 2: Thêm watermark nếu enabled
    if (this.watermarkEnabled) {
      processedImage = await this.addWatermark(processedImage);
    }

    // Bước 3: Upload lên ImageKit
    const result = await this.uploadToImageKit(
      processedImage,
      originalName,
      folder,
    );

    return result;
  }

  /**
   * Nén ảnh với Sharp
   * - Max width: 1920px
   * - Quality: 80%
   * - Format: JPEG hoặc PNG tùy thuộc vào ảnh gốc
   */
  private async compressImage(buffer: Buffer): Promise<Buffer> {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Resize nếu quá lớn (max width 1920px)
    if (metadata.width && metadata.width > 1920) {
      image.resize(1920, null, { withoutEnlargement: true });
    }

    // Nén dựa trên format gốc
    if (metadata.format === 'png') {
      return image.png({ quality: 80, compressionLevel: 8 }).toBuffer();
    } else {
      return image.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    }
  }

  /**
   * Thêm watermark vào ảnh
   * Watermark sẽ tự co dãn để chiếm khoảng 15% chiều rộng ảnh
   */
  private async addWatermark(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        return imageBuffer;
      }

      // Đọc watermark
      let watermark: sharp.Sharp;
      try {
        watermark = sharp(this.watermarkPath);
      } catch {
        this.logger.warn(
          `Không tìm thấy file watermark: ${this.watermarkPath}`,
        );
        return imageBuffer;
      }

      // Tính toán kích thước watermark (15% chiều rộng ảnh)
      const watermarkWidth = Math.round(metadata.width * 0.15);
      const resizedWatermark = await watermark
        .resize(watermarkWidth, null, { withoutEnlargement: true })
        .toBuffer();

      // Tính toán vị trí watermark
      const position = this.calculateWatermarkPosition(
        metadata.width,
        metadata.height,
        watermarkWidth,
        this.watermarkPosition,
      );

      // Composite watermark lên ảnh
      return image
        .composite([
          {
            input: resizedWatermark,
            top: position.top,
            left: position.left,
            blend: 'over',
          },
        ])
        .toBuffer();
    } catch (error) {
      this.logger.error(`Lỗi khi thêm watermark: ${error}`);
      return imageBuffer;
    }
  }

  /**
   * Tính toán vị trí watermark dựa trên position
   */
  private calculateWatermarkPosition(
    imageWidth: number,
    imageHeight: number,
    watermarkWidth: number,
    position: WatermarkPosition,
  ): { top: number; left: number } {
    const watermarkHeight = Math.round(watermarkWidth * 0.5); // Ước tính tỉ lệ
    const padding = 20; // Khoảng cách từ viền

    const positions: Record<WatermarkPosition, { top: number; left: number }> =
      {
        'top-left': { top: padding, left: padding },
        'top-center': {
          top: padding,
          left: Math.round((imageWidth - watermarkWidth) / 2),
        },
        'top-right': {
          top: padding,
          left: imageWidth - watermarkWidth - padding,
        },
        'center-left': {
          top: Math.round((imageHeight - watermarkHeight) / 2),
          left: padding,
        },
        center: {
          top: Math.round((imageHeight - watermarkHeight) / 2),
          left: Math.round((imageWidth - watermarkWidth) / 2),
        },
        'center-right': {
          top: Math.round((imageHeight - watermarkHeight) / 2),
          left: imageWidth - watermarkWidth - padding,
        },
        'bottom-left': {
          top: imageHeight - watermarkHeight - padding,
          left: padding,
        },
        'bottom-center': {
          top: imageHeight - watermarkHeight - padding,
          left: Math.round((imageWidth - watermarkWidth) / 2),
        },
        'bottom-right': {
          top: imageHeight - watermarkHeight - padding,
          left: imageWidth - watermarkWidth - padding,
        },
      };

    return positions[position];
  }

  /**
   * Upload ảnh lên ImageKit
   */
  private async uploadToImageKit(
    buffer: Buffer,
    fileName: string,
    folder: string,
  ): Promise<ImageUploadResult> {
    const result = await this.imagekit.upload({
      file: buffer,
      fileName: fileName,
      folder: folder,
      useUniqueFileName: true,
    });

    return {
      url: result.url,
      thumbnailUrl: result.thumbnailUrl || result.url,
      fileId: result.fileId,
      name: result.name,
      size: result.size,
    };
  }

  /**
   * Xóa ảnh trên ImageKit
   */
  async deleteImage(fileId: string): Promise<void> {
    try {
      await this.imagekit.deleteFile(fileId);
    } catch (error) {
      this.logger.error(`Lỗi khi xóa ảnh trên ImageKit: ${error}`);
      throw error;
    }
  }

  /**
   * Upload nhiều ảnh
   */
  async processAndUploadMultiple(
    files: { buffer: Buffer; originalname: string }[],
    folder: string = '/warehouse-templates',
  ): Promise<ImageUploadResult[]> {
    const results: ImageUploadResult[] = [];

    for (const file of files) {
      const result = await this.processAndUpload(
        file.buffer,
        file.originalname,
        folder,
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Upload chữ ký (private mode - không compress, không watermark)
   * @param file - Buffer của file chữ ký (PNG)
   * @param originalName - Tên file gốc
   * @param contractId - ID hợp đồng
   */
  async uploadSignature(
    file: Buffer,
    originalName: string,
    contractId: string,
  ): Promise<ImageUploadResult> {
    const folder = `/signatures/${contractId}`;

    const result = await this.imagekit.upload({
      file: file,
      fileName: originalName,
      folder: folder,
      useUniqueFileName: true,
      isPrivateFile: true, // Upload ở chế độ private
    });

    return {
      url: result.url,
      thumbnailUrl: result.thumbnailUrl || result.url,
      fileId: result.fileId,
      name: result.name,
      size: result.size,
    };
  }

  /**
   * Generate signed URL cho file private (có thời hạn)
   * @param filePath - Path của file trong ImageKit (relative path)
   * @param expireSeconds - Thời gian hết hạn (giây)
   */
  getSignedUrl(filePath: string, expireSeconds: number = 3600): string {
    return this.imagekit.url({
      path: filePath,
      signed: true,
      expireSeconds: expireSeconds,
    });
  }

  /**
   * Generate signed URL từ full URL của file private (có thời hạn)
   * Dùng khi có sẵn full URL thay vì relative path
   * @param fileUrl - Full URL của file trên ImageKit
   * @param expireSeconds - Thời gian hết hạn (giây)
   */
  getSignedUrlFromSrc(fileUrl: string, expireSeconds: number = 3600): string {
    return this.imagekit.url({
      src: fileUrl,
      signed: true,
      expireSeconds: expireSeconds,
    });
  }

  /**
   * Xóa ảnh trên ImageKit theo file ID
   */
  async deleteSignature(fileId: string): Promise<void> {
    try {
      await this.imagekit.deleteFile(fileId);
    } catch (error) {
      this.logger.error(`Lỗi khi xóa chữ ký trên ImageKit: ${error}`);
      throw error;
    }
  }
}
