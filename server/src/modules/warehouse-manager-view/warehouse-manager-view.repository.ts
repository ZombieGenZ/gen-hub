import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Warehouse, Row, Rack, Shelf, Block } from '@prisma/client';
import { IPaginatedResponse } from '../../common/interfaces/pagination.interface';
import { QueryWarehouseManagerViewDto } from './dto/query-warehouse-manager-view.dto';

/**
 * Repository cho Warehouse Manager View APIs
 * Xử lý truy vấn database cho warehouses, rows, racks, shelves, blocks
 */
@Injectable()
export class WarehouseManagerViewRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lấy danh sách warehouses theo template ID
     */
    async findWarehousesByTemplateId(
        templateId: string,
        query: QueryWarehouseManagerViewDto,
    ): Promise<IPaginatedResponse<Warehouse>> {
        const { limit = 10, offset = 0, keywords, is_active } = query;

        const where: Prisma.WarehouseWhereInput = {
            warehouse_template_id: templateId,
            is_deleted: false,
            ...(is_active !== undefined && { is_active }),
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
                skip: offset,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    organization: {
                        select: { id: true, name: true },
                    },
                    ward: true,
                },
            }),
            this.prisma.warehouse.count({ where }),
        ]);

        return {
            items,
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
        };
    }

    /**
     * Lấy chi tiết warehouse theo ID
     */
    async findWarehouseById(warehouseId: string): Promise<Warehouse | null> {
        return this.prisma.warehouse.findFirst({
            where: {
                id: warehouseId,
                is_deleted: false,
            },
            include: {
                organization: {
                    select: { id: true, name: true },
                },
                ward: true,
                warehouse_template: {
                    select: { id: true, name: true },
                },
            },
        });
    }

    /**
     * Lấy danh sách rows theo warehouse ID
     */
    async findRowsByWarehouseId(
        warehouseId: string,
        query: QueryWarehouseManagerViewDto,
    ): Promise<IPaginatedResponse<Row>> {
        const { limit = 10, offset = 0, keywords, is_active } = query;

        const where: Prisma.RowWhereInput = {
            warehouse_id: warehouseId,
            is_deleted: false,
            ...(is_active !== undefined && { is_active }),
            ...(keywords && {
                OR: [
                    { name: { contains: keywords, mode: 'insensitive' } },
                    { code: { contains: keywords, mode: 'insensitive' } },
                    { description: { contains: keywords, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.row.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.row.count({ where }),
        ]);

        return {
            items,
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
        };
    }

    /**
     * Lấy chi tiết row theo ID
     */
    async findRowById(rowId: string): Promise<Row | null> {
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
    async findRacksByRowId(
        rowId: string,
        query: QueryWarehouseManagerViewDto,
    ): Promise<IPaginatedResponse<Rack>> {
        const { limit = 10, offset = 0, keywords, is_active } = query;

        const where: Prisma.RackWhereInput = {
            row_id: rowId,
            is_deleted: false,
            ...(is_active !== undefined && { is_active }),
            ...(keywords && {
                OR: [
                    { name: { contains: keywords, mode: 'insensitive' } },
                    { code: { contains: keywords, mode: 'insensitive' } },
                    { description: { contains: keywords, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.rack.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.rack.count({ where }),
        ]);

        return {
            items,
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
        };
    }

    /**
     * Lấy chi tiết rack theo ID
     */
    async findRackById(rackId: string): Promise<Rack | null> {
        return this.prisma.rack.findFirst({
            where: {
                id: rackId,
                is_deleted: false,
            },
        });
    }

    /**
     * Lấy danh sách shelves theo rack ID
     */
    async findShelvesByRackId(
        rackId: string,
        query: QueryWarehouseManagerViewDto,
    ): Promise<IPaginatedResponse<Shelf>> {
        const { limit = 10, offset = 0, keywords, is_active } = query;

        const where: Prisma.ShelfWhereInput = {
            rack_id: rackId,
            is_deleted: false,
            ...(is_active !== undefined && { is_active }),
            ...(keywords && {
                OR: [
                    { name: { contains: keywords, mode: 'insensitive' } },
                    { code: { contains: keywords, mode: 'insensitive' } },
                    { description: { contains: keywords, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.shelf.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    product: {
                        select: { id: true, name: true, sku: true },
                    },
                },
            }),
            this.prisma.shelf.count({ where }),
        ]);

        return {
            items,
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
        };
    }

    /**
     * Lấy chi tiết shelf theo ID
     */
    async findShelfById(shelfId: string): Promise<Shelf | null> {
        return this.prisma.shelf.findFirst({
            where: {
                id: shelfId,
                is_deleted: false,
            },
            include: {
                product: {
                    select: { id: true, name: true, sku: true },
                },
            },
        });
    }

    /**
     * Lấy danh sách blocks theo shelf ID
     */
    async findBlocksByShelfId(
        shelfId: string,
        query: QueryWarehouseManagerViewDto,
    ): Promise<IPaginatedResponse<Block>> {
        const { limit = 10, offset = 0, keywords, is_active } = query;

        const where: Prisma.BlockWhereInput = {
            shelf_id: shelfId,
            is_deleted: false,
            ...(is_active !== undefined && { is_active }),
            ...(keywords && {
                OR: [
                    { name: { contains: keywords, mode: 'insensitive' } },
                    { code: { contains: keywords, mode: 'insensitive' } },
                    { description: { contains: keywords, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.block.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    inventories: {
                        where: { is_deleted: false },
                        select: {
                            id: true,
                            quantity: true,
                            batch_id: true,
                        },
                    },
                },
            }),
            this.prisma.block.count({ where }),
        ]);

        return {
            items,
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
        };
    }

    /**
     * Lấy chi tiết block theo ID
     */
    async findBlockById(blockId: string): Promise<Block | null> {
        return this.prisma.block.findFirst({
            where: {
                id: blockId,
                is_deleted: false,
            },
            include: {
                inventories: {
                    where: { is_deleted: false },
                    select: {
                        id: true,
                        quantity: true,
                        batch_id: true,
                    },
                },
            },
        });
    }
}
