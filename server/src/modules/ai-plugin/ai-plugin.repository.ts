import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetWarehousePricingDto } from './dto';
import {
  IWarehousePricingItem,
  IRowPricing,
  IPricingTier,
  IGiftInfo,
  IAvailabilityResponse,
  IFaqItem,
} from './interfaces';

@Injectable()
export class AiPluginRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getWarehousePricing(
    dto: GetWarehousePricingDto,
  ): Promise<{ items: IWarehousePricingItem[]; total: number }> {
    const where: any = { is_active: true, is_deleted: false };
    if (dto.warehouse_id) where.id = dto.warehouse_id;
    if (dto.keywords) {
      where.OR = [
        { name: { contains: dto.keywords, mode: 'insensitive' } },
        { address_detail: { contains: dto.keywords, mode: 'insensitive' } },
      ];
    }
    if (dto.province_name || dto.province_code) {
      where.ward = {
        province: dto.province_name
          ? { name: { contains: dto.province_name, mode: 'insensitive' } }
          : { code: dto.province_code },
      };
    }
    if (dto.min_price !== undefined)
      where.price_per_month = { ...where.price_per_month, gte: dto.min_price };
    if (dto.max_price !== undefined)
      where.price_per_month = { ...where.price_per_month, lte: dto.max_price };
    if (dto.is_cold_storage !== undefined)
      where.is_cold_storage = dto.is_cold_storage;
    if (dto.is_shared_warehouse !== undefined)
      where.is_shared_warehouse = dto.is_shared_warehouse;

    const total = await this.prisma.warehouseTemplate.count({ where });
    const templates = await this.prisma.warehouseTemplate.findMany({
      where,
      take: dto.limit || 3,
      select: {
        id: true,
        name: true,
        description: true,
        length: true,
        width: true,
        price_per_month: true,
        address_detail: true,
        is_shared_warehouse: true,
        is_cold_storage: true,
        ward: { select: { province: { select: { id: true, name: true } } } },
        images: {
          where: { is_active: true, is_deleted: false },
          orderBy: { order: 'asc' },
          select: { url: true },
        },
        amenities: {
          where: { is_active: true, is_deleted: false },
          select: { amenity: { select: { name: true, description: true } } },
        },
        discount_configs: {
          where: { is_active: true, is_deleted: false },
          select: {
            discount_percent: true,
            duration_tier: {
              select: {
                id: true,
                name: true,
                duration_value: true,
                duration_unit: true,
              },
            },
          },
        },
        addon_gifts: {
          where: { is_active: true, is_deleted: false },
          select: {
            is_until_service_end: true,
            gift_duration_value: true,
            gift_duration_unit: true,
            addon: {
              select: { id: true, name: true, description: true, price: true },
            },
          },
        },
        insurance_gifts: {
          where: { is_active: true, is_deleted: false },
          select: {
            is_until_service_end: true,
            gift_duration_value: true,
            gift_duration_unit: true,
            insurance: {
              select: { id: true, name: true, description: true, price: true },
            },
          },
        },
      },
    });

    const allTiers = await this.prisma.rentalDurationTier.findMany({
      where: { is_active: true, is_deleted: false },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        duration_value: true,
        duration_unit: true,
      },
    });

    const items: IWarehousePricingItem[] = [];
    for (const template of templates) {
      const rows = template.is_shared_warehouse
        ? await this.getRowsPricing(template.id, allTiers)
        : undefined;
      items.push({
        id: template.id,
        name: template.name,
        description: template.description,
        area: template.length * template.width,
        address: template.address_detail,
        province: template.ward?.province || null,
        base_price_per_month: Number(template.price_per_month),
        pricing_tiers: await this.buildPricingTiers(
          Number(template.price_per_month),
          template.discount_configs,
          allTiers,
        ),
        structure: await this.getWarehouseStructure(template.id),
        is_shared_warehouse: template.is_shared_warehouse,
        is_cold_storage: template.is_cold_storage,
        rows,
        addon_gifts: template.addon_gifts.map((gift) =>
          this.formatGift(gift.addon, gift),
        ),
        insurance_gifts: template.insurance_gifts.map((gift) =>
          this.formatGift(gift.insurance, gift),
        ),
        amenities: template.amenities.map((item) => ({
          name: item.amenity.name,
          description: item.amenity.description,
        })),
        images: template.images.map((item) => item.url),
      });
    }

    let filteredItems = items;
    if (dto.min_area !== undefined)
      filteredItems = filteredItems.filter(
        (item) => item.area >= dto.min_area!,
      );
    if (dto.max_area !== undefined)
      filteredItems = filteredItems.filter(
        (item) => item.area <= dto.max_area!,
      );

    return { items: filteredItems, total };
  }

  private async getRowsPricing(
    warehouseTemplateId: string,
    allTiers: any[],
  ): Promise<IRowPricing[]> {
    const rows = await this.prisma.rowTemplate.findMany({
      where: {
        warehouse_template_id: warehouseTemplateId,
        is_active: true,
        is_deleted: false,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        price_per_month: true,
        is_rented: true,
        discount_configs: {
          where: { is_active: true, is_deleted: false },
          select: {
            discount_percent: true,
            duration_tier: {
              select: {
                id: true,
                name: true,
                duration_value: true,
                duration_unit: true,
              },
            },
          },
        },
        addon_gifts: {
          where: { is_active: true, is_deleted: false },
          select: {
            is_until_service_end: true,
            gift_duration_value: true,
            gift_duration_unit: true,
            addon: {
              select: { id: true, name: true, description: true, price: true },
            },
          },
        },
        insurance_gifts: {
          where: { is_active: true, is_deleted: false },
          select: {
            is_until_service_end: true,
            gift_duration_value: true,
            gift_duration_unit: true,
            insurance: {
              select: { id: true, name: true, description: true, price: true },
            },
          },
        },
      },
    });

    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        base_price_per_month: Number(row.price_per_month),
        is_rented: row.is_rented,
        pricing_tiers: await this.buildPricingTiers(
          Number(row.price_per_month),
          row.discount_configs,
          allTiers,
        ),
        structure: await this.getRowStructure(row.id),
        addon_gifts: row.addon_gifts.map((gift) =>
          this.formatGift(gift.addon, gift),
        ),
        insurance_gifts: row.insurance_gifts.map((gift) =>
          this.formatGift(gift.insurance, gift),
        ),
      })),
    );
  }

  private async buildPricingTiers(
    basePricePerMonth: number,
    discountConfigs: any[],
    allTiers: any[],
  ): Promise<IPricingTier[]> {
    const configMap = new Map(
      discountConfigs.map((item) => [
        item.duration_tier.id,
        Number(item.discount_percent),
      ]),
    );
    return allTiers.map((tier) => {
      const discountPercent = configMap.get(tier.id) || 0;
      const durationMonths =
        tier.duration_unit === 'YEAR'
          ? tier.duration_value * 12
          : tier.duration_value;
      const pricePerMonth = basePricePerMonth * (1 - discountPercent / 100);
      return {
        tier_id: tier.id,
        tier_name: tier.name,
        duration_months: durationMonths,
        discount_percent: discountPercent,
        price_per_month: Math.round(pricePerMonth),
        total_price: Math.round(pricePerMonth * durationMonths),
      };
    });
  }

  private async getWarehouseStructure(warehouseTemplateId: string) {
    const rows = await this.prisma.rowTemplate.findMany({
      where: {
        warehouse_template_id: warehouseTemplateId,
        is_active: true,
        is_deleted: false,
      },
      select: { id: true },
    });
    const rowIds = rows.map((row) => row.id);
    const racks = rowIds.length
      ? await this.prisma.rackTemplate.findMany({
          where: {
            row_template_id: { in: rowIds },
            is_active: true,
            is_deleted: false,
          },
          select: { id: true },
        })
      : [];
    const rackIds = racks.map((rack) => rack.id);
    const shelves = rackIds.length
      ? await this.prisma.shelfTemplate.findMany({
          where: {
            rack_template_id: { in: rackIds },
            is_active: true,
            is_deleted: false,
          },
          select: { id: true },
        })
      : [];
    const shelfIds = shelves.map((shelf) => shelf.id);
    const totalBlocks = shelfIds.length
      ? await this.prisma.blockTemplate.count({
          where: {
            shelf_template_id: { in: shelfIds },
            is_active: true,
            is_deleted: false,
          },
        })
      : 0;

    return {
      total_rows: rowIds.length,
      total_racks: rackIds.length,
      total_shelves: shelfIds.length,
      total_blocks: totalBlocks,
    };
  }

  private async getRowStructure(rowId: string) {
    const racks = await this.prisma.rackTemplate.findMany({
      where: { row_template_id: rowId, is_active: true, is_deleted: false },
      select: { id: true },
    });
    const rackIds = racks.map((rack) => rack.id);
    const shelves = rackIds.length
      ? await this.prisma.shelfTemplate.findMany({
          where: {
            rack_template_id: { in: rackIds },
            is_active: true,
            is_deleted: false,
          },
          select: { id: true },
        })
      : [];
    const shelfIds = shelves.map((shelf) => shelf.id);
    const totalBlocks = shelfIds.length
      ? await this.prisma.blockTemplate.count({
          where: {
            shelf_template_id: { in: shelfIds },
            is_active: true,
            is_deleted: false,
          },
        })
      : 0;

    return {
      total_racks: rackIds.length,
      total_shelves: shelfIds.length,
      total_blocks: totalBlocks,
    };
  }

  private formatGift(item: any, giftConfig: any): IGiftInfo {
    const duration = giftConfig.is_until_service_end
      ? 'Full rental term'
      : `${giftConfig.gift_duration_value} ${giftConfig.gift_duration_unit}`;
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      original_price: Number(item.price),
      gift_duration: duration,
    };
  }

  async checkAvailability(
    warehouseId: string,
  ): Promise<IAvailabilityResponse | null> {
    const warehouse = await this.prisma.warehouseTemplate.findFirst({
      where: { id: warehouseId, is_active: true, is_deleted: false },
      select: {
        id: true,
        name: true,
        rental_status: true,
        is_shared_warehouse: true,
      },
    });
    if (!warehouse) return null;

    const contractsCount = await this.prisma.rentalContractDetail.count({
      where: {
        warehouse_template_id: warehouseId,
        rental_contract: { status: 'ACTIVE', is_deleted: false },
        is_deleted: false,
      },
    });

    let rowsSummary;
    if (warehouse.is_shared_warehouse) {
      const allRows = await this.prisma.rowTemplate.findMany({
        where: {
          warehouse_template_id: warehouseId,
          is_active: true,
          is_deleted: false,
        },
        select: {
          id: true,
          name: true,
          code: true,
          price_per_month: true,
          is_rented: true,
        },
      });
      const availableRows = allRows.filter((row) => !row.is_rented);
      rowsSummary = {
        total: allRows.length,
        available: availableRows.length,
        rented: allRows.length - availableRows.length,
        available_rows: availableRows.map((row) => ({
          id: row.id,
          name: row.name,
          code: row.code,
          price_per_month: Number(row.price_per_month),
        })),
      };
    }

    return {
      warehouse_id: warehouse.id,
      warehouse_name: warehouse.name,
      is_available: warehouse.rental_status === 'AVAILABLE',
      rental_status: warehouse.rental_status as
        | 'AVAILABLE'
        | 'LOCKED'
        | 'RENTED',
      current_contracts_count: contractsCount,
      rows_summary: rowsSummary,
    };
  }

  async getFaqs(): Promise<IFaqItem[]> {
    return this.prisma.fAQ.findMany({
      where: { is_active: true, is_deleted: false },
      orderBy: { order: 'asc' },
      select: { id: true, question: true, answer: true, order: true },
    });
  }
}
