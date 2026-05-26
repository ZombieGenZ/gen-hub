import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { BackblazeB2Service } from '../backblaze-b2/backblaze-b2.service';
import { WarehouseLegalDocType, DocReviewStatus } from '@prisma/client';

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

@Injectable()
export class WarehouseLegalDocService {
  private readonly logger = new Logger(WarehouseLegalDocService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly b2: BackblazeB2Service,
    @InjectQueue('warehouse-doc-analysis') private readonly analysisQueue: Queue,
  ) {}

  async upload(
    warehouseTemplateId: string,
    documentType: WarehouseLegalDocType,
    file: Express.Multer.File,
  ) {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        'Chỉ chấp nhận file JPG, PNG, WEBP hoặc PDF',
      );
    }

    const ext = file.originalname.split('.').pop() ?? 'bin';
    const fileName = `${warehouseTemplateId}_${documentType}_${Date.now()}.${ext}`;

    const uploaded = await this.b2.uploadBuffer(
      file.buffer,
      fileName,
      file.mimetype,
      'legal-documents',
    );

    if (!uploaded) {
      throw new BadRequestException('Không thể upload file lên storage');
    }

    const doc = await this.prisma.warehouseLegalDocument.create({
      data: {
        warehouse_template_id: warehouseTemplateId,
        document_type: documentType,
        file_url: uploaded.key,
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
      },
    });

    // Kích hoạt job phân tích AI (fire-and-forget)
    void this.analysisQueue
      .add('analyze-document', { documentId: doc.id })
      .catch((err) => this.logger.error('Failed to queue doc analysis:', err));

    return doc;
  }

  async list(warehouseTemplateId: string, reviewStatus?: DocReviewStatus) {
    return this.prisma.warehouseLegalDocument.findMany({
      where: {
        warehouse_template_id: warehouseTemplateId,
        is_deleted: false,
        ...(reviewStatus ? { review_status: reviewStatus } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async listAllPending(reviewStatus?: DocReviewStatus) {
    return this.prisma.warehouseLegalDocument.findMany({
      where: {
        is_deleted: false,
        review_status: reviewStatus ?? 'PENDING',
        ai_status: 'DONE',
      },
      include: {
        warehouse_template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async getSignedUrl(documentId: string): Promise<{ url: string }> {
    const doc = await this.prisma.warehouseLegalDocument.findFirst({
      where: { id: documentId, is_deleted: false },
    });
    if (!doc) throw new NotFoundException('Tài liệu không tồn tại');

    const url = await this.b2.getDownloadUrl(doc.file_url, 3600);
    if (!url) throw new BadRequestException('Không thể tạo URL tải xuống');

    return { url };
  }

  async delete(documentId: string, userId: string) {
    const doc = await this.prisma.warehouseLegalDocument.findFirst({
      where: { id: documentId, is_deleted: false },
    });
    if (!doc) throw new NotFoundException('Tài liệu không tồn tại');

    await this.b2.deleteFile(doc.file_url).catch(() => {});

    return this.prisma.warehouseLegalDocument.update({
      where: { id: documentId },
      data: { is_deleted: true, deleted_at: new Date(), deleted_by: userId },
    });
  }
}
