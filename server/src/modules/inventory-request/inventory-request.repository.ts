import { Injectable } from '@nestjs/common';
import { Prisma, ReceiptStatus, ExportStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryInboundRequestDto, QueryOutboundRequestDto } from './dto';
import { IInboundRequest, IOutboundRequest, IPaginatedResponse } from './interfaces';

@Injectable()
export class InventoryRequestRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Tạo phiếu nhập kho
     */
    async createInbound(data: Prisma.ReceiptCreateInput): Promise<IInboundRequest> {
        return this.prisma.receipt.create({
            data,
            include: {
                warehouse: { select: { id: true, name: true } },
                partner: { select: { id: true, name: true, code: true } },
                details: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, image_url: true } },
                        batch: { select: { id: true, code: true, expiry_date: true } },
                        unit: { select: { id: true, name: true } },
                    },
                },
            },
        }) as unknown as IInboundRequest;
    }

    /**
     * Tìm phiếu nhập theo ID và orgId
     */
    async findInboundById(id: string, orgId: string): Promise<IInboundRequest | null> {
        return this.prisma.receipt.findFirst({
            where: {
                id,
                organization_id: orgId,
                is_deleted: false,
            },
            include: {
                warehouse: { select: { id: true, name: true } },
                partner: { select: { id: true, name: true, code: true } },
                details: {
                    where: { is_deleted: false },
                    include: {
                        product: { select: { id: true, name: true, sku: true, image_url: true } },
                        batch: { select: { id: true, code: true, expiry_date: true } },
                        unit: { select: { id: true, name: true } },
                    },
                },
            },
        }) as unknown as IInboundRequest | null;
    }

    /**
     * Danh sách phiếu nhập của organization
     */
    async findInboundByOrgId(
        orgId: string,
        query: QueryInboundRequestDto,
    ): Promise<IPaginatedResponse<IInboundRequest>> {
        const { warehouse_id, keywords, status, limit = 10, offset = 0 } = query;

        const where: Prisma.ReceiptWhereInput = {
            organization_id: orgId,
            is_deleted: false,
            ...(warehouse_id && { warehouse_id }),
            ...(status && { status }),
            ...(keywords && {
                OR: [
                    { code: { contains: keywords, mode: 'insensitive' } },
                    { purchase_order_code: { contains: keywords, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.receipt.findMany({
                where,
                include: {
                    warehouse: { select: { id: true, name: true } },
                    partner: { select: { id: true, name: true, code: true } },
                    _count: { select: { details: true } },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.receipt.count({ where }),
        ]);

        return {
            items: items as unknown as IInboundRequest[],
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    /**
     * Cập nhật trạng thái phiếu nhập
     */
    async updateInboundStatus(
        id: string,
        status: ReceiptStatus,
        actorId: string,
    ): Promise<IInboundRequest> {
        return this.prisma.receipt.update({
            where: { id },
            data: {
                status,
                updated_by: actorId,
            },
            include: {
                warehouse: { select: { id: true, name: true } },
                partner: { select: { id: true, name: true, code: true } },
                details: {
                    where: { is_deleted: false },
                    include: {
                        product: { select: { id: true, name: true, sku: true, image_url: true } },
                        batch: { select: { id: true, code: true, expiry_date: true } },
                        unit: { select: { id: true, name: true } },
                    },
                },
            },
        }) as unknown as IInboundRequest;
    }

    /**
     * Tạo phiếu xuất kho
     */
    async createOutbound(data: Prisma.ExportCreateInput): Promise<IOutboundRequest> {
        return this.prisma.export.create({
            data,
            include: {
                warehouse: { select: { id: true, name: true } },
                partner: { select: { id: true, name: true, code: true } },
                details: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, image_url: true } },
                        batch: { select: { id: true, code: true, expiry_date: true } },
                        unit: { select: { id: true, name: true } },
                    },
                },
            },
        }) as unknown as IOutboundRequest;
    }

    /**
     * Tìm phiếu xuất theo ID và orgId
     */
    async findOutboundById(id: string, orgId: string): Promise<IOutboundRequest | null> {
        return this.prisma.export.findFirst({
            where: {
                id,
                organization_id: orgId,
                is_deleted: false,
            },
            include: {
                warehouse: { select: { id: true, name: true } },
                partner: { select: { id: true, name: true, code: true } },
                details: {
                    where: { is_deleted: false },
                    include: {
                        product: { select: { id: true, name: true, sku: true, image_url: true } },
                        batch: { select: { id: true, code: true, expiry_date: true } },
                        unit: { select: { id: true, name: true } },
                    },
                },
                pick_lists: {
                    where: { is_deleted: false },
                    include: {
                        details: {
                            where: { is_deleted: false },
                            include: {
                                pick_list: { select: { id: true, code: true, status: true } },
                            },
                        },
                    },
                    orderBy: { created_at: 'desc' },
                },
            },
        }) as unknown as IOutboundRequest | null;
    }

    /**
     * Danh sách phiếu xuất của organization
     */
    async findOutboundByOrgId(
        orgId: string,
        query: QueryOutboundRequestDto,
    ): Promise<IPaginatedResponse<IOutboundRequest>> {
        const { warehouse_id, keywords, status, limit = 10, offset = 0 } = query;

        const where: Prisma.ExportWhereInput = {
            organization_id: orgId,
            is_deleted: false,
            ...(warehouse_id && { warehouse_id }),
            ...(status && { status }),
            ...(keywords && {
                OR: [
                    { code: { contains: keywords, mode: 'insensitive' } },
                    { sales_order_code: { contains: keywords, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.export.findMany({
                where,
                include: {
                    warehouse: { select: { id: true, name: true } },
                    partner: { select: { id: true, name: true, code: true } },
                    _count: { select: { details: true } },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.export.count({ where }),
        ]);

        return {
            items: items as unknown as IOutboundRequest[],
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    /**
     * Cập nhật trạng thái phiếu xuất
     */
    async updateOutboundStatus(
        id: string,
        status: ExportStatus,
        actorId: string,
    ): Promise<IOutboundRequest> {
        return this.prisma.export.update({
            where: { id },
            data: {
                status,
                updated_by: actorId,
            },
            include: {
                warehouse: { select: { id: true, name: true } },
                partner: { select: { id: true, name: true, code: true } },
                details: {
                    where: { is_deleted: false },
                    include: {
                        product: { select: { id: true, name: true, sku: true, image_url: true } },
                        batch: { select: { id: true, code: true, expiry_date: true } },
                        unit: { select: { id: true, name: true } },
                    },
                },
            },
        }) as unknown as IOutboundRequest;
    }

    /**
     * Kiểm tra warehouse thuộc org
     */
    async warehouseExistsInOrg(warehouseId: string, orgId: string): Promise<boolean> {
        const count = await this.prisma.warehouse.count({
            where: {
                id: warehouseId,
                organization_id: orgId,
                is_deleted: false,
            },
        });
        return count > 0;
    }

    /**
     * Kiểm tra product thuộc org
     */
    async productExistsInOrg(productId: string, orgId: string): Promise<boolean> {
        const count = await this.prisma.product.count({
            where: { id: productId, organization_id: orgId, is_deleted: false },
        });
        return count > 0;
    }

    /**
     * Kiểm tra partner thuộc org
     */
    async partnerExistsInOrg(partnerId: string, orgId: string): Promise<boolean> {
        const count = await this.prisma.partner.count({
            where: { id: partnerId, organization_id: orgId, is_deleted: false, is_active: true },
        });
        return count > 0;
    }

    /**
     * Kiểm tra unit thuộc org
     */
    async unitExistsInOrg(unitId: string, orgId: string): Promise<boolean> {
        const count = await this.prisma.unit.count({
            where: { id: unitId, organization_id: orgId, is_deleted: false, is_active: true },
        });
        return count > 0;
    }

    /**
     * Kiểm tra batch thuộc product
     */
    async batchExistsForProduct(batchId: string, productId: string): Promise<boolean> {
        const count = await this.prisma.batch.count({
            where: { id: batchId, product_id: productId, is_deleted: false },
        });
        return count > 0;
    }

    /**
     * Lấy danh sách kho mà tổ chức có quyền sử dụng (có hợp đồng thuê)
     */
    async listOrgWarehouses(orgId: string): Promise<{ id: string; name: string }[]> {
        return this.prisma.warehouse.findMany({
            where: {
                organization_id: orgId,
                is_deleted: false,
                is_active: true,
            },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Sinh mã phiếu nhập
     */
    async generateInboundCode(orgId: string): Promise<string> {
        const today = new Date();
        const prefix = `PN-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

        const lastReceipt = await this.prisma.receipt.findFirst({
            where: {
                organization_id: orgId,
                code: { startsWith: prefix },
            },
            orderBy: { created_at: 'desc' },
            select: { code: true },
        });

        let nextNumber = 1;
        if (lastReceipt) {
            const lastNumber = parseInt(lastReceipt.code.split('-').pop() || '0', 10);
            nextNumber = lastNumber + 1;
        }

        return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
    }

    /**
     * Sinh mã phiếu xuất
     */
    async generateOutboundCode(orgId: string): Promise<string> {
        const today = new Date();
        const prefix = `PX-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

        const lastExport = await this.prisma.export.findFirst({
            where: {
                organization_id: orgId,
                code: { startsWith: prefix },
            },
            orderBy: { created_at: 'desc' },
            select: { code: true },
        });

        let nextNumber = 1;
        if (lastExport) {
            const lastNumber = parseInt(lastExport.code.split('-').pop() || '0', 10);
            nextNumber = lastNumber + 1;
        }

        return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
    }
}
