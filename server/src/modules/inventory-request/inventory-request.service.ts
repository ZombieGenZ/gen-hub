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

@Injectable()
export class InventoryRequestService {
    private readonly INBOUND_LIST_TTL: number;
    private readonly OUTBOUND_LIST_TTL: number;
    private readonly INBOUND_DETAIL_TTL: number;
    private readonly OUTBOUND_DETAIL_TTL: number;
    private readonly INBOUND_KEY_PREFIX: string;
    private readonly OUTBOUND_KEY_PREFIX: string;

    constructor(
        private readonly repository: InventoryRequestRepository,
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly i18n: I18nService,
    ) {
        this.INBOUND_LIST_TTL = this.configService.get<number>('REDIS_INBOUND_LIST_TTL') || 60;
        this.OUTBOUND_LIST_TTL = this.configService.get<number>('REDIS_OUTBOUND_LIST_TTL') || 60;
        this.INBOUND_DETAIL_TTL = this.configService.get<number>('REDIS_INBOUND_DETAIL_TTL') || 120;
        this.OUTBOUND_DETAIL_TTL = this.configService.get<number>('REDIS_OUTBOUND_DETAIL_TTL') || 120;
        this.INBOUND_KEY_PREFIX = this.configService.get<string>('REDIS_INBOUND_KEY_PREFIX') || 'inventory:inbound';
        this.OUTBOUND_KEY_PREFIX = this.configService.get<string>('REDIS_OUTBOUND_KEY_PREFIX') || 'inventory:outbound';
    }

    private getInboundListCacheKey(orgId: string, query: QueryInboundRequestDto): string {
        const sortedParams = Object.keys(query)
            .sort()
            .filter(key => query[key as keyof QueryInboundRequestDto] !== undefined)
            .map(key => `${key}=${query[key as keyof QueryInboundRequestDto]}`)
            .join('&');
        return `${this.INBOUND_KEY_PREFIX}:list:${orgId}:${sortedParams}`;
    }

    private getOutboundListCacheKey(orgId: string, query: QueryOutboundRequestDto): string {
        const sortedParams = Object.keys(query)
            .sort()
            .filter(key => query[key as keyof QueryOutboundRequestDto] !== undefined)
            .map(key => `${key}=${query[key as keyof QueryOutboundRequestDto]}`)
            .join('&');
        return `${this.OUTBOUND_KEY_PREFIX}:list:${orgId}:${sortedParams}`;
    }

    private getInboundDetailCacheKey(id: string): string {
        return `${this.INBOUND_KEY_PREFIX}:detail:${id}`;
    }

    private getOutboundDetailCacheKey(id: string): string {
        return `${this.OUTBOUND_KEY_PREFIX}:detail:${id}`;
    }

    /**
     * Tạo yêu cầu nhập kho
     */
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
                    organization: { connect: { id: orgId } },
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
                        conversion_unit_id: detail.unit_id,
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
        await this.redisService.delByPattern(`${this.INBOUND_KEY_PREFIX}:list:${orgId}:*`);

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
                    organization: { connect: { id: orgId } },
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
                        conversion_unit_id: detail.unit_id,
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
        await this.redisService.delByPattern(`${this.OUTBOUND_KEY_PREFIX}:list:${orgId}:*`);

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
}
