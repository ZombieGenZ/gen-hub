import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../ai-hub/services/gemini.service';
import { LocalLegalDocService } from '../ai-hub/services/local-legal-doc.service';
import { BackblazeB2Service } from '../backblaze-b2/backblaze-b2.service';
import type { TrustBadgeLevel } from '@prisma/client';

export interface AnalyzeDocumentJobData {
  documentId: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  BUSINESS_LICENSE: 'Giấy phép kinh doanh',
  WAREHOUSE_CERTIFICATE: 'Chứng nhận kho bãi',
  FIRE_SAFETY_CERTIFICATE: 'Giấy phòng cháy chữa cháy',
  LAND_USE_RIGHT: 'Quyền sử dụng đất',
  FOOD_SAFETY_CERTIFICATE: 'Giấy an toàn thực phẩm',
  OTHER: 'Tài liệu khác',
};

@Processor('warehouse-doc-analysis')
@Injectable()
export class WarehouseLegalDocProcessor {
  private readonly logger = new Logger(WarehouseLegalDocProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly localLegalDoc: LocalLegalDocService,
    private readonly b2: BackblazeB2Service,
  ) {}

  @Process('analyze-document')
  async handleAnalyzeDocument(job: Job<AnalyzeDocumentJobData>): Promise<void> {
    const { documentId } = job.data;
    this.logger.log(`Processing document analysis job: ${documentId}`);

    const doc = await this.prisma.warehouseLegalDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.is_deleted) {
      this.logger.warn(`Document ${documentId} not found or deleted`);
      return;
    }

    await this.prisma.warehouseLegalDocument.update({
      where: { id: documentId },
      data: { ai_status: 'PROCESSING' },
    });

    try {
      const signedUrl = await this.b2.getDownloadUrl(doc.file_url, 300);
      if (!signedUrl) throw new Error('Cannot get signed URL from B2');

      const response = await fetch(signedUrl);
      if (!response.ok)
        throw new Error(`Failed to fetch file: ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');

      const docTypeLabel = DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type;

      // Try local AI first; fall back to Gemini if unavailable or low confidence
      let result = await this.localLegalDoc.analyzeDocument(
        base64Data,
        doc.mime_type,
        doc.document_type,
      );

      if (!result || result.confidence < 0.35) {
        if (result) {
          this.logger.log(
            `Local AI confidence too low (${result.confidence}) for ${documentId} — using Gemini`,
          );
        }
        result = await this.gemini.analyzeDocument(
          base64Data,
          doc.mime_type,
          docTypeLabel,
        );
      } else {
        this.logger.log(
          `Local AI analysis success for ${documentId} (confidence=${result.confidence})`,
        );
      }

      await this.prisma.warehouseLegalDocument.update({
        where: { id: documentId },
        data: {
          ai_status: 'DONE',
          ai_confidence: result.confidence,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ai_extracted_data: result as any,
          ai_issues: result.issues,
          ai_analyzed_at: new Date(),
        },
      });

      await this.recomputeTrustScore(doc.warehouse_template_id);
      this.logger.log(`Document ${documentId} analyzed successfully`);
    } catch (error) {
      this.logger.error(`Failed to analyze document ${documentId}:`, error);
      await this.prisma.warehouseLegalDocument.update({
        where: { id: documentId },
        data: {
          ai_status: 'FAILED',
          ai_issues: [(error as Error).message ?? 'Unknown error'],
        },
      });
    }
  }

  async recomputeTrustScore(warehouseTemplateId: string): Promise<void> {
    try {
      const [approvedDocs, template, successContracts] = await Promise.all([
        this.prisma.warehouseLegalDocument.count({
          where: {
            warehouse_template_id: warehouseTemplateId,
            review_status: 'APPROVED',
            is_deleted: false,
          },
        }),
        this.prisma.warehouseTemplate.findUnique({
          where: { id: warehouseTemplateId },
          select: {
            created_at: true,
            rental_contract_details: {
              where: { is_deleted: false },
              select: { id: true, rental_contract: { select: { status: true } } },
            },
          },
        }),
        this.prisma.rentalContractDetail.count({
          where: {
            warehouse_template_id: warehouseTemplateId,
            is_deleted: false,
            rental_contract: {
              status: {
                in: [
                  'ACTIVE',
                  'OVERDUE_LEVEL_1',
                  'OVERDUE_LEVEL_2',
                  'OVERDUE_LEVEL_3',
                  'SEALED',
                  'COMPLETED',
                ],
              },
            },
          },
        }),
      ]);

      if (!template) return;

      const totalContracts = template.rental_contract_details.length;
      const ageMonths =
        (Date.now() - template.created_at.getTime()) / (1000 * 60 * 60 * 24 * 30);

      const breakdown: Record<string, number> = {
        legal_docs: approvedDocs >= 1 ? 20 : 0,
        has_contracts: totalContracts >= 5 ? 10 : 0,
        contract_success:
          totalContracts > 0 && successContracts / totalContracts >= 0.8 ? 15 : 0,
        tenure: ageMonths >= 6 ? 10 : 0,
      };

      const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

      let badge: TrustBadgeLevel = 'NONE';
      if (approvedDocs >= 1) {
        badge = score >= 45 ? 'PREMIUM' : 'VERIFIED';
      }

      await this.prisma.warehouseTrustProfile.upsert({
        where: { warehouse_template_id: warehouseTemplateId },
        create: {
          warehouse_template_id: warehouseTemplateId,
          trust_score: score,
          badge_level: badge,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          score_breakdown: breakdown as any,
          last_computed_at: new Date(),
        },
        update: {
          trust_score: score,
          badge_level: badge,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          score_breakdown: breakdown as any,
          last_computed_at: new Date(),
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to recompute trust score for ${warehouseTemplateId}:`,
        err,
      );
    }
  }
}
