import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AmenityRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: {
        name: string;
        description?: string;
        is_active?: boolean;
        created_by: string;
    }) {
        return this.prisma.amenity.create({
            data: {
                name: data.name,
                description: data.description,
                is_active: data.is_active ?? true,
                created_by: data.created_by,
            },
        });
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        where?: any;
        orderBy?: any;
    }) {
        const { skip, take, where, orderBy } = params;
        return this.prisma.amenity.findMany({
            skip,
            take,
            where,
            orderBy,
        });
    }

    async count(where?: any) {
        return this.prisma.amenity.count({ where });
    }

    async findById(id: string) {
        return this.prisma.amenity.findFirst({
            where: { id, is_deleted: false },
        });
    }

    async findByName(name: string, excludeId?: string) {
        return this.prisma.amenity.findFirst({
            where: {
                name,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
    }

    async update(id: string, data: {
        name?: string;
        description?: string;
        is_active?: boolean;
        updated_by: string;
    }) {
        return this.prisma.amenity.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                is_active: data.is_active,
                updated_by: data.updated_by,
            },
        });
    }

    // Cập nhật is_active của tất cả mapping khi amenity thay đổi is_active
    async updateMappingStatus(amenityId: string, isActive: boolean) {
        return this.prisma.amenityOnWarehouseTemplate.updateMany({
            where: { amenity_id: amenityId, is_deleted: false },
            data: { is_active: isActive },
        });
    }

    async softDelete(id: string, deletedBy: string) {
        return this.prisma.amenity.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    // Soft delete tất cả mapping khi amenity bị xóa
    async softDeleteMappings(amenityId: string, deletedBy: string) {
        return this.prisma.amenityOnWarehouseTemplate.updateMany({
            where: { amenity_id: amenityId },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async softDeleteMany(ids: string[], deletedBy: string) {
        return this.prisma.amenity.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async softDeleteMappingsMany(amenityIds: string[], deletedBy: string) {
        return this.prisma.amenityOnWarehouseTemplate.updateMany({
            where: { amenity_id: { in: amenityIds } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async findByIds(ids: string[]) {
        return this.prisma.amenity.findMany({
            where: { id: { in: ids }, is_deleted: false },
        });
    }
}
