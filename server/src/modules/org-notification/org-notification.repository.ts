import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryOrgNotificationDto } from './dto';
import { IOrgNotification, IPaginatedResponse } from './interfaces';

/**
 * Repository xử lý database operations cho OrganizationNotification
 */
@Injectable()
export class OrgNotificationRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paginationConfig: PaginationConfigService,
    ) { }

    // Tạo mới OrganizationNotification
    async create(data: Prisma.OrganizationNotificationCreateInput): Promise<IOrgNotification> {
        return this.prisma.organizationNotification.create({ data });
    }

    // Tìm theo ID
    async findById(id: string): Promise<IOrgNotification | null> {
        return this.prisma.organizationNotification.findFirst({
            where: { id, is_deleted: false },
        });
    }

    // Tìm theo ID và orgId
    async findByIdAndOrgId(id: string, orgId: string): Promise<IOrgNotification | null> {
        return this.prisma.organizationNotification.findFirst({
            where: { id, organization_id: orgId, is_deleted: false },
        });
    }

    // Lấy danh sách theo organization với phân trang
    async findByOrgId(
        orgId: string,
        query: QueryOrgNotificationDto,
    ): Promise<IPaginatedResponse<IOrgNotification>> {
        const limit = this.paginationConfig.getLimit(query.limit);
        const offset = this.paginationConfig.getOffset(query.offset);

        const where: Prisma.OrganizationNotificationWhereInput = {
            organization_id: orgId,
            is_deleted: false,
        };

        if (query.keywords) {
            where.OR = [
                { title: { contains: query.keywords, mode: 'insensitive' } },
                { content: { contains: query.keywords, mode: 'insensitive' } },
            ];
        }

        if (query.is_active !== undefined) {
            where.is_active = query.is_active;
        }

        if (query.type) {
            where.type = query.type;
        }

        if (query.warehouse_id) {
            where.warehouse_id = query.warehouse_id;
        }

        const [data, total] = await Promise.all([
            this.prisma.organizationNotification.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: offset,
                take: limit,
            }),
            this.prisma.organizationNotification.count({ where }),
        ]);

        return {
            data,
            total,
            limit,
            offset,
            hasMore: offset + data.length < total,
        };
    }

    // Cập nhật OrganizationNotification
    async update(id: string, data: Prisma.OrganizationNotificationUpdateInput): Promise<IOrgNotification> {
        return this.prisma.organizationNotification.update({
            where: { id },
            data,
        });
    }

    // Xóa mềm OrganizationNotification
    async softDelete(id: string, deletedBy: string): Promise<IOrgNotification> {
        return this.prisma.organizationNotification.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async softDeleteMany(ids: string[], deletedBy: string): Promise<void> {
        await this.prisma.organizationNotification.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async findByIds(ids: string[]): Promise<IOrgNotification[]> {
        return this.prisma.organizationNotification.findMany({
            where: { id: { in: ids }, is_deleted: false },
        });
    }

    // Kiểm tra organization tồn tại
    async orgExists(orgId: string): Promise<boolean> {
        const org = await this.prisma.organization.findFirst({
            where: { id: orgId, is_deleted: false },
            select: { id: true },
        });
        return !!org;
    }

    // Kiểm tra warehouse thuộc organization
    async warehouseBelongsToOrg(warehouseId: string, orgId: string): Promise<boolean> {
        const warehouse = await this.prisma.warehouse.findFirst({
            where: { id: warehouseId, organization_id: orgId, is_deleted: false },
            select: { id: true },
        });
        return !!warehouse;
    }
}
