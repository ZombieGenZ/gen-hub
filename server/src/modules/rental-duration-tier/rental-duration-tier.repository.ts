import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RentalDurationTierRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: {
        name: string;
        duration_value: number;
        duration_unit?: Prisma.EnumDurationUnitFieldUpdateOperationsInput['set'];
        description?: string;
        order?: number;
        is_active?: boolean;
        created_by: string;
    }) {
        return this.prisma.rentalDurationTier.create({
            data: {
                name: data.name,
                duration_value: data.duration_value,
                duration_unit: data.duration_unit ?? 'MONTH',
                description: data.description,
                order: data.order ?? 0,
                is_active: data.is_active ?? true,
                created_by: data.created_by,
            },
        });
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        where?: Prisma.RentalDurationTierWhereInput;
        orderBy?: Prisma.RentalDurationTierOrderByWithRelationInput;
    }) {
        const { skip, take, where, orderBy } = params;
        return this.prisma.rentalDurationTier.findMany({
            skip,
            take,
            where,
            orderBy: orderBy ?? { order: 'asc' },
        });
    }

    async count(where?: Prisma.RentalDurationTierWhereInput) {
        return this.prisma.rentalDurationTier.count({ where });
    }

    async findById(id: string) {
        return this.prisma.rentalDurationTier.findFirst({
            where: { id, is_deleted: false },
        });
    }

    async findByDuration(durationValue: number, durationUnit: string, excludeId?: string) {
        return this.prisma.rentalDurationTier.findFirst({
            where: {
                duration_value: durationValue,
                duration_unit: durationUnit as any,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
    }

    async findByName(name: string, excludeId?: string) {
        return this.prisma.rentalDurationTier.findFirst({
            where: {
                name,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
    }

    async update(id: string, data: {
        name?: string;
        duration_value?: number;
        duration_unit?: Prisma.EnumDurationUnitFieldUpdateOperationsInput['set'];
        description?: string;
        order?: number;
        is_active?: boolean;
        updated_by: string;
    }) {
        return this.prisma.rentalDurationTier.update({
            where: { id },
            data: {
                name: data.name,
                duration_value: data.duration_value,
                duration_unit: data.duration_unit,
                description: data.description,
                order: data.order,
                is_active: data.is_active,
                updated_by: data.updated_by,
            },
        });
    }

    async softDelete(id: string, deletedBy: string) {
        return this.prisma.rentalDurationTier.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async softDeleteMany(ids: string[], deletedBy: string) {
        return this.prisma.rentalDurationTier.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async findByIds(ids: string[]) {
        return this.prisma.rentalDurationTier.findMany({
            where: { id: { in: ids }, is_deleted: false },
        });
    }

    // Lấy tất cả active tiers để dùng cho dropdown/select
    async findAllActive() {
        return this.prisma.rentalDurationTier.findMany({
            where: { is_deleted: false, is_active: true },
            orderBy: { order: 'asc' },
        });
    }

    // ===== TierAddonGift Methods =====

    async findByIdWithGifts(id: string) {
        return this.prisma.rentalDurationTier.findFirst({
            where: { id, is_deleted: false },
            include: {
                tier_addon_gifts: {
                    where: { is_deleted: false },
                    include: { addon: true },
                },
            },
        });
    }

    async createAddonGift(data: {
        duration_tier_id: string;
        addon_id: string;
        require_min_order_amount?: boolean;
        min_order_amount?: number;
        require_min_warehouses?: boolean;
        min_warehouses?: number;
        require_min_rows?: boolean;
        min_rows?: number;
        is_until_service_end?: boolean;
        gift_duration_value?: number;
        gift_duration_unit?: string;
        is_active?: boolean;
        created_by: string;
    }) {
        return this.prisma.tierAddonGift.create({
            data: {
                duration_tier_id: data.duration_tier_id,
                addon_id: data.addon_id,
                require_min_order_amount: data.require_min_order_amount ?? false,
                min_order_amount: data.min_order_amount,
                require_min_warehouses: data.require_min_warehouses ?? false,
                min_warehouses: data.min_warehouses,
                require_min_rows: data.require_min_rows ?? false,
                min_rows: data.min_rows,
                is_until_service_end: data.is_until_service_end ?? true,
                gift_duration_value: data.gift_duration_value,
                gift_duration_unit: data.gift_duration_unit as any,
                is_active: data.is_active ?? true,
                created_by: data.created_by,
            },
        });
    }

    async updateAddonGift(id: string, data: {
        require_min_order_amount?: boolean;
        min_order_amount?: number;
        require_min_warehouses?: boolean;
        min_warehouses?: number;
        require_min_rows?: boolean;
        min_rows?: number;
        is_until_service_end?: boolean;
        gift_duration_value?: number;
        gift_duration_unit?: string;
        is_active?: boolean;
        updated_by: string;
    }) {
        return this.prisma.tierAddonGift.update({
            where: { id },
            data: {
                require_min_order_amount: data.require_min_order_amount,
                min_order_amount: data.min_order_amount,
                require_min_warehouses: data.require_min_warehouses,
                min_warehouses: data.min_warehouses,
                require_min_rows: data.require_min_rows,
                min_rows: data.min_rows,
                is_until_service_end: data.is_until_service_end,
                gift_duration_value: data.gift_duration_value,
                gift_duration_unit: data.gift_duration_unit as any,
                is_active: data.is_active,
                updated_by: data.updated_by,
            },
        });
    }

    async softDeleteAddonGift(id: string, deletedBy: string) {
        return this.prisma.tierAddonGift.update({
            where: { id },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async findAddonGiftsByTierId(tierId: string) {
        return this.prisma.tierAddonGift.findMany({
            where: { duration_tier_id: tierId, is_deleted: false },
            include: { addon: true },
        });
    }

    async softDeleteAddonGiftsByTierId(tierId: string, deletedBy: string) {
        return this.prisma.tierAddonGift.updateMany({
            where: { duration_tier_id: tierId },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }
}
