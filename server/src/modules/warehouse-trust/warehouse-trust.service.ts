import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { DocReviewStatus, TrustBadgeLevel } from '@prisma/client';

@Injectable()
export class WarehouseTrustService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrustProfile(warehouseTemplateId: string) {
    return this.prisma.warehouseTrustProfile.findUnique({
      where: { warehouse_template_id: warehouseTemplateId },
    });
  }

  async listPendingDocuments(reviewStatus?: string) {
    const status = (reviewStatus ?? 'PENDING') as DocReviewStatus;
    return this.prisma.warehouseLegalDocument.findMany({
      where: {
        is_deleted: false,
        review_status: status,
      },
      include: {
        warehouse_template: {
          select: { id: true, name: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async reviewDocument(
    documentId: string,
    reviewerId: string,
    status: 'APPROVED' | 'REJECTED' | 'NEEDS_RESUBMIT',
    reviewNote?: string,
  ) {
    const doc = await this.prisma.warehouseLegalDocument.findFirst({
      where: { id: documentId, is_deleted: false },
    });
    if (!doc) throw new NotFoundException('Tài liệu không tồn tại');

    if (doc.review_status === 'APPROVED' && status !== 'APPROVED') {
      throw new BadRequestException(
        'Không thể thay đổi trạng thái tài liệu đã duyệt',
      );
    }

    const updated = await this.prisma.warehouseLegalDocument.update({
      where: { id: documentId },
      data: {
        review_status: status,
        reviewed_by: reviewerId,
        review_note: reviewNote ?? null,
        reviewed_at: new Date(),
      },
    });

    await this.recomputeTrustScore(doc.warehouse_template_id);
    return updated;
  }

  async recomputeTrustScore(warehouseTemplateId: string): Promise<void> {
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
            select: { id: true },
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
      (Date.now() - template.created_at.getTime()) /
      (1000 * 60 * 60 * 24 * 30);

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
  }
}
