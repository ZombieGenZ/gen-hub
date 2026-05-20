import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from 'nestjs-i18n';
import { ImageUploadService } from '../../common/services/image-upload.service';
import { SystemLogService } from '../system-log/system-log.service';
import { ISignatureUploadResult } from './interfaces';

/**
 * Service xử lý chữ ký hợp đồng
 * - Upload chữ ký lên ImageKit (private mode)
 * - Generate signed URL có thời hạn
 * - Xóa chữ ký khi hợp đồng bị hủy/hết hạn
 */
@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);
  private readonly CONTRACT_PENDING_EXPIRE_HOURS: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageUploadService: ImageUploadService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    private readonly systemLogService: SystemLogService,
  ) {
    this.CONTRACT_PENDING_EXPIRE_HOURS =
      this.configService.get<number>('CONTRACT_PENDING_EXPIRE_HOURS') || 24;
  }

  /**
   * Upload chữ ký cho hợp đồng
   * @param contractId - ID hợp đồng
   * @param file - Buffer của file chữ ký (PNG)
   * @param userId - ID người upload
   * @param lang - Ngôn ngữ
   */
  async uploadSignature(
    contractId: string,
    file: Buffer,
    userId: string,
    lang: string,
  ): Promise<ISignatureUploadResult> {
    // Validate file format (chỉ chấp nhận PNG)
    const header = file.slice(0, 8);
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    if (!header.equals(pngSignature)) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.signature.invalid_format', { lang }),
      );
    }

    // Upload lên ImageKit (private mode)
    const uploadResult = await this.imageUploadService.uploadSignature(
      file,
      `signature_${Date.now()}.png`,
      contractId,
    );

    // Tính thời gian hết hạn
    const expiresAt = new Date(
      Date.now() + this.CONTRACT_PENDING_EXPIRE_HOURS * 60 * 60 * 1000,
    );

    // Lưu vào database
    const signature = await this.prisma.contractSignature.create({
      data: {
        rental_contract_id: contractId,
        imagekit_file_id: uploadResult.fileId,
        imagekit_url: uploadResult.url,
        expires_at: expiresAt,
        created_by: userId,
      },
    });

    // Generate signed URL
    const signedUrl = this.imageUploadService.getSignedUrl(
      uploadResult.name,
      this.CONTRACT_PENDING_EXPIRE_HOURS * 60 * 60, // Convert to seconds
    );

    // Log
    this.systemLogService.info(
      'contract-signature',
      'upload',
      `Uploaded signature for contract ${contractId}`,
      {
        userId,
        metaData: {
          contractId,
          signatureId: signature.id,
          expiresAt,
        },
      },
    );

    return {
      signatureId: signature.id,
      fileId: uploadResult.fileId,
      filePath: uploadResult.name,
      expiresAt,
      signedUrl,
    };
  }

  /**
   * Generate signed URL từ raw ImageKit URL (dùng để hiển thị cho admin/viewer)
   * Không check expiration — chỉ sinh URL có thời hạn ngắn để xem
   * @param imagekitUrl - Full URL của file trên ImageKit
   * @param expireSeconds - Thời gian hết hạn URL (giây), mặc định 8 giờ
   */
  getSignedUrlByRawUrl(imagekitUrl: string, expireSeconds = 3600 * 8): string {
    return this.imageUploadService.getSignedUrlFromSrc(
      imagekitUrl,
      expireSeconds,
    );
  }

  /**
   * Lấy signed URL cho chữ ký
   * @param signatureId - ID chữ ký
   */
  async getSignedUrl(signatureId: string): Promise<string | null> {
    const signature = await this.prisma.contractSignature.findUnique({
      where: { id: signatureId },
    });

    if (!signature || signature.is_deleted) {
      return null;
    }

    // Kiểm tra hết hạn
    if (signature.expires_at < new Date()) {
      return null;
    }

    // Generate signed URL (valid for 1 hour)
    return this.imageUploadService.getSignedUrl(signature.imagekit_url, 3600);
  }

  /**
   * Xóa chữ ký của hợp đồng (soft delete + xóa trên ImageKit)
   * @param contractId - ID hợp đồng
   */
  async deleteSignaturesByContract(contractId: string): Promise<void> {
    const signatures = await this.prisma.contractSignature.findMany({
      where: {
        rental_contract_id: contractId,
        is_deleted: false,
      },
    });

    for (const signature of signatures) {
      try {
        // Xóa trên ImageKit
        await this.imageUploadService.deleteSignature(
          signature.imagekit_file_id,
        );

        // Soft delete trong database
        await this.prisma.contractSignature.update({
          where: { id: signature.id },
          data: {
            is_deleted: true,
            deleted_at: new Date(),
          },
        });

        this.logger.log(
          `Deleted signature ${signature.id} for contract ${contractId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to delete signature ${signature.id}: ${error}`,
        );
      }
    }
  }

  /**
   * Xóa các chữ ký hết hạn (dùng cho cron job)
   */
  async cleanupExpiredSignatures(): Promise<number> {
    const expiredSignatures = await this.prisma.contractSignature.findMany({
      where: {
        expires_at: { lt: new Date() },
        is_deleted: false,
      },
      take: 100, // Xử lý batch để tránh quá tải
    });

    let deletedCount = 0;

    for (const signature of expiredSignatures) {
      try {
        // Xóa trên ImageKit
        await this.imageUploadService.deleteSignature(
          signature.imagekit_file_id,
        );

        // Soft delete trong database
        await this.prisma.contractSignature.update({
          where: { id: signature.id },
          data: {
            is_deleted: true,
            deleted_at: new Date(),
          },
        });

        deletedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to cleanup signature ${signature.id}: ${error}`,
        );
      }
    }

    if (deletedCount > 0) {
      this.systemLogService.info(
        'contract-signature',
        'cleanup',
        `Cleaned up ${deletedCount} expired signatures`,
        { metaData: { deletedCount } },
      );
    }

    return deletedCount;
  }
}
