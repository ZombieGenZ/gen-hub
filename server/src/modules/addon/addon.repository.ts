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

    async findById(id: string, userId?: string, hasReadAllPermission?: boolean) {
        const where: any = { id, is_deleted: false };
        
        // Nếu không có quyền read.all, chỉ lấy item của chính user
        if (!hasReadAllPermission && userId) {
            where.created_by = userId;
        }
        
        return this.prisma.addon.findFirst({
            where,
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

    async findByIds(ids: string[], userId?: string, hasDeleteAllPermission?: boolean) {
        const where: any = { id: { in: ids }, is_deleted: false };
        
        // Nếu không có quyền delete.all, chỉ lấy items của chính user
        if (!hasDeleteAllPermission && userId) {
            where.created_by = userId;
        }
        
        return this.prisma.addon.findMany({
            where,
        });
    }

    async findAllActive(params?: { skip?: number; take?: number; addonTypeId?: string }) {
        const { skip, take, addonTypeId } = params || {};
        const where: Prisma.AddonWhereInput = {
            is_active: true,
            is_deleted: false,
        };

        if (addonTypeId) {
            where.addon_types = {
                some: {
                    addon_type_id: addonTypeId,
                    is_deleted: false,
                },
            };
        }

        return this.prisma.addon.findMany({
            skip,
            take,
            where,
            orderBy: { name: 'asc' },
        });
    }

    async countActive(addonTypeId?: string) {
        const where: Prisma.AddonWhereInput = {
            is_active: true,
            is_deleted: false,
        };

        if (addonTypeId) {
            where.addon_types = {
                some: {
                    addon_type_id: addonTypeId,
                    is_deleted: false,
                },
            };
        }

        return this.prisma.addon.count({ where });
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
