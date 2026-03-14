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

    async findByIds(ids: string[]): Promise<{ id: string; name: string; organization_id: string }[]> {
        return this.prisma.warehouse.findMany({
            where: { id: { in: ids }, is_deleted: false },
            select: { id: true, name: true, organization_id: true },
        });
    }

    async softDeleteMany(ids: string[], deletedBy: string): Promise<{ count: number }> {
        return this.prisma.warehouse.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
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

    /**
     * Lấy danh sách racks của warehouse
     */
    async findRacksByWarehouseId(warehouseId: string) {
        const rows = await this.prisma.row.findMany({
            where: { warehouse_id: warehouseId, is_deleted: false },
            include: {
                racks: {
                    where: { is_deleted: false },
                    orderBy: { created_at: 'asc' },
                },
            },
        });

        // Flatten racks từ tất cả rows
        return rows.flatMap((row) =>
            row.racks.map((rack) => ({
                ...rack,
                row_id: row.id,
                row_name: row.name,
                row_code: row.code,
            })),
        );
    }

    /**
     * Lấy danh sách shelves của rack
     */
    async findShelvesByRackId(rackId: string) {
        const rack = await this.prisma.rack.findFirst({
            where: { id: rackId, is_deleted: false },
            include: {
                shelves: {
                    where: { is_deleted: false },
                    orderBy: { created_at: 'asc' },
                },
            },
        });

        if (!rack) return null;

        return rack.shelves.map((shelf) => ({
            ...shelf,
            rack_id: rack.id,
            rack_name: rack.name,
            rack_code: rack.code,
        }));
    }

    /**
     * Lấy danh sách blocks của shelf
     */
    async findBlocksByShelfId(shelfId: string) {
        const shelf = await this.prisma.shelf.findFirst({
            where: { id: shelfId, is_deleted: false },
            include: {
                blocks: {
                    where: { is_deleted: false },
                    orderBy: { created_at: 'asc' },
                },
            },
        });

        if (!shelf) return null;

        return shelf.blocks.map((block) => ({
            ...block,
            shelf_id: shelf.id,
            shelf_name: shelf.name,
            shelf_code: shelf.code,
        }));
    }

    /**
     * Kiểm tra rack thuộc warehouse
     */
    async isRackInWarehouse(rackId: string, warehouseId: string): Promise<boolean> {
        const rack = await this.prisma.rack.findFirst({
            where: { id: rackId, is_deleted: false },
            include: {
                row: {
                    select: { warehouse_id: true },
                },
            },
        });

        return rack?.row?.warehouse_id === warehouseId;
    }

    /**
     * Kiểm tra shelf thuộc warehouse
     */
    async isShelfInWarehouse(shelfId: string, warehouseId: string): Promise<boolean> {
        const shelf = await this.prisma.shelf.findFirst({
            where: { id: shelfId, is_deleted: false },
            include: {
                rack: {
                    include: {
                        row: {
                            select: { warehouse_id: true },
                        },
                    },
                },
            },
        });

        return shelf?.rack?.row?.warehouse_id === warehouseId;
    }

    /**
     * Lấy danh sách rows của warehouse
     */
    async findRowsByWarehouseId(warehouseId: string) {
        return this.prisma.row.findMany({
            where: {
                warehouse_id: warehouseId,
                is_deleted: false,
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Lấy chi tiết row theo ID
     */
    async findRowById(rowId: string) {
        return this.prisma.row.findFirst({
            where: {
                id: rowId,
                is_deleted: false,
            },
        });
    }

    /**
     * Lấy danh sách racks theo row ID
     */
    async findRacksByRowId(rowId: string) {
        return this.prisma.rack.findMany({
            where: {
                row_id: rowId,
                is_deleted: false,
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Cập nhật shelf
     */
    async updateShelf(shelfId: string, data: { name?: string; description?: string; assigned_product_id?: string | null; updated_by?: string }) {
        return this.prisma.shelf.update({
            where: { id: shelfId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.assigned_product_id !== undefined && { assigned_product_id: data.assigned_product_id }),
                updated_by: data.updated_by,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Kiểm tra row thuộc warehouse
     */
    async isRowInWarehouse(rowId: string, warehouseId: string): Promise<boolean> {
        const row = await this.prisma.row.findFirst({
            where: { id: rowId, is_deleted: false, warehouse_id: warehouseId },
        });
        return !!row;
    }

    /**
     * Kiểm tra block thuộc warehouse
     */
    async isBlockInWarehouse(blockId: string, warehouseId: string): Promise<boolean> {
        const block = await this.prisma.block.findFirst({
            where: { id: blockId, is_deleted: false },
            include: {
                shelf: {
                    include: {
                        rack: {
                            include: {
                                row: {
                                    select: { warehouse_id: true },
                                },
                            },
                        },
                    },
                },
            },
        });
        return block?.shelf?.rack?.row?.warehouse_id === warehouseId;
    }

    /**
     * Cập nhật row
     */
    async updateRow(rowId: string, data: { name?: string; description?: string; updated_by?: string }) {
        return this.prisma.row.update({
            where: { id: rowId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                updated_by: data.updated_by,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Cập nhật rack
     */
    async updateRack(rackId: string, data: { name?: string; description?: string; updated_by?: string }) {
        return this.prisma.rack.update({
            where: { id: rackId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                updated_by: data.updated_by,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Cập nhật block
     */
    async updateBlock(blockId: string, data: { name?: string; description?: string; updated_by?: string }) {
        return this.prisma.block.update({
            where: { id: blockId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                updated_by: data.updated_by,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Tìm rack theo ID
     */
    async findRackById(rackId: string) {
        return this.prisma.rack.findFirst({
            where: { id: rackId, is_deleted: false },
        });
    }

    /**
     * Tìm block theo ID
     */
    async findBlockById(blockId: string) {
        return this.prisma.block.findFirst({
            where: { id: blockId, is_deleted: false },
        });
    }

    /**
     * Tìm shelf theo ID
     */
    async findShelfById(shelfId: string) {
        return this.prisma.shelf.findFirst({
            where: { id: shelfId, is_deleted: false },
        });
    }

    /**
     * Lấy danh sách inventory stock theo warehouse_id
     * Dùng cho 3D warehouse visualization (render boxes)
     */
    async getInventoryStock(warehouseId: string) {
        const items = await this.prisma.inventory.findMany({
            where: {
                warehouse_id: warehouseId,
                is_deleted: false,
                quantity_on_hand: { gt: 0 },
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        image_url: true,
                    },
                },
                batch: {
                    select: {
                        id: true,
                        code: true,
                        expiry_date: true,
                    },
                },
                block: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        shelf: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                rack: {
                                    select: {
                                        id: true,
                                        name: true,
                                        code: true,
                                        row: {
                                            select: {
                                                id: true,
                                                name: true,
                                                code: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });

        return items.map((inv) => {
            const rowCode = inv.block?.shelf?.rack?.row?.code || '';
            const rackCode = inv.block?.shelf?.rack?.code || '';
            const shelfCode = inv.block?.shelf?.code || '';
            const blockCode = inv.block?.code || '';
            const location = [rowCode, rackCode, shelfCode, blockCode].filter(Boolean).join('-');

            const now = new Date();
            const createdAt = new Date(inv.created_at);
            const daysInStorage = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

            return {
                id: inv.id,
                product_id: inv.product_id,
                product_name: inv.product?.name || '',
                sku: inv.product?.sku || '',
                image_url: inv.product?.image_url || null,
                batch_code: inv.batch?.code || null,
                expiry_date: inv.batch?.expiry_date ? inv.batch.expiry_date.toISOString() : null,
                quantity: Number(inv.quantity),
                quantity_on_hand: Number(inv.quantity_on_hand),
                quantity_allocated: Number(inv.quantity_allocated),
                quantity_available: Number(inv.quantity_available),
                warehouse_id: inv.warehouse_id,
                warehouse_name: inv.warehouse?.name || '',
                block_id: inv.block_id,
                location,
                row_code: rowCode,
                rack_code: rackCode,
                days_in_storage: daysInStorage,
                created_at: inv.created_at.toISOString(),
            };
        });
    }
}

