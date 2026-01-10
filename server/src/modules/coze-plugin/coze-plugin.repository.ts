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

/**
 * Repository truy vấn database cho Coze Plugin APIs
 * Tối ưu query để lấy đầy đủ thông tin pricing và availability
 */
@Injectable()
export class CozePluginRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lấy danh sách warehouse với pricing và gifts
     */
    async getWarehousePricing(dto: GetWarehousePricingDto): Promise<{ items: IWarehousePricingItem[]; total: number }> {
        const where: any = {
            is_active: true,
            is_deleted: false,
        };

        // Filter theo warehouse_id cụ thể
        if (dto.warehouse_id) {
            where.id = dto.warehouse_id;
        }

        // Filter theo keywords (tên, địa chỉ)
        if (dto.keywords) {
            where.OR = [
                { name: { contains: dto.keywords, mode: 'insensitive' } },
                { address_detail: { contains: dto.keywords, mode: 'insensitive' } },
            ];
        }

        // Filter theo province (tên hoặc code)
        if (dto.province_name || dto.province_code) {
            where.ward = {
                province: dto.province_name
                    ? { name: { contains: dto.province_name, mode: 'insensitive' } }
                    : { code: dto.province_code },
            };
        }

        // Filter theo giá
        if (dto.min_price !== undefined) {
            where.price_per_month = { ...where.price_per_month, gte: dto.min_price };
        }
        if (dto.max_price !== undefined) {
            where.price_per_month = { ...where.price_per_month, lte: dto.max_price };
        }

        // Filter theo loại kho
        if (dto.is_cold_storage !== undefined) {
            where.is_cold_storage = dto.is_cold_storage;
        }
        if (dto.is_shared_warehouse !== undefined) {
            where.is_shared_warehouse = dto.is_shared_warehouse;
        }

        // Lấy tổng số
        const total = await this.prisma.warehouseTemplate.count({ where });

        // Lấy danh sách warehouse templates
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
                ward: {
                    select: {
                        province: { select: { id: true, name: true } },
                    },
                },
                images: {
                    where: { is_active: true, is_deleted: false },
                    orderBy: { order: 'asc' },
                    select: { url: true },
                },
                amenities: {
                    where: { is_active: true, is_deleted: false },
                    select: {
                        amenity: { select: { name: true, description: true } },
                    },
                },
                discount_configs: {
                    where: { is_active: true, is_deleted: false },
                    select: {
                        discount_percent: true,
                        duration_tier: {
                            select: { id: true, name: true, duration_value: true, duration_unit: true },
                        },
                    },
                },
                addon_gifts: {
                    where: { is_active: true, is_deleted: false },
                    select: {
                        is_until_service_end: true,
                        gift_duration_value: true,
                        gift_duration_unit: true,
                        addon: { select: { id: true, name: true, description: true, price: true } },
                    },
                },
                insurance_gifts: {
                    where: { is_active: true, is_deleted: false },
                    select: {
                        is_until_service_end: true,
                        gift_duration_value: true,
                        gift_duration_unit: true,
                        insurance: { select: { id: true, name: true, description: true, price: true } },
                    },
                },
            },
        });

        // Lấy tất cả rental duration tiers để tính giá
        const allTiers = await this.prisma.rentalDurationTier.findMany({
            where: { is_active: true, is_deleted: false },
            orderBy: { order: 'asc' },
            select: { id: true, name: true, duration_value: true, duration_unit: true },
        });

        // Build result với thống kê và rows
        const items: IWarehousePricingItem[] = [];

        for (const t of templates) {
            // Lấy rows nếu là kho chung
            let rows: IRowPricing[] | undefined;
            if (t.is_shared_warehouse) {
                rows = await this.getRowsPricing(t.id, allTiers);
            }

            // Tính cấu trúc kho
            const structure = await this.getWarehouseStructure(t.id);

            // Build pricing tiers cho warehouse
            const basePricePerMonth = Number(t.price_per_month);
            const pricingTiers = await this.buildPricingTiers(basePricePerMonth, t.discount_configs, allTiers);

            items.push({
                id: t.id,
                name: t.name,
                description: t.description,
                area: t.length * t.width,
                address: t.address_detail,
                province: t.ward?.province || null,
                base_price_per_month: basePricePerMonth,
                pricing_tiers: pricingTiers,
                structure,
                is_shared_warehouse: t.is_shared_warehouse,
                is_cold_storage: t.is_cold_storage,
                rows,
                addon_gifts: t.addon_gifts.map(g => this.formatGift(g.addon, g)),
                insurance_gifts: t.insurance_gifts.map(g => this.formatGift(g.insurance, g)),
                amenities: t.amenities.map(a => ({
                    name: a.amenity.name,
                    description: a.amenity.description,
                })),
                images: t.images.map(i => i.url),
            });
        }

        // Filter theo diện tích (sau khi tính area)
        let filteredItems = items;
        if (dto.min_area !== undefined) {
            filteredItems = filteredItems.filter(i => i.area >= dto.min_area!);
        }
        if (dto.max_area !== undefined) {
            filteredItems = filteredItems.filter(i => i.area <= dto.max_area!);
        }

        return { items: filteredItems, total };
    }

    /**
     * Lấy thông tin pricing của các rows trong warehouse
     */
    private async getRowsPricing(warehouseTemplateId: string, allTiers: any[]): Promise<IRowPricing[]> {
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
                        duration_tier: { select: { id: true, name: true, duration_value: true, duration_unit: true } },
                    },
                },
                addon_gifts: {
                    where: { is_active: true, is_deleted: false },
                    select: {
                        is_until_service_end: true,
                        gift_duration_value: true,
                        gift_duration_unit: true,
                        addon: { select: { id: true, name: true, description: true, price: true } },
                    },
                },
                insurance_gifts: {
                    where: { is_active: true, is_deleted: false },
                    select: {
                        is_until_service_end: true,
                        gift_duration_value: true,
                        gift_duration_unit: true,
                        insurance: { select: { id: true, name: true, description: true, price: true } },
                    },
                },
            },
        });

        const result: IRowPricing[] = [];

        for (const row of rows) {
            const structure = await this.getRowStructure(row.id);
            const basePricePerMonth = Number(row.price_per_month);
            const pricingTiers = await this.buildPricingTiers(basePricePerMonth, row.discount_configs, allTiers);

            result.push({
                id: row.id,
                name: row.name,
                code: row.code,
                description: row.description,
                base_price_per_month: basePricePerMonth,
                is_rented: row.is_rented,
                pricing_tiers: pricingTiers,
                structure,
                addon_gifts: row.addon_gifts.map(g => this.formatGift(g.addon, g)),
                insurance_gifts: row.insurance_gifts.map(g => this.formatGift(g.insurance, g)),
            });
        }

        return result;
    }

    /**
     * Build pricing tiers từ discount configs
     */
    private async buildPricingTiers(
        basePricePerMonth: number,
        discountConfigs: any[],
        allTiers: any[],
    ): Promise<IPricingTier[]> {
        const configMap = new Map(
            discountConfigs.map(c => [c.duration_tier.id, Number(c.discount_percent)]),
        );

        return allTiers.map(tier => {
            const discountPercent = configMap.get(tier.id) || 0;
            const durationMonths = tier.duration_unit === 'YEAR'
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

    /**
     * Lấy cấu trúc warehouse (đếm rows/racks/shelves/blocks)
     */
    private async getWarehouseStructure(warehouseTemplateId: string) {
        const rows = await this.prisma.rowTemplate.findMany({
            where: { warehouse_template_id: warehouseTemplateId, is_active: true, is_deleted: false },
            select: { id: true },
        });
        const rowIds = rows.map(r => r.id);

        let totalRacks = 0, totalShelves = 0, totalBlocks = 0;

        if (rowIds.length > 0) {
            const racks = await this.prisma.rackTemplate.findMany({
                where: { row_template_id: { in: rowIds }, is_active: true, is_deleted: false },
                select: { id: true },
            });
            const rackIds = racks.map(r => r.id);
            totalRacks = rackIds.length;

            if (rackIds.length > 0) {
                const shelves = await this.prisma.shelfTemplate.findMany({
                    where: { rack_template_id: { in: rackIds }, is_active: true, is_deleted: false },
                    select: { id: true },
                });
                const shelfIds = shelves.map(s => s.id);
                totalShelves = shelfIds.length;

                if (shelfIds.length > 0) {
                    totalBlocks = await this.prisma.blockTemplate.count({
                        where: { shelf_template_id: { in: shelfIds }, is_active: true, is_deleted: false },
                    });
                }
            }
        }

        return {
            total_rows: rowIds.length,
            total_racks: totalRacks,
            total_shelves: totalShelves,
            total_blocks: totalBlocks,
        };
    }

    /**
     * Lấy cấu trúc row
     */
    private async getRowStructure(rowId: string) {
        const racks = await this.prisma.rackTemplate.findMany({
            where: { row_template_id: rowId, is_active: true, is_deleted: false },
            select: { id: true },
        });
        const rackIds = racks.map(r => r.id);

        let totalShelves = 0, totalBlocks = 0;

        if (rackIds.length > 0) {
            const shelves = await this.prisma.shelfTemplate.findMany({
                where: { rack_template_id: { in: rackIds }, is_active: true, is_deleted: false },
                select: { id: true },
            });
            const shelfIds = shelves.map(s => s.id);
            totalShelves = shelfIds.length;

            if (shelfIds.length > 0) {
                totalBlocks = await this.prisma.blockTemplate.count({
                    where: { shelf_template_id: { in: shelfIds }, is_active: true, is_deleted: false },
                });
            }
        }

        return {
            total_racks: rackIds.length,
            total_shelves: totalShelves,
            total_blocks: totalBlocks,
        };
    }

    /**
     * Format gift info
     */
    private formatGift(item: any, giftConfig: any): IGiftInfo {
        const duration = giftConfig.is_until_service_end
            ? 'Suốt thời gian thuê'
            : `${giftConfig.gift_duration_value} ${this.formatDurationUnit(giftConfig.gift_duration_unit)}`;

        return {
            id: item.id,
            name: item.name,
            description: item.description,
            original_price: Number(item.price),
            gift_duration: duration,
        };
    }

    private formatDurationUnit(unit: string): string {
        switch (unit) {
            case 'MONTH': return 'tháng';
            case 'YEAR': return 'năm';
            case 'DAY': return 'ngày';
            default: return unit;
        }
    }

    /**
     * Kiểm tra tình trạng có sẵn của warehouse
     */
    async checkAvailability(warehouseId: string): Promise<IAvailabilityResponse | null> {
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

        // Đếm số hợp đồng active
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
                where: { warehouse_template_id: warehouseId, is_active: true, is_deleted: false },
                select: { id: true, name: true, code: true, price_per_month: true, is_rented: true },
            });

            const availableRows = allRows.filter(r => !r.is_rented);
            const rentedRows = allRows.filter(r => r.is_rented);

            rowsSummary = {
                total: allRows.length,
                available: availableRows.length,
                rented: rentedRows.length,
                available_rows: availableRows.map(r => ({
                    id: r.id,
                    name: r.name,
                    code: r.code,
                    price_per_month: Number(r.price_per_month),
                })),
            };
        }

        const isAvailable = warehouse.rental_status === 'AVAILABLE';

        return {
            warehouse_id: warehouse.id,
            warehouse_name: warehouse.name,
            is_available: isAvailable,
            rental_status: warehouse.rental_status as 'AVAILABLE' | 'LOCKED' | 'RENTED',
            current_contracts_count: contractsCount,
            rows_summary: rowsSummary,
        };
    }

    /**
     * Lấy danh sách FAQ active
     */
    async getFaqs(): Promise<IFaqItem[]> {
        const faqs = await this.prisma.fAQ.findMany({
            where: { is_active: true, is_deleted: false },
            orderBy: { order: 'asc' },
            select: { id: true, question: true, answer: true, order: true },
        });

        return faqs;
    }
}
