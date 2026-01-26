import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IAddonTypeWithRelations } from './types';
import { addonTypeListSelect, addonDetailSelect } from './selects';

@Injectable()
export class AddonTypeRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.AddonTypeCreateInput): Promise<IAddonTypeWithRelations> {
        return this.prisma.addonType.create({
            data,
            select: addonDetailSelect,
        });
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        where?: Prisma.AddonTypeWhereInput;
        orderBy?: Prisma.AddonTypeOrderByWithRelationInput;
    }): Promise<IAddonTypeWithRelations[]> {
        const { skip, take, where, orderBy } = params;
        return this.prisma.addonType.findMany({
            skip,
            take,
            where,
            orderBy,
            select: addonTypeListSelect,
        });
    }

    async count(where?: Prisma.AddonTypeWhereInput): Promise<number> {
        return this.prisma.addonType.count({ where });
    }

    async findById(id: string, userId?: string, hasReadAllPermission?: boolean): Promise<IAddonTypeWithRelations | null> {
        const where: any = { id, is_deleted: false };
        
        // Nếu không có quyền read.all, chỉ lấy item của chính user
        if (!hasReadAllPermission && userId) {
            where.created_by = userId;
        }
        
        return this.prisma.addonType.findFirst({
            where,
            select: addonDetailSelect,
        });
    }

    async findByName(name: string, excludeId?: string): Promise<IAddonTypeWithRelations | null> {
        return this.prisma.addonType.findFirst({
            where: {
                name,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
            select: addonDetailSelect,
        });
    }

    async findAllActive(params?: { skip?: number; take?: number }): Promise<IAddonTypeWithRelations[]> {
        const { skip, take } = params || {};
        const where: any = { is_active: true, is_deleted: false };
        
        return this.prisma.addonType.findMany({
            skip,
            take,
            where,
            orderBy: { name: 'asc' },
            select: addonTypeListSelect,
        });
    }

    async countActive(): Promise<number> {
        return this.prisma.addonType.count({
            where: { is_active: true, is_deleted: false },
        });
    }

    async update(id: string, data: Prisma.AddonTypeUpdateInput): Promise<IAddonTypeWithRelations> {
        return this.prisma.addonType.update({
            where: { id },
            data,
            select: addonDetailSelect,
        });
    }

    async softDelete(id: string, userId: string): Promise<IAddonTypeWithRelations> {
        return this.prisma.addonType.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: userId,
            },
            select: addonDetailSelect,
        });
    }

    async findByIds(ids: string[], userId?: string, hasDeleteAllPermission?: boolean): Promise<IAddonTypeWithRelations[]> {
        const where: any = { id: { in: ids }, is_deleted: false };
        
        // Nếu không có quyền delete.all, chỉ lấy items của chính user
        if (!hasDeleteAllPermission && userId) {
            where.created_by = userId;
        }
        
        return this.prisma.addonType.findMany({
            where,
            select: addonTypeListSelect,
        });
    }

    async softDeleteMany(ids: string[], userId: string): Promise<void> {
        await this.prisma.addonType.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });
    }

    /**
     * Cập nhật trạng thái mapping khi loại addon thay đổi is_active
     */
    async updateMappingStatus(addonTypeId: string, isActive: boolean): Promise<void> {
        await this.prisma.addonTypeOnAddon.updateMany({
            where: { addon_type_id: addonTypeId },
            data: { is_active: isActive },
        });
    }

    /**
     * Soft delete mappings khi loại addon bị xóa
     */
    async softDeleteMappings(addonTypeId: string, userId: string): Promise<void> {
        await this.prisma.addonTypeOnAddon.updateMany({
            where: { addon_type_id: addonTypeId },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });
    }
}
