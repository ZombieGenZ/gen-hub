import { Injectable } from '@nestjs/common';
import { ContractStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const SIGNED_STATUSES = [
  ContractStatus.ACTIVE,
  ContractStatus.OVERDUE_LEVEL_1,
  ContractStatus.OVERDUE_LEVEL_2,
  ContractStatus.OVERDUE_LEVEL_3,
  ContractStatus.SEALED,
  ContractStatus.COMPLETED,
];

@Injectable()
export class WarehouseAiAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(warehouseTemplateId: string) {
    const now = new Date();
    const ago7d = new Date(now.getTime() - 7 * 86_400_000);
    const ago30d = new Date(now.getTime() - 30 * 86_400_000);

    const [total, groupedSessions, avgRank, imp7d, imp30d, visits, consultations] =
      await Promise.all([
        this.prisma.aIRecommendationImpression.count({
          where: { warehouse_template_id: warehouseTemplateId },
        }),
        this.prisma.aIRecommendationImpression.groupBy({
          by: ['session_hash'],
          where: { warehouse_template_id: warehouseTemplateId },
        }),
        this.prisma.aIRecommendationImpression.aggregate({
          _avg: { rank_position: true },
          where: { warehouse_template_id: warehouseTemplateId },
        }),
        this.prisma.aIRecommendationImpression.count({
          where: {
            warehouse_template_id: warehouseTemplateId,
            created_at: { gte: ago7d },
          },
        }),
        this.prisma.aIRecommendationImpression.count({
          where: {
            warehouse_template_id: warehouseTemplateId,
            created_at: { gte: ago30d },
          },
        }),
        this.prisma.warehouseVisitBooking.count({
          where: {
            warehouse_template_id: warehouseTemplateId,
            is_deleted: false,
          },
        }),
        this.prisma.consultationRequest.count({
          where: {
            warehouse_template_id: warehouseTemplateId,
            source: 'AI_CHATBOT',
            is_deleted: false,
          },
        }),
      ]);

    const rawAvg = avgRank._avg.rank_position;
    return {
      total_impressions: total,
      unique_queries: groupedSessions.length,
      avg_rank_position:
        rawAvg !== null ? Math.round(rawAvg * 10) / 10 : null,
      impressions_7d: imp7d,
      impressions_30d: imp30d,
      ai_visits: visits,
      ai_consultations: consultations,
    };
  }

  async getFunnel(warehouseTemplateId: string) {
    const [impressions, visits, consultations, contracts] = await Promise.all([
      this.prisma.aIRecommendationImpression.count({
        where: { warehouse_template_id: warehouseTemplateId },
      }),
      this.prisma.warehouseVisitBooking.count({
        where: {
          warehouse_template_id: warehouseTemplateId,
          is_deleted: false,
        },
      }),
      this.prisma.consultationRequest.count({
        where: {
          warehouse_template_id: warehouseTemplateId,
          source: 'AI_CHATBOT',
          is_deleted: false,
        },
      }),
      this.prisma.rentalContractDetail.count({
        where: {
          warehouse_template_id: warehouseTemplateId,
          is_deleted: false,
          rental_contract: {
            status: { in: SIGNED_STATUSES },
            is_deleted: false,
          },
        },
      }),
    ]);

    const pct = (n: number, d: number) =>
      d > 0 ? Math.round((n / d) * 1000) / 10 : 0;

    return {
      impressions,
      visits,
      consultations,
      contracts,
      rates: {
        impression_to_visit: pct(visits, impressions),
        visit_to_consultation: pct(consultations, visits),
        consultation_to_contract: pct(contracts, consultations),
        overall: pct(contracts, impressions),
      },
      note: 'Lượt hẹn thăm kho bao gồm cả các lượt không qua AI',
    };
  }

  async getPricePosition(warehouseTemplateId: string) {
    const warehouse = await this.prisma.warehouseTemplate.findFirst({
      where: { id: warehouseTemplateId, is_deleted: false },
      select: {
        id: true,
        name: true,
        price_per_month: true,
        ward: {
          select: {
            province_id: true,
            province: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!warehouse) {
      return { error: 'Không tìm thấy kho' };
    }

    const myPrice = Number(warehouse.price_per_month);
    const provinceId = warehouse.ward?.province_id ?? null;
    const provinceName = warehouse.ward?.province?.name ?? null;

    if (!provinceId) {
      return {
        warehouse_id: warehouseTemplateId,
        price_per_month: myPrice,
        province: null,
        province_avg: null,
        province_min: null,
        province_max: null,
        province_count: 0,
        percentile_rank: null,
        province_warehouses: [],
        note: 'Kho này chưa được gắn địa chỉ tỉnh/thành',
      };
    }

    const provinceWarehouses = await this.prisma.warehouseTemplate.findMany({
      where: {
        is_active: true,
        is_deleted: false,
        ward: { province_id: provinceId },
      },
      select: { id: true, name: true, price_per_month: true },
    });

    const prices = provinceWarehouses.map((w) => Number(w.price_per_month));
    const count = prices.length;

    if (count === 0) {
      return {
        warehouse_id: warehouseTemplateId,
        price_per_month: myPrice,
        province: { id: provinceId, name: provinceName },
        province_avg: null,
        province_min: null,
        province_max: null,
        province_count: 0,
        percentile_rank: null,
        province_warehouses: [],
      };
    }

    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / count);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const belowOrEqual = prices.filter((p) => p <= myPrice).length;
    const percentileRank = Math.round((belowOrEqual / count) * 100);

    return {
      warehouse_id: warehouseTemplateId,
      price_per_month: myPrice,
      province: { id: provinceId, name: provinceName },
      province_avg: avg,
      province_min: min,
      province_max: max,
      province_count: count,
      percentile_rank: percentileRank,
      province_warehouses: provinceWarehouses.map((w) => ({
        id: w.id,
        name: w.name,
        price_per_month: Number(w.price_per_month),
        is_current: w.id === warehouseTemplateId,
      })),
    };
  }

  async getRecentQueries(warehouseTemplateId: string) {
    return this.prisma.aIRecommendationImpression.findMany({
      where: { warehouse_template_id: warehouseTemplateId },
      orderBy: { created_at: 'desc' },
      take: 20,
      select: {
        id: true,
        session_hash: true,
        query_text: true,
        match_score: true,
        rank_position: true,
        created_at: true,
      },
    });
  }
}
