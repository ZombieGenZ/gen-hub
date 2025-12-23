import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AddonRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.AddonCreateInput) {
        return this.prisma.addon.create({ data });
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        where?: Prisma.AddonWhereInput;
        orderBy?: Prisma.AddonOrderByWithRelationInput;
    }) {
        const { skip, take, where, orderBy } = params;
        return this.prisma.addon.findMany({
            skip,
            take,
            where,
            orderBy,
        });
    }

    async count(where?: Prisma.AddonWhereInput) {
        return this.prisma.addon.count({ where });
    }

    async findById(id: string) {
        return this.prisma.addon.findFirst({
            where: { id, is_deleted: false },
        });
    }

    async findByName(name: string, excludeId?: string) {
        return this.prisma.addon.findFirst({
            where: {
                name,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
    }

    async findByIds(ids: string[]) {
        return this.prisma.addon.findMany({
            where: { id: { in: ids }, is_deleted: false },
        });
    }

    async findAllActive() {
        return this.prisma.addon.findMany({
            where: { is_active: true, is_deleted: false },
            orderBy: { name: 'asc' },
        });
    }

    async update(id: string, data: Prisma.AddonUpdateInput) {
        return this.prisma.addon.update({
            where: { id },
            data,
        });
    }

    async softDelete(id: string, userId: string) {
        return this.prisma.addon.update({
            where: { id },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });
    }

    async softDeleteMany(ids: string[], userId: string) {
        return this.prisma.addon.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });
    }

    // Cập nhật trạng thái mapping TierAddonGift khi addon thay đổi is_active
    async updateTierGiftStatus(addonId: string, isActive: boolean) {
        return this.prisma.tierAddonGift.updateMany({
            where: { addon_id: addonId },
            data: { is_active: isActive },
        });
    }

    // Soft delete các TierAddonGift khi addon bị xóa
    async softDeleteTierGifts(addonId: string, userId: string) {
        return this.prisma.tierAddonGift.updateMany({
            where: { addon_id: addonId },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });
    }
}
