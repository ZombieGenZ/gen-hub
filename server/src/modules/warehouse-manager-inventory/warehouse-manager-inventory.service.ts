import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ReceiptStatus, ExportStatus, TransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import {
    QueryPendingInboundDto,
    QueryPendingOutboundDto,
    ApproveInboundDto,
    RejectInboundDto,
    ApproveOutboundDto,
    RejectOutboundDto,
} from './dto';
import { IInboundRequest, IOutboundRequest, IPaginatedResponse, PickingStrategy } from '../inventory-request/interfaces';

@Injectable()
export class WarehouseManagerInventoryService {
    private readonly INBOUND_KEY_PREFIX: string;
    private readonly OUTBOUND_KEY_PREFIX: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly i18n: I18nService,
    ) {
        this.INBOUND_KEY_PREFIX = this.configService.get<string>('REDIS_INBOUND_KEY_PREFIX') || 'inventory:inbound';
        this.OUTBOUND_KEY_PREFIX = this.configService.get<string>('REDIS_OUTBOUND_KEY_PREFIX') || 'inventory:outbound';
    }

    // ==================== PENDING LISTS ====================

    /**
     * Danh sách phiếu nhập chờ xử lý cho warehouse manager
     */
    async findPendingInbound(
        warehouseIds: string[],
        query: QueryPendingInboundDto,
        lang: string,
    ): Promise<IPaginatedResponse<IInboundRequest>> {
        const { warehouse_id, keywords, limit = 10, offset = 0 } = query;

        // Lọc warehouseIds theo warehouse_id nếu có
        const targetWarehouseIds = warehouse_id
            ? warehouseIds.filter(id => id === warehouse_id)
            : warehouseIds;

        if (targetWarehouseIds.length === 0) {
            return { items: [], total: 0, limit, offset, hasMore: false };
        }

        const where: Prisma.ReceiptWhereInput = {
            warehouse_id: { in: targetWarehouseIds },
            status: ReceiptStatus.PENDING,
            is_deleted: false,
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
                orderBy: { created_at: 'asc' },
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
     * Danh sách phiếu xuất chờ xử lý cho warehouse manager
     */
    async findPendingOutbound(
        warehouseIds: string[],
        query: QueryPendingOutboundDto,
        lang: string,
    ): Promise<IPaginatedResponse<IOutboundRequest>> {
        const { warehouse_id, keywords, limit = 10, offset = 0 } = query;

        const targetWarehouseIds = warehouse_id
            ? warehouseIds.filter(id => id === warehouse_id)
            : warehouseIds;

        if (targetWarehouseIds.length === 0) {
            return { items: [], total: 0, limit, offset, hasMore: false };
        }

        const where: Prisma.ExportWhereInput = {
            warehouse_id: { in: targetWarehouseIds },
            status: ExportStatus.PENDING,
            is_deleted: false,
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
                orderBy: { created_at: 'asc' },
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

    // ==================== APPROVE/REJECT INBOUND ====================

    /**
     * Xác nhận nhập kho - chạy thuật toán fill
     */
    async approveInbound(
        receiptId: string,
        warehouseIds: string[],
        dto: ApproveInboundDto,
        actorId: string,
        lang: string,
    ): Promise<IInboundRequest> {
        // Tìm receipt và validate
        const receipt = await this.prisma.receipt.findFirst({
            where: {
                id: receiptId,
                warehouse_id: { in: warehouseIds },
                is_deleted: false,
            },
            include: {
                details: {
                    where: { is_deleted: false },
                    include: {
                        product: { select: { id: true, name: true, weight: true } },
                        batch: true,
                    },
                },
                warehouse: true,
            },
        });

        if (!receipt) {
            throw new NotFoundException(
                await this.i18n.translate('inventory-request.errors.receipt_not_found', { lang }),
            );
        }

        if (receipt.status !== ReceiptStatus.PENDING) {
            throw new BadRequestException(
                await this.i18n.translate('inventory-request.errors.already_processed', { lang }),
            );
        }

        // Transaction: Cập nhật actual_qty, fill inventory, tạo transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // 1. Cập nhật actual_qty cho từng detail
            for (const detail of receipt.details) {
                const actualQtyObj = dto.actual_quantities?.find(a => a.detail_id === detail.id);
                const actualQty = actualQtyObj?.actual_qty ?? detail.expected_qty.toNumber();

                await tx.receiptDetail.update({
                    where: { id: detail.id },
                    data: { actual_qty: actualQty },
                });

                // 2. Chạy thuật toán fill vào kho
                if (actualQty > 0) {
                    await this.fillInventory(
                        tx,
                        receipt.organization_id,
                        receipt.warehouse_id,
                        detail.product_id,
                        detail.batch_id,
                        actualQty,
                        detail.conversion_rate.toNumber(),
                        receipt.code,
                        actorId,
                    );
                }
            }

            // 3. Cập nhật status receipt
            return tx.receipt.update({
                where: { id: receiptId },
                data: {
                    status: ReceiptStatus.COMPLETED,
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
            });
        });

        // Invalidate cache
        await Promise.all([
            this.redisService.delByPattern(`${this.INBOUND_KEY_PREFIX}:*`),
            this.redisService.del(`${this.INBOUND_KEY_PREFIX}:detail:${receiptId}`),
        ]);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(receipt.organization_id, 'inbound:approved', {
            receiptId: receipt.id,
            code: receipt.code,
            approvedBy: actorId,
            summary: {
                totalProducts: receipt.details.length,
            },
            timestamp: new Date().toISOString(),
        });

        // Audit log
        this.auditLogService.logUpdate(
            receipt.organization_id,
            'Receipt',
            receipt.id,
            { status: ReceiptStatus.PENDING } as Record<string, unknown>,
            { status: ReceiptStatus.COMPLETED } as Record<string, unknown>,
            { userId: actorId, description: `Approved inbound: ${receipt.code}` },
        );

        return result as unknown as IInboundRequest;
    }

    /**
     * Từ chối nhập kho
     */
    async rejectInbound(
        receiptId: string,
        warehouseIds: string[],
        dto: RejectInboundDto,
        actorId: string,
        lang: string,
    ): Promise<IInboundRequest> {
        const receipt = await this.prisma.receipt.findFirst({
            where: {
                id: receiptId,
                warehouse_id: { in: warehouseIds },
                is_deleted: false,
            },
        });

        if (!receipt) {
            throw new NotFoundException(
                await this.i18n.translate('inventory-request.errors.receipt_not_found', { lang }),
            );
        }

        if (receipt.status !== ReceiptStatus.PENDING) {
            throw new BadRequestException(
                await this.i18n.translate('inventory-request.errors.already_processed', { lang }),
            );
        }

        const result = await this.prisma.receipt.update({
            where: { id: receiptId },
            data: {
                status: ReceiptStatus.CANCELLED,
                notes: dto.reason,
                updated_by: actorId,
            },
            include: {
                warehouse: { select: { id: true, name: true } },
                partner: { select: { id: true, name: true, code: true } },
            },
        });

        // Invalidate cache
        await Promise.all([
            this.redisService.delByPattern(`${this.INBOUND_KEY_PREFIX}:*`),
            this.redisService.del(`${this.INBOUND_KEY_PREFIX}:detail:${receiptId}`),
        ]);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(receipt.organization_id, 'inbound:rejected', {
            receiptId: receipt.id,
            code: receipt.code,
            rejectedBy: actorId,
            reason: dto.reason,
            timestamp: new Date().toISOString(),
        });

        return result as unknown as IInboundRequest;
    }

    // ==================== APPROVE/REJECT OUTBOUND ====================

    /**
     * Xác nhận xuất kho - chạy thuật toán pick
     */
    async approveOutbound(
        exportId: string,
        warehouseIds: string[],
        dto: ApproveOutboundDto,
        actorId: string,
        lang: string,
    ): Promise<IOutboundRequest> {
        const exportRecord = await this.prisma.export.findFirst({
            where: {
                id: exportId,
                warehouse_id: { in: warehouseIds },
                is_deleted: false,
            },
            include: {
                details: {
                    where: { is_deleted: false },
                    include: {
                        product: { select: { id: true, name: true } },
                        batch: true,
                    },
                },
                warehouse: true,
            },
        });

        if (!exportRecord) {
            throw new NotFoundException(
                await this.i18n.translate('inventory-request.errors.export_not_found', { lang }),
            );
        }

        if (exportRecord.status !== ExportStatus.PENDING) {
            throw new BadRequestException(
                await this.i18n.translate('inventory-request.errors.already_processed', { lang }),
            );
        }

        const pickingStrategy = dto.picking_strategy || PickingStrategy.FEFO;

        // Transaction: Pick inventory, tạo transaction
        const result = await this.prisma.$transaction(async (tx) => {
            for (const detail of exportRecord.details) {
                const quantityToPick = detail.quantity.toNumber() * detail.conversion_rate.toNumber();

                await this.pickInventory(
                    tx,
                    exportRecord.organization_id,
                    exportRecord.warehouse_id,
                    detail.product_id,
                    detail.required_batch_id,
                    quantityToPick,
                    pickingStrategy,
                    exportRecord.code,
                    actorId,
                    lang,
                );
            }

            return tx.export.update({
                where: { id: exportId },
                data: {
                    status: ExportStatus.SHIPPED,
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
            });
        });

        // Invalidate cache
        await Promise.all([
            this.redisService.delByPattern(`${this.OUTBOUND_KEY_PREFIX}:*`),
            this.redisService.del(`${this.OUTBOUND_KEY_PREFIX}:detail:${exportId}`),
        ]);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(exportRecord.organization_id, 'outbound:approved', {
            exportId: exportRecord.id,
            code: exportRecord.code,
            approvedBy: actorId,
            pickingStrategy,
            timestamp: new Date().toISOString(),
        });

        return result as unknown as IOutboundRequest;
    }

    /**
     * Từ chối xuất kho
     */
    async rejectOutbound(
        exportId: string,
        warehouseIds: string[],
        dto: RejectOutboundDto,
        actorId: string,
        lang: string,
    ): Promise<IOutboundRequest> {
        const exportRecord = await this.prisma.export.findFirst({
            where: {
                id: exportId,
                warehouse_id: { in: warehouseIds },
                is_deleted: false,
            },
        });

        if (!exportRecord) {
            throw new NotFoundException(
                await this.i18n.translate('inventory-request.errors.export_not_found', { lang }),
            );
        }

        if (exportRecord.status !== ExportStatus.PENDING) {
            throw new BadRequestException(
                await this.i18n.translate('inventory-request.errors.already_processed', { lang }),
            );
        }

        const result = await this.prisma.export.update({
            where: { id: exportId },
            data: {
                status: ExportStatus.CANCELLED,
                updated_by: actorId,
            },
            include: {
                warehouse: { select: { id: true, name: true } },
                partner: { select: { id: true, name: true, code: true } },
            },
        });

        // Invalidate cache
        await Promise.all([
            this.redisService.delByPattern(`${this.OUTBOUND_KEY_PREFIX}:*`),
            this.redisService.del(`${this.OUTBOUND_KEY_PREFIX}:detail:${exportId}`),
        ]);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(exportRecord.organization_id, 'outbound:rejected', {
            exportId: exportRecord.id,
            code: exportRecord.code,
            rejectedBy: actorId,
            reason: dto.reason,
            timestamp: new Date().toISOString(),
        });

        return result as unknown as IOutboundRequest;
    }

    // ==================== FILL ALGORITHM ====================

    /**
     * Thuật toán fill hàng vào kho
     * 
     * Ưu tiên:
     * 1. Shelves có assigned_product_id = product_id
     * 2. Sắp xếp: Row.code ASC → Rack.code ASC → Shelf.code DESC → Block.code ASC
     * 3. Chỉ fill vào blocks thuộc rows có is_rented = true
     */
    private async fillInventory(
        tx: Prisma.TransactionClient,
        orgId: string,
        warehouseId: string,
        productId: string,
        batchId: string | null,
        quantity: number,
        conversionRate: number,
        referenceCode: string,
        actorId: string,
    ): Promise<void> {
        // Chuyển đổi về đơn vị cơ bản
        const baseQuantity = quantity * conversionRate;

        // Lấy tất cả blocks có thể fill (thuộc rows đã thuê)
        const availableBlocks = await tx.block.findMany({
            where: {
                is_deleted: false,
                is_active: true,
                shelf: {
                    is_deleted: false,
                    is_active: true,
                    rack: {
                        is_deleted: false,
                        is_active: true,
                        row: {
                            warehouse_id: warehouseId,
                            is_deleted: false,
                            is_active: true,
                            is_rented: true,
                        },
                    },
                },
            },
            include: {
                shelf: {
                    include: {
                        rack: {
                            include: {
                                row: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { shelf: { rack: { row: { code: 'asc' } } } },
                { shelf: { rack: { code: 'asc' } } },
                { shelf: { code: 'desc' } },
                { code: 'asc' },
            ],
        });

        // Phân loại blocks
        const assignedBlocks = availableBlocks.filter(
            b => b.shelf.assigned_product_id === productId,
        );
        const unassignedBlocks = availableBlocks.filter(
            b => !b.shelf.assigned_product_id,
        );

        // Ưu tiên fill vào assigned blocks trước
        const sortedBlocks = [...assignedBlocks, ...unassignedBlocks];

        let remainingQty = baseQuantity;

        for (const block of sortedBlocks) {
            if (remainingQty <= 0) break;

            // Tìm hoặc tạo inventory record
            const existingInventory = await tx.inventory.findFirst({
                where: {
                    organization_id: orgId,
                    warehouse_id: warehouseId,
                    block_id: block.id,
                    product_id: productId,
                    batch_id: batchId,
                    is_deleted: false,
                },
            });

            const fillQty = remainingQty; // Fill hết vào block này (có thể cải tiến với capacity check)

            if (existingInventory) {
                // Update inventory
                await tx.inventory.update({
                    where: { id: existingInventory.id },
                    data: {
                        quantity: { increment: fillQty },
                        quantity_on_hand: { increment: fillQty },
                        quantity_available: { increment: fillQty },
                        updated_by: actorId,
                    },
                });
            } else {
                // Create new inventory
                await tx.inventory.create({
                    data: {
                        organization_id: orgId,
                        warehouse_id: warehouseId,
                        block_id: block.id,
                        product_id: productId,
                        batch_id: batchId,
                        quantity: fillQty,
                        quantity_on_hand: fillQty,
                        quantity_allocated: 0,
                        quantity_available: fillQty,
                        created_by: actorId,
                    },
                });
            }

            // Tạo transaction log
            await tx.inventoryTransaction.create({
                data: {
                    organization_id: orgId,
                    warehouse_id: warehouseId,
                    product_id: productId,
                    batch_id: batchId,
                    to_block_id: block.id,
                    type: TransactionType.INBOUND,
                    quantity: fillQty,
                    reference_code: referenceCode,
                    created_by: actorId,
                },
            });

            remainingQty = 0; // Simplified: fill all in first block
        }
    }

    // ==================== PICK ALGORITHM ====================

    /**
     * Thuật toán pick hàng từ kho
     * 
     * FEFO: First Expired First Out - Hạn sử dụng gần nhất xuất trước
     * FIFO: First In First Out - Nhập trước xuất trước
     */
    private async pickInventory(
        tx: Prisma.TransactionClient,
        orgId: string,
        warehouseId: string,
        productId: string,
        requiredBatchId: string | null,
        quantity: number,
        strategy: PickingStrategy,
        referenceCode: string,
        actorId: string,
        lang: string,
    ): Promise<void> {
        // Tìm inventory records theo strategy
        const inventories = await tx.inventory.findMany({
            where: {
                organization_id: orgId,
                warehouse_id: warehouseId,
                product_id: productId,
                ...(requiredBatchId && { batch_id: requiredBatchId }),
                quantity_available: { gt: 0 },
                is_deleted: false,
            },
            include: {
                batch: true,
            },
            orderBy: strategy === PickingStrategy.FEFO
                ? [{ batch: { expiry_date: 'asc' } }, { created_at: 'asc' }]
                : [{ created_at: 'asc' }],
        });

        let remainingQty = quantity;

        for (const inv of inventories) {
            if (remainingQty <= 0) break;

            const available = inv.quantity_available.toNumber();
            const pickQty = Math.min(remainingQty, available);

            // Update inventory
            await tx.inventory.update({
                where: { id: inv.id },
                data: {
                    quantity: { decrement: pickQty },
                    quantity_on_hand: { decrement: pickQty },
                    quantity_available: { decrement: pickQty },
                    updated_by: actorId,
                },
            });

            // Tạo transaction log
            await tx.inventoryTransaction.create({
                data: {
                    organization_id: orgId,
                    warehouse_id: warehouseId,
                    product_id: productId,
                    batch_id: inv.batch_id,
                    from_block_id: inv.block_id,
                    type: TransactionType.OUTBOUND,
                    quantity: pickQty,
                    reference_code: referenceCode,
                    created_by: actorId,
                },
            });

            remainingQty -= pickQty;
        }

        if (remainingQty > 0) {
            throw new BadRequestException(
                await this.i18n.translate('inventory-request.errors.insufficient_stock', { lang }),
            );
        }
    }
}
