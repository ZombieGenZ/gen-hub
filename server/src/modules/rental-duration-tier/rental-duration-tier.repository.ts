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
}
