import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IAddonTypeWithRelations } from './interfaces';

@Injectable()
export class AddonTypeRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.AddonTypeCreateInput): Promise<IAddonTypeWithRelations> {
        return this.prisma.addonType.create({ data });
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
            include: {
                addons: {
                    where: { is_deleted: false },
                    include: {
                        addon: true,
                    },
                },
            },
        });
    }

    async count(where?: Prisma.AddonTypeWhereInput): Promise<number> {
        return this.prisma.addonType.count({ where });
    }

    async findById(id: string): Promise<IAddonTypeWithRelations | null> {
        return this.prisma.addonType.findFirst({
            where: { id, is_deleted: false },
            include: {
                addons: {
                    where: { is_deleted: false },
                    include: {
                        addon: true,
                    },
                },
            },
        });
    }

    async findByName(name: string, excludeId?: string): Promise<IAddonTypeWithRelations | null> {
        return this.prisma.addonType.findFirst({
            where: {
                name,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
    }

    async findAllActive(): Promise<IAddonTypeWithRelations[]> {
        return this.prisma.addonType.findMany({
            where: { is_active: true, is_deleted: false },
            orderBy: { name: 'asc' },
        });
    }

    async update(id: string, data: Prisma.AddonTypeUpdateInput): Promise<IAddonTypeWithRelations> {
        return this.prisma.addonType.update({
            where: { id },
            data,
            include: {
                addons: {
                    where: { is_deleted: false },
                    include: {
                        addon: true,
                    },
                },
            },
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
        });
    }

    async findByIds(ids: string[]): Promise<IAddonTypeWithRelations[]> {
        return this.prisma.addonType.findMany({
            where: { id: { in: ids }, is_deleted: false },
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
