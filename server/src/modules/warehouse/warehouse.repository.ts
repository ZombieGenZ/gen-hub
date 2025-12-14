import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryWarehouseDto } from './dto';
import { IWarehouseWithRelations, IPaginatedResponse, IWarehouseLayout } from './interfaces';

/**
 * Repository xử lý database operations cho Warehouse
 */
@Injectable()
export class WarehouseRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paginationConfig: PaginationConfigService,
    ) { }

    private readonly fullInclude = {
        organization: {
            select: {
                id: true,
                name: true,
            },
        },
        ward: {
            select: {
                id: true,
                name: true,
                code: true,
                type: true,
                province: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true,
                    },
                },
            },
        },
        rows: {
            where: { is_deleted: false },
            orderBy: { created_at: 'asc' as const },
            include: {
                racks: {
                    where: { is_deleted: false },
                    orderBy: { created_at: 'asc' as const },
                    include: {
                        shelves: {
                            where: { is_deleted: false },
                            orderBy: { created_at: 'asc' as const },
                            include: {
                                blocks: {
                                    where: { is_deleted: false },
                                    orderBy: { created_at: 'asc' as const },
                                },
                            },
                        },
                    },
                },
            },
        },
    };

    private readonly listInclude = {
        organization: {
            select: {
                id: true,
                name: true,
            },
        },
        ward: {
            select: {
                id: true,
                name: true,
                code: true,
                type: true,
                province: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true,
                    },
                },
            },
        },
        _count: {
            select: {
                rows: { where: { is_deleted: false } },
            },
        },
    };

    async create(data: Prisma.WarehouseCreateInput): Promise<IWarehouseWithRelations> {
        return this.prisma.warehouse.create({
            data,
            include: this.fullInclude,
        }) as unknown as IWarehouseWithRelations;
    }

    async findById(id: string): Promise<IWarehouseWithRelations | null> {
        return this.prisma.warehouse.findFirst({
            where: { id, is_deleted: false },
            include: this.fullInclude,
        }) as unknown as IWarehouseWithRelations | null;
    }

    async findMany(
        query: QueryWarehouseDto,
    ): Promise<IPaginatedResponse<IWarehouseWithRelations>> {
        const limit = this.paginationConfig.getLimit(query.limit);
        const offset = this.paginationConfig.getOffset(query.offset);
        const { keywords, is_active, organization_id } = query;

        const where: Prisma.WarehouseWhereInput = {
            is_deleted: false,
            ...(is_active !== undefined && { is_active }),
            ...(organization_id && { organization_id }),
            ...(keywords && {
                OR: [
                    { name: { contains: keywords, mode: 'insensitive' } },
                    { description: { contains: keywords, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.warehouse.findMany({
                where,
                include: this.listInclude,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.warehouse.count({ where }),
        ]);

        return {
            items: items as unknown as IWarehouseWithRelations[],
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    async update(id: string, data: Prisma.WarehouseUpdateInput): Promise<IWarehouseWithRelations> {
        return this.prisma.warehouse.update({
            where: { id },
            data,
            include: this.fullInclude,
        }) as unknown as IWarehouseWithRelations;
    }

    async softDelete(id: string, deletedBy: string): Promise<IWarehouseWithRelations> {
        return this.prisma.warehouse.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
            include: this.fullInclude,
        }) as unknown as IWarehouseWithRelations;
    }

    /**
     * Lấy layout warehouse với toàn bộ cấu trúc rows/racks/shelves/blocks
     */
    async getLayout(id: string): Promise<IWarehouseLayout | null> {
        const warehouse = await this.prisma.warehouse.findFirst({
            where: { id, is_deleted: false },
            include: this.fullInclude,
        });

        if (!warehouse) return null;

        return {
            id: warehouse.id,
            name: warehouse.name,
            description: warehouse.description,
            unit: warehouse.unit,
            length: warehouse.length,
            width: warehouse.width,
            rows: warehouse.rows.map(row => ({
                id: row.id,
                name: row.name,
                code: row.code,
                position_x: row.position_x ? Number(row.position_x) : null,
                position_y: row.position_y ? Number(row.position_y) : null,
                position_rotation: row.position_rotation ? Number(row.position_rotation) : null,
                is_rented: row.is_rented,
                racks: row.racks.map(rack => ({
                    id: rack.id,
                    name: rack.name,
                    code: rack.code,
                    position_x: rack.position_x ? Number(rack.position_x) : null,
                    position_y: rack.position_y ? Number(rack.position_y) : null,
                    position_rotation: rack.position_rotation ? Number(rack.position_rotation) : null,
                    dimensions_width: rack.dimensions_width ? Number(rack.dimensions_width) : null,
                    dimensions_depth: rack.dimensions_depth ? Number(rack.dimensions_depth) : null,
                    dimensions_height: rack.dimensions_height ? Number(rack.dimensions_height) : null,
                    shelves: rack.shelves.map(shelf => ({
                        id: shelf.id,
                        name: shelf.name,
                        code: shelf.code,
                        blocks: shelf.blocks.map(block => ({
                            id: block.id,
                            name: block.name,
                            code: block.code,
                            position_x: block.position_x ? Number(block.position_x) : null,
                            position_y: block.position_y ? Number(block.position_y) : null,
                            dimensions_width: block.dimensions_width ? Number(block.dimensions_width) : null,
                            dimensions_height: block.dimensions_height ? Number(block.dimensions_height) : null,
                        })),
                    })),
                })),
            })),
        };
    }

    /**
     * Lấy warehouse theo organization
     */
    async findByOrganization(organizationId: string): Promise<IWarehouseWithRelations[]> {
        return this.prisma.warehouse.findMany({
            where: {
                organization_id: organizationId,
                is_deleted: false,
            },
            include: this.listInclude,
        }) as unknown as IWarehouseWithRelations[];
    }

    /**
     * Transaction wrapper
     */
    async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }
}
