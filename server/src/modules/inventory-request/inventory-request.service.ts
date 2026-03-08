import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ReceiptStatus, Prisma } from '@prisma/client';
import { InventoryRequestRepository } from './inventory-request.repository';
import {
    CreateInboundRequestDto,
    CreateOutboundRequestDto,
    QueryInboundRequestDto,
    QueryOutboundRequestDto,
} from './dto';
import {
    IInboundRequest,
    IOutboundRequest,
    IPaginatedResponse,
    PickingStrategy,
} from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryRequestCacheKeys } from './constants/inventory-request-cache.helper';

@Injectable()
export class InventoryRequestService {
    private readonly INBOUND_LIST_TTL: number;
    private readonly OUTBOUND_LIST_TTL: number;
    private readonly INBOUND_DETAIL_TTL: number;
    private readonly OUTBOUND_DETAIL_TTL: number;

    constructor(
        private readonly repository: InventoryRequestRepository,
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly i18n: I18nService,
        private readonly cacheKeys: InventoryRequestCacheKeys,
    ) {
        this.INBOUND_LIST_TTL = this.configService.get<number>('REDIS_INBOUND_LIST_TTL') || 60;
        this.OUTBOUND_LIST_TTL = this.configService.get<number>('REDIS_OUTBOUND_LIST_TTL') || 60;
        this.INBOUND_DETAIL_TTL = this.configService.get<number>('REDIS_INBOUND_DETAIL_TTL') || 120;
        this.OUTBOUND_DETAIL_TTL = this.configService.get<number>('REDIS_OUTBOUND_DETAIL_TTL') || 120;
    }

    private getInboundListCacheKey(orgId: string, query: QueryInboundRequestDto): string {
        const sortedParams = Object.keys(query)
            .sort()
            .filter(key => query[key as keyof QueryInboundRequestDto] !== undefined)
            .map(key => `${key}=${query[key as keyof QueryInboundRequestDto]}`)
            .join('&');
        return this.cacheKeys.inboundList(orgId, sortedParams);
    }

    private getOutboundListCacheKey(orgId: string, query: QueryOutboundRequestDto): string {
        const sortedParams = Object.keys(query)
            .sort()
            .filter(key => query[key as keyof QueryOutboundRequestDto] !== undefined)
            .map(key => `${key}=${query[key as keyof QueryOutboundRequestDto]}`)
            .join('&');
        return this.cacheKeys.outboundList(orgId, sortedParams);
    }

    private getInboundDetailCacheKey(id: string): string {
        return this.cacheKeys.inboundDetail(id);
    }

    private getOutboundDetailCacheKey(id: string): string {
        return this.cacheKeys.outboundDetail(id);
    }

    /**
     * Tạo yêu cầu nhập kho
     */
    /**
     * Lấy danh sách kho mà tổ chức có quyền sử dụng.
     * Nếu không có kho nào, thử backfill từ hợp đồng ACTIVE (lazy activation).
     */
    async listOrgWarehouses(orgId: string): Promise<{ id: string; name: string }[]> {
        let warehouses = await this.repository.listOrgWarehouses(orgId);

        if (warehouses.length === 0) {
            // Lazy backfill: tạo Warehouse cho các hợp đồng ACTIVE chưa được generate
            const activeStatuses = ['ACTIVE', 'OVERDUE_LEVEL_1', 'OVERDUE_LEVEL_2', 'OVERDUE_LEVEL_3'];
            const details = await this.prisma.rentalContractDetail.findMany({
                where: {
                    is_deleted: false,
                    warehouse_id: null,
                    is_whole_warehouse: true,
                    rental_contract: {
                        organization_id: orgId,
                        is_deleted: false,
                        status: { in: activeStatuses as any },
                    },
                },
                include: { warehouse_template: true },
            });

            for (const detail of details) {
                const template = detail.warehouse_template;
                if (!template) continue;

                const warehouse = await this.prisma.warehouse.create({
                    data: {
                        name: detail.warehouse_name || template.name,
                        description: detail.warehouse_description || template.description || null,
                        organization_id: orgId,
                        length: template.length,
                        width: template.width,
                        block_length: template.block_length,
                        block_width: template.block_width,
                        ceiling_height: template.ceiling_height ?? null,
                        max_load_capacity: template.max_load_capacity ?? null,
                        total_weight_capacity: template.total_weight_capacity ?? null,
                        ward_id: template.ward_id ?? null,
                        address_detail: template.address_detail ?? null,
                        latitude: template.latitude ?? null,
                        longitude: template.longitude ?? null,
                        warehouse_template_id: template.id,
                        is_active: true,
                        is_deleted: false,
                        created_by: 'SYSTEM_BACKFILL',
                    },
                });

                await this.prisma.rentalContractDetail.update({
                    where: { id: detail.id },
                    data: { warehouse_id: warehouse.id },
                });
            }

            if (details.length > 0) {
                warehouses = await this.repository.listOrgWarehouses(orgId);
            }
        }

        return warehouses;
    }

    async createInbound(
        orgId: string,
        dto: CreateInboundRequestDto,
        actorId: string,
        lang: string,
    ): Promise<IInboundRequest> {
        // Validate warehouse thuộc org
        const warehouseValid = await this.repository.warehouseExistsInOrg(dto.warehouse_id, orgId);
        if (!warehouseValid) {
            throw new NotFoundException(
                await this.i18n.translate('inventory-request.errors.warehouse_not_rented', { lang }),
            );
        }

        // Validate partner nếu có
        if (dto.partner_id) {
            const partnerValid = await this.repository.partnerExistsInOrg(dto.partner_id, orgId);
            if (!partnerValid) {
                throw new NotFoundException(
                    await this.i18n.translate('inventory-request.errors.partner_not_found', { lang }),
                );
            }
        }

        // Validate products và units
        for (const detail of dto.details) {
            const productValid = await this.repository.productExistsInOrg(detail.product_id, orgId);
            if (!productValid) {
                throw new NotFoundException(
                    await this.i18n.translate('inventory-request.errors.product_not_found', { lang }),
                );
            }

            const unitValid = await this.repository.unitExistsInOrg(detail.unit_id, orgId);
            if (!unitValid) {
                throw new NotFoundException(
                    await this.i18n.translate('inventory-request.errors.unit_not_found', { lang }),
                );
            }

            // Validate batch nếu có
            if (detail.batch_id) {
                const batchValid = await this.repository.batchExistsForProduct(detail.batch_id, detail.product_id);
                if (!batchValid) {
                    throw new NotFoundException(
                        await this.i18n.translate('inventory-request.errors.batch_not_found', { lang }),
                    );
                }
            }
        }

        // Generate code
        const code = await this.repository.generateInboundCode(orgId);

        // Tạo phiếu nhập với Prisma transaction
        const receipt = await this.prisma.$transaction(async (tx) => {
            // Tạo phiếu nhập
            const createdReceipt = await tx.receipt.create({
                data: {
                    code,
                    status: ReceiptStatus.PENDING,
                    notes: dto.notes,
                    purchase_order_code: dto.purchase_order_code,
                    organization_id: orgId,
                    warehouse: { connect: { id: dto.warehouse_id } },
                    ...(dto.partner_id && { partner: { connect: { id: dto.partner_id } } }),
                    created_by: actorId,
                },
            });

            // Tạo chi tiết với batch mới nếu cần
            for (const detail of dto.details) {
                let batchId = detail.batch_id;

                // Tạo batch mới nếu không có batch_id nhưng có thông tin batch
                if (!batchId && detail.batch_code) {
                    const newBatch = await tx.batch.create({
                        data: {
                            code: detail.batch_code,
                            manufacturing_date: detail.manufacturing_date ? new Date(detail.manufacturing_date) : null,
                            expiry_date: detail.expiry_date ? new Date(detail.expiry_date) : null,
                            import_price: detail.import_price ?? 0,
                            product: { connect: { id: detail.product_id } },
                            created_by: actorId,
                        },
                    });
                    batchId = newBatch.id;
                }

                // Lấy conversion rate từ product unit
                const productUnit = await tx.productUnit.findFirst({
                    where: {
                        product_id: detail.product_id,
                        unit_id: detail.unit_id,
                        is_deleted: false,
                    },
                    select: { conversion_rate: true },
                });

                await tx.receiptDetail.create({
                    data: {
                        receipt: { connect: { id: createdReceipt.id } },
                        product: { connect: { id: detail.product_id } },
                        ...(batchId && { batch: { connect: { id: batchId } } }),
                        unit: { connect: { id: detail.unit_id } },
                        expected_qty: detail.expected_qty,
                        actual_qty: 0, // Sẽ được cập nhật khi approve
                        conversion_rate: productUnit?.conversion_rate?.toNumber() ?? 1,
                        created_by: actorId,
                    },
                });
            }

            return createdReceipt;
        });

        // Lấy full receipt với relations
        const fullReceipt = await this.repository.findInboundById(receipt.id, orgId);

        // Invalidate cache
        // Invalidate cache
        await this.redisService.delByPattern(this.cacheKeys.inboundList(orgId, '*'));

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'inbound:created', {
            receiptId: receipt.id,
            code: receipt.code,
            warehouseId: dto.warehouse_id,
            createdBy: actorId,
            timestamp: new Date().toISOString(),
        });

        // Audit log
        this.auditLogService.logCreate(
            orgId,
            'Receipt',
            receipt.id,
            fullReceipt as unknown as Record<string, unknown>,
            { userId: actorId, description: `Created inbound request: ${receipt.code}` },
        );

        return fullReceipt!;
    }

    /**
     * Danh sách yêu cầu nhập kho
     */
    async findAllInbound(
        orgId: string,
        query: QueryInboundRequestDto,
        lang: string,
    ): Promise<IPaginatedResponse<IInboundRequest>> {
        const cacheKey = this.getInboundListCacheKey(orgId, query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findInboundByOrgId(orgId, query);

        await this.redisService.set(cacheKey, JSON.stringify(result), this.INBOUND_LIST_TTL);

        return result;
    }

    /**
     * Chi tiết yêu cầu nhập kho
     */
    async findInboundById(
        orgId: string,
        id: string,
        lang: string,
    ): Promise<IInboundRequest> {
        const cacheKey = this.getInboundDetailCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            const receipt = JSON.parse(cached) as IInboundRequest;
            if (receipt.organization_id === orgId) {
                return receipt;
            }
        }

        const receipt = await this.repository.findInboundById(id, orgId);
        if (!receipt) {
            throw new NotFoundException(
                await this.i18n.translate('inventory-request.errors.receipt_not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(receipt), this.INBOUND_DETAIL_TTL);

        return receipt;
    }

    /**
     * Tạo yêu cầu xuất kho
     */
    async createOutbound(
        orgId: string,
        dto: CreateOutboundRequestDto,
        actorId: string,
        lang: string,
    ): Promise<IOutboundRequest> {
        // Validate warehouse thuộc org
        const warehouseValid = await this.repository.warehouseExistsInOrg(dto.warehouse_id, orgId);
        if (!warehouseValid) {
            throw new NotFoundException(
                await this.i18n.translate('inventory-request.errors.warehouse_not_rented', { lang }),
            );
        }

        // Validate partner nếu có
        if (dto.partner_id) {
            const partnerValid = await this.repository.partnerExistsInOrg(dto.partner_id, orgId);
            if (!partnerValid) {
                throw new NotFoundException(
                    await this.i18n.translate('inventory-request.errors.partner_not_found', { lang }),
                );
            }
        }

        // Validate products và units
        for (const detail of dto.details) {
            const productValid = await this.repository.productExistsInOrg(detail.product_id, orgId);
            if (!productValid) {
                throw new NotFoundException(
                    await this.i18n.translate('inventory-request.errors.product_not_found', { lang }),
                );
            }

            const unitValid = await this.repository.unitExistsInOrg(detail.unit_id, orgId);
            if (!unitValid) {
                throw new NotFoundException(
                    await this.i18n.translate('inventory-request.errors.unit_not_found', { lang }),
                );
            }

            // Validate required_batch nếu có
            if (detail.required_batch_id) {
                const batchValid = await this.repository.batchExistsForProduct(detail.required_batch_id, detail.product_id);
                if (!batchValid) {
                    throw new NotFoundException(
                        await this.i18n.translate('inventory-request.errors.batch_not_found', { lang }),
                    );
                }
            }
        }

        // Generate code
        const code = await this.repository.generateOutboundCode(orgId);

        // Tạo phiếu xuất với Prisma transaction
        const exportRecord = await this.prisma.$transaction(async (tx) => {
            // Tạo phiếu xuất
            const createdExport = await tx.export.create({
                data: {
                    code,
                    status: 'PENDING',
                    sales_order_code: dto.sales_order_code,
                    organization_id: orgId,
                    warehouse: { connect: { id: dto.warehouse_id } },
                    ...(dto.partner_id && { partner: { connect: { id: dto.partner_id } } }),
                    created_by: actorId,
                },
            });

            // Tạo chi tiết
            for (const detail of dto.details) {
                // Lấy conversion rate từ product unit
                const productUnit = await tx.productUnit.findFirst({
                    where: {
                        product_id: detail.product_id,
                        unit_id: detail.unit_id,
                        is_deleted: false,
                    },
                    select: { conversion_rate: true },
                });

                await tx.exportDetail.create({
                    data: {
                        export: { connect: { id: createdExport.id } },
                        product: { connect: { id: detail.product_id } },
                        ...(detail.required_batch_id && { batch: { connect: { id: detail.required_batch_id } } }),
                        unit: { connect: { id: detail.unit_id } },
                        quantity: detail.quantity,
                        conversion_rate: productUnit?.conversion_rate?.toNumber() ?? 1,
                        created_by: actorId,
                    },
                });
            }

            return createdExport;
        });

        // Lấy full export với relations
        const fullExport = await this.repository.findOutboundById(exportRecord.id, orgId);

        // Invalidate cache
        // Invalidate cache
        await this.redisService.delByPattern(this.cacheKeys.outboundList(orgId, '*'));

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'outbound:created', {
            exportId: exportRecord.id,
            code: exportRecord.code,
            warehouseId: dto.warehouse_id,
            createdBy: actorId,
            pickingStrategy: dto.picking_strategy || PickingStrategy.FEFO,
            timestamp: new Date().toISOString(),
        });

        // Audit log
        this.auditLogService.logCreate(
            orgId,
            'Export',
            exportRecord.id,
            fullExport as unknown as Record<string, unknown>,
            { userId: actorId, description: `Created outbound request: ${exportRecord.code}` },
        );

        return fullExport!;
    }

    /**
     * Danh sách yêu cầu xuất kho
     */
    async findAllOutbound(
        orgId: string,
        query: QueryOutboundRequestDto,
        lang: string,
    ): Promise<IPaginatedResponse<IOutboundRequest>> {
        const cacheKey = this.getOutboundListCacheKey(orgId, query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findOutboundByOrgId(orgId, query);

        await this.redisService.set(cacheKey, JSON.stringify(result), this.OUTBOUND_LIST_TTL);

        return result;
    }

    /**
     * Chi tiết yêu cầu xuất kho
     */
    async findOutboundById(
        orgId: string,
        id: string,
        lang: string,
    ): Promise<IOutboundRequest> {
        const cacheKey = this.getOutboundDetailCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            const exportRecord = JSON.parse(cached) as IOutboundRequest;
            if (exportRecord.organization_id === orgId) {
                return exportRecord;
            }
        }

        const exportRecord = await this.repository.findOutboundById(id, orgId);
        if (!exportRecord) {
            throw new NotFoundException(
                await this.i18n.translate('inventory-request.errors.export_not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(exportRecord), this.OUTBOUND_DETAIL_TTL);

        return exportRecord;
    }

    /**
     * Duyệt phiếu nhập kho (PENDING → APPROVED)
     */
    async approveInbound(
        orgId: string,
        id: string,
        actorId: string,
        lang: string,
        notes?: string,
    ): Promise<IInboundRequest> {
        const receipt = await this.repository.findInboundById(id, orgId);
        if (!receipt) {
            throw new NotFoundException(
                await this.i18n.translate('inventory-request.errors.receipt_not_found', { lang }),
            );
        }
        if (receipt.status !== ReceiptStatus.PENDING) {
            throw new ConflictException(
                await this.i18n.translate('inventory-request.errors.invalid_status', { lang }),
            );
        }

        const updated = await this.prisma.receipt.update({
            where: { id },
            data: {
                status: ReceiptStatus.APPROVED,
                approved_by: actorId,
                approved_at: new Date(),
                updated_by: actorId,
                ...(notes && { notes }),
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

        // Invalidate cache
        await Promise.all([
            this.redisService.del(this.getInboundDetailCacheKey(id)),
            this.redisService.delByPattern(this.cacheKeys.inboundList(orgId, '*')),
        ]);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'inbound:approved', {
            receiptId: id,
            code: updated.code,
            approvedBy: actorId,
            timestamp: new Date().toISOString(),
        });

        // Audit log
        this.auditLogService.logUpdate(
            orgId,
            'Receipt',
            id,
            { status: ReceiptStatus.PENDING },
            { status: ReceiptStatus.APPROVED },
            { userId: actorId, description: `Approved inbound request: ${updated.code}` },
        );

        return updated as unknown as IInboundRequest;
    }

    /**
     * Từ chối phiếu nhập kho (PENDING → CANCELLED)
     */
    async rejectInbound(
        orgId: string,
        id: string,
        actorId: string,
        lang: string,
        reason?: string,
    ): Promise<IInboundRequest> {
        const receipt = await this.repository.findInboundById(id, orgId);
        if (!receipt) {
            throw new NotFoundException(
                await this.i18n.translate('inventory-request.errors.receipt_not_found', { lang }),
            );
        }
        if (receipt.status !== ReceiptStatus.PENDING) {
            throw new ConflictException(
                await this.i18n.translate('inventory-request.errors.invalid_status', { lang }),
            );
        }

        const updated = await this.prisma.receipt.update({
            where: { id },
            data: {
                status: ReceiptStatus.CANCELLED,
                updated_by: actorId,
                ...(reason && { notes: reason }),
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

        // Invalidate cache
        await Promise.all([
            this.redisService.del(this.getInboundDetailCacheKey(id)),
            this.redisService.delByPattern(this.cacheKeys.inboundList(orgId, '*')),
        ]);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'inbound:rejected', {
            receiptId: id,
            code: updated.code,
            rejectedBy: actorId,
            reason,
            timestamp: new Date().toISOString(),
        });

        // Audit log
        this.auditLogService.logUpdate(
            orgId,
            'Receipt',
            id,
            { status: ReceiptStatus.PENDING },
            { status: ReceiptStatus.CANCELLED, reason },
            { userId: actorId, description: `Rejected inbound request: ${updated.code}` },
        );

        return updated as unknown as IInboundRequest;
    }

    /**
     * Duyệt phiếu xuất kho (PENDING → PICKING)
     */
    async approveOutbound(
        orgId: string,
        id: string,
        actorId: string,
        lang: string,
        notes?: string,
    ): Promise<IOutboundRequest> {
        const exportRecord = await this.repository.findOutboundById(id, orgId);
        if (!exportRecord) {
            throw new NotFoundException(
                await this.i18n.translate('inventory-request.errors.export_not_found', { lang }),
            );
        }
        if (exportRecord.status !== 'PENDING') {
            throw new ConflictException(
                await this.i18n.translate('inventory-request.errors.invalid_status', { lang }),
            );
        }

        const updated = await this.prisma.export.update({
            where: { id },
            data: {
                status: 'PICKING',
                updated_by: actorId,
                ...(notes && { notes }),
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

        // Invalidate cache
        await Promise.all([
            this.redisService.del(this.getOutboundDetailCacheKey(id)),
            this.redisService.delByPattern(this.cacheKeys.outboundList(orgId, '*')),
        ]);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'outbound:approved', {
            exportId: id,
            code: updated.code,
            approvedBy: actorId,
            timestamp: new Date().toISOString(),
        });

        // Audit log
        this.auditLogService.logUpdate(
            orgId,
            'Export',
            id,
            { status: 'PENDING' },
            { status: 'PICKING' },
            { userId: actorId, description: `Approved outbound request: ${updated.code}` },
        );

        return updated as unknown as IOutboundRequest;
    }

    /**
     * Từ chối phiếu xuất kho (PENDING → CANCELLED)
     */
    async rejectOutbound(
        orgId: string,
        id: string,
        actorId: string,
        lang: string,
        reason?: string,
    ): Promise<IOutboundRequest> {
        const exportRecord = await this.repository.findOutboundById(id, orgId);
        if (!exportRecord) {
            throw new NotFoundException(
                await this.i18n.translate('inventory-request.errors.export_not_found', { lang }),
            );
        }
        if (exportRecord.status !== 'PENDING') {
            throw new ConflictException(
                await this.i18n.translate('inventory-request.errors.invalid_status', { lang }),
            );
        }

        const updated = await this.prisma.export.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                updated_by: actorId,
                ...(reason && { notes: reason }),
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

        // Invalidate cache
        await Promise.all([
            this.redisService.del(this.getOutboundDetailCacheKey(id)),
            this.redisService.delByPattern(this.cacheKeys.outboundList(orgId, '*')),
        ]);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'outbound:rejected', {
            exportId: id,
            code: updated.code,
            rejectedBy: actorId,
            reason,
            timestamp: new Date().toISOString(),
        });

        // Audit log
        this.auditLogService.logUpdate(
            orgId,
            'Export',
            id,
            { status: 'PENDING' },
            { status: 'CANCELLED', reason },
            { userId: actorId, description: `Rejected outbound request: ${updated.code}` },
        );

        return updated as unknown as IOutboundRequest;
    }
}
