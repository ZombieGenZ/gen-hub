import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import { IB2UploadResult, IB2FileInfo } from './types/backblaze-b2.type';

/**
 * Service xử lý tích hợp Backblaze B2 (S3-compatible storage)
 * Sử dụng pre-signed URLs cho việc download (Private bucket)
 *
 * Ưu điểm:
 * - Chi phí lưu trữ rất thấp ($0.006/GB)
 * - S3-compatible API
 * - Pre-signed URLs bảo mật
 */
@Injectable()
export class BackblazeB2Service implements OnModuleInit {
  private readonly logger = new Logger(BackblazeB2Service.name);
  private s3Client: S3Client;
  private isEnabled = false;
  private bucketName: string;
  private defaultFolder: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Khởi tạo S3 Client với Backblaze B2 endpoint
   */
  private async initialize() {
    const keyId = this.configService.get<string>('B2_KEY_ID');
    const applicationKey = this.configService.get<string>('B2_APPLICATION_KEY');
    const endpoint = this.configService.get<string>('B2_ENDPOINT');
    this.bucketName = this.configService.get<string>('B2_BUCKET_NAME', '');
    this.defaultFolder = this.configService.get<string>(
      'B2_DEFAULT_FOLDER',
      'backups',
    );

    if (!keyId || !applicationKey || !endpoint || !this.bucketName) {
      this.logger.warn(
        '⚠️ Backblaze B2 service disabled: Missing credentials, endpoint, or bucket name',
      );
      return;
    }

    try {
      // Tạo S3 Client với B2 endpoint
      // Endpoint format: https://s3.{region}.backblazeb2.com
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: endpoint,
        credentials: {
          accessKeyId: keyId,
          secretAccessKey: applicationKey,
        },
      });

      // Kiểm tra kết nối bằng cách list objects
      await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          MaxKeys: 1,
        }),
      );

      this.isEnabled = true;
      this.logger.log('✅ Backblaze B2 service initialized successfully');
      this.logger.log(`📦 Bucket: ${this.bucketName}`);
    } catch (error) {
      this.logger.error('❌ Failed to initialize Backblaze B2 service:', error);
    }
  }

  /**
   * Kiểm tra xem service có được enable không
   */
  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Upload file lên Backblaze B2
   * @param filePath Đường dẫn file local
   * @param fileName Tên file trên B2 (optional, mặc định lấy từ filePath)
   * @param folder Thư mục trên B2 (optional)
   */
  async uploadFile(
    filePath: string,
    fileName?: string,
    folder?: string,
  ): Promise<IB2UploadResult | null> {
    if (!this.isEnabled) {
      this.logger.warn('Backblaze B2 service is not enabled');
      return null;
    }

    const targetFolder = folder || this.defaultFolder;

    try {
      const fileStats = fs.statSync(filePath);
      const name = fileName || path.basename(filePath);
      const key = `${targetFolder}/${name}`;

      const fileBuffer = fs.readFileSync(filePath);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: 'application/zip',
        }),
      );

      // Build friendly URL từ B2_FRIENDLY_URL hoặc endpoint mặc định
      const friendlyUrlBase = this.configService.get<string>(
        'B2_FRIENDLY_URL',
        '',
      );
      const friendlyUrl = friendlyUrlBase ? `${friendlyUrlBase}/${key}` : '';

      this.logger.log(`✅ Uploaded file: ${name} (Key: ${key})`);

      return {
        key,
        fileName: name,
        fileSize: fileStats.size,
        friendlyUrl,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to upload file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Liệt kê files trong bucket
   * @param folder Thư mục cần list (optional)
   */
  async listFiles(folder?: string): Promise<IB2FileInfo[]> {
    if (!this.isEnabled) return [];
    const targetFolder = folder || this.defaultFolder;

    try {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: targetFolder ? `${targetFolder}/` : undefined,
        }),
      );

      return (response.Contents || [])
        .filter((obj) => obj.Key && obj.Size && obj.Size > 0)
        .map((obj) => ({
          key: obj.Key!,
          name: path.basename(obj.Key!),
          size: obj.Size!,
          lastModified: obj.LastModified!,
        }))
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    } catch (error) {
      this.logger.error('❌ Failed to list files:', error);
      return [];
    }
  }

  /**
   * Xóa file trên B2
   * @param key Key của file trên B2
   */
  async deleteFile(key: string): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      this.logger.log(`✅ Deleted file: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to delete file ${key}:`, error);
      return false;
    }
  }

  /**
   * Tạo pre-signed URL để download file
   * @param key Key của file trên B2
   * @param expiresIn Thời gian hết hạn URL (giây), mặc định từ .env
   */
  async getDownloadUrl(
    key: string,
    expiresIn?: number,
  ): Promise<string | null> {
    if (!this.isEnabled) return null;

    const defaultExpiresIn = this.configService.get<number>(
      'B2_PRESIGNED_URL_EXPIRATION',
      3600,
    );
    const ttl = expiresIn || defaultExpiresIn;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: ttl,
      });
      return url;
    } catch (error) {
      this.logger.error(`❌ Failed to get download URL for ${key}:`, error);
      return null;
    }
  }

  /**
   * Upload buffer trực tiếp lên Backblaze B2 (dùng cho memory-based multer)
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    folder?: string,
  ): Promise<IB2UploadResult | null> {
    if (!this.isEnabled) {
      this.logger.warn('Backblaze B2 service is not enabled');
      return null;
    }

    const targetFolder = folder || 'legal-documents';
    const key = `${targetFolder}/${fileName}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      const friendlyUrlBase = this.configService.get<string>('B2_FRIENDLY_URL', '');
      const friendlyUrl = friendlyUrlBase ? `${friendlyUrlBase}/${key}` : '';

      this.logger.log(`✅ Uploaded buffer: ${fileName} (Key: ${key})`);

      return {
        key,
        fileName,
        fileSize: buffer.length,
        friendlyUrl,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to upload buffer ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Lấy thông tin file
   * @param key Key của file trên B2
   */
  async getFileInfo(key: string): Promise<IB2FileInfo | null> {
    if (!this.isEnabled) return null;

    try {
      const files = await this.listFiles(path.dirname(key));
      return files.find((f) => f.key === key) || null;
    } catch (error) {
      this.logger.error(`❌ Failed to get file info for ${key}:`, error);
      return null;
    }
  }
}
