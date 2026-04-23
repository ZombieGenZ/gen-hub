import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import {
  ReceiptStatus,
  ExportStatus,
  TransactionType,
  Prisma,
  PickListStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { InventoryRequestService } from '../inventory-request/inventory-request.service';
import {
  QueryPendingInboundDto,
  QueryPendingOutboundDto,
  ApproveInboundDto,
  RejectInboundDto,
  ApproveOutboundDto,
  RejectOutboundDto,
  StartReceivingDto,
  ConfirmReceivingDto,
  ConfirmPutawayDto,
  ConfirmPickingDto,
  ConfirmCheckingDto,
  CompleteShipmentDto,
  AssignWorkersDto,
} from './dto';
import {
  IInboundRequest,
  IOutboundRequest,
  IPaginatedResponse,
  PickingStrategy,
} from '../inventory-request/interfaces';

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
    private readonly inventoryRequestService: InventoryRequestService,
  ) {
    this.INBOUND_KEY_PREFIX =
      this.configService.get<string>('REDIS_INBOUND_KEY_PREFIX') ||
      'inventory:inbound';
    this.OUTBOUND_KEY_PREFIX =
      this.configService.get<string>('REDIS_OUTBOUND_KEY_PREFIX') ||
      'inventory:outbound';
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
    void lang;
    const { warehouse_id, keywords, status, limit = 10, offset = 0 } = query;

    // Lọc warehouseIds theo warehouse_id nếu có
    const targetWarehouseIds = warehouse_id
      ? warehouseIds.filter((id) => id === warehouse_id)
      : warehouseIds;

    if (targetWarehouseIds.length === 0) {
      return { items: [], total: 0, limit, offset, hasMore: false };
    }

    const where: Prisma.ReceiptWhereInput = {
      warehouse_id: { in: targetWarehouseIds },
      is_deleted: false,
      ...(status ? { status } : {}),
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
    void lang;
    const { warehouse_id, keywords, status, limit = 10, offset = 0 } = query;

    const targetWarehouseIds = warehouse_id
      ? warehouseIds.filter((id) => id === warehouse_id)
      : warehouseIds;

    if (targetWarehouseIds.length === 0) {
      return { items: [], total: 0, limit, offset, hasMore: false };
    }

    const where: Prisma.ExportWhereInput = {
      warehouse_id: { in: targetWarehouseIds },
      is_deleted: false,
      ...(status ? { status } : {}),
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

  /**
   * Lấy chi tiết phiếu nhập theo quyền kho của warehouse manager
   */
  async getInboundById(
    receiptId: string,
    warehouseIds: string[],
    lang: string,
  ): Promise<IInboundRequest> {
    const receipt = await this.prisma.receipt.findFirst({
      where: {
        id: receiptId,
        warehouse_id: { in: warehouseIds },
        is_deleted: false,
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true, code: true } },
        details: {
          where: { is_deleted: false },
          include: {
            product: {
              select: { id: true, name: true, sku: true, image_url: true },
            },
            batch: { select: { id: true, code: true, expiry_date: true } },
            unit: { select: { id: true, name: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException(
        await this.i18n.translate(
          'inventory-request.errors.receipt_not_found',
          { lang },
        ),
      );
    }

    return receipt as unknown as IInboundRequest;
  }

  /**
   * Lấy chi tiết phiếu xuất theo quyền kho của warehouse manager
   */
  async getOutboundById(
    exportId: string,
    warehouseIds: string[],
    lang: string,
  ): Promise<IOutboundRequest> {
    const exportRecord = await this.prisma.export.findFirst({
      where: {
        id: exportId,
        warehouse_id: { in: warehouseIds },
        is_deleted: false,
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true, code: true } },
        details: {
          where: { is_deleted: false },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                image_url: true,
              },
            },
            batch: { select: { id: true, code: true, expiry_date: true } },
            unit: { select: { id: true, name: true } },
          },
          orderBy: { created_at: 'asc' },
        },
        pick_lists: {
          where: { is_deleted: false },
          include: {
            details: {
              where: { is_deleted: false },
              orderBy: { created_at: 'asc' },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!exportRecord) {
      throw new NotFoundException(
        await this.i18n.translate('inventory-request.errors.export_not_found', {
          lang,
        }),
      );
    }

    for (const detail of exportRecord.details) {
      const aggregate = await this.prisma.inventory.aggregate({
        where: {
          organization_id: exportRecord.organization_id,
          warehouse_id: exportRecord.warehouse_id,
          product_id: detail.product_id,
          ...(detail.required_batch_id && {
            batch_id: detail.required_batch_id,
          }),
          is_deleted: false,
        },
        _sum: { quantity_available: true },
      });

      const availableQty = aggregate._sum.quantity_available?.toNumber() ?? 0;
      (detail as any).quantity_available = availableQty;
      if ((detail as any).product) {
        (detail as any).product.quantity_available = availableQty;
      }
    }

    return exportRecord as unknown as IOutboundRequest;
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
        await this.i18n.translate(
          'inventory-request.errors.receipt_not_found',
          { lang },
        ),
      );
    }

    if (receipt.status !== ReceiptStatus.PENDING) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.already_processed',
          { lang },
        ),
      );
    }

    // Transaction: Chỉ approve (KHÔNG fill inventory - sẽ fill ở confirmPutaway)
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật actual_qty cho từng detail (nếu có)
      for (const detail of receipt.details) {
        const actualQtyObj = dto.actual_quantities?.find(
          (a) => a.detail_id === detail.id,
        );
        if (actualQtyObj) {
          await tx.receiptDetail.update({
            where: { id: detail.id },
            data: { actual_qty: actualQtyObj.actual_qty },
          });
        }
      }

      // 2. Cập nhật status receipt → APPROVED (chưa fill inventory)
      return tx.receipt.update({
        where: { id: receiptId },
        data: {
          status: ReceiptStatus.APPROVED,
          approved_by: actorId,
          approved_at: new Date(),
          updated_by: actorId,
        },
        include: {
          warehouse: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true, code: true } },
          details: {
            where: { is_deleted: false },
            include: {
              product: {
                select: { id: true, name: true, sku: true, image_url: true },
              },
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
    this.websocketGateway.emitToOrganization(
      receipt.organization_id,
      'inbound:approved',
      {
        receiptId: receipt.id,
        code: receipt.code,
        approvedBy: actorId,
        summary: {
          totalProducts: receipt.details.length,
        },
        timestamp: new Date().toISOString(),
      },
    );

    // Audit log
    this.auditLogService.logUpdate(
      receipt.organization_id,
      'Receipt',
      receipt.id,
      { status: ReceiptStatus.PENDING } as Record<string, unknown>,
      { status: ReceiptStatus.APPROVED } as Record<string, unknown>,
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
        await this.i18n.translate(
          'inventory-request.errors.receipt_not_found',
          { lang },
        ),
      );
    }

    if (receipt.status !== ReceiptStatus.PENDING) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.already_processed',
          { lang },
        ),
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

    // Emit realtime event (new semantic event for cancelled state)
    this.websocketGateway.emitToOrganization(
      receipt.organization_id,
      'inbound:cancelled',
      {
        receiptId: receipt.id,
        code: receipt.code,
        cancelledBy: actorId,
        reason: dto.reason,
        timestamp: new Date().toISOString(),
      },
    );

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
        await this.i18n.translate('inventory-request.errors.export_not_found', {
          lang,
        }),
      );
    }

    if (exportRecord.status !== ExportStatus.PENDING) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.already_processed',
          { lang },
        ),
      );
    }

    const pickingStrategy = dto.picking_strategy || PickingStrategy.FEFO;

    // Transaction: Reserve inventory + tạo ExportPickList
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Reserve inventory (tăng allocated, giảm available, KHÔNG trừ quantity/on_hand)
      const pickListDetails: {
        export_detail_id: string;
        product_id: string;
        batch_id: string | null;
        block_id: string;
        required_qty: number;
      }[] = [];

      for (const detail of exportRecord.details) {
        const quantityToReserve =
          detail.quantity.toNumber() * detail.conversion_rate.toNumber();

        const inventories = await tx.inventory.findMany({
          where: {
            organization_id: exportRecord.organization_id,
            warehouse_id: exportRecord.warehouse_id,
            product_id: detail.product_id,
            ...(detail.required_batch_id && {
              batch_id: detail.required_batch_id,
            }),
            quantity_available: { gt: 0 },
            is_deleted: false,
          },
          include: { batch: true },
          orderBy:
            pickingStrategy === PickingStrategy.FEFO
              ? [{ batch: { expiry_date: 'asc' } }, { created_at: 'asc' }]
              : [{ created_at: 'asc' }],
        });

        let remaining = quantityToReserve;
        for (const inv of inventories) {
          if (remaining <= 0) break;
          const available = inv.quantity_available.toNumber();
          const reserveQty = Math.min(remaining, available);

          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              quantity_allocated: { increment: reserveQty },
              quantity_available: { decrement: reserveQty },
              updated_by: actorId,
            },
          });

          pickListDetails.push({
            export_detail_id: detail.id,
            product_id: detail.product_id,
            batch_id: inv.batch_id,
            block_id: inv.block_id,
            required_qty: reserveQty,
          });

          remaining -= reserveQty;
        }

        if (remaining > 0) {
          throw new BadRequestException(
            await this.i18n.translate(
              'inventory-request.errors.insufficient_stock',
              { lang },
            ),
          );
        }
      }

      // 2. Tạo ExportPickList
      const pickListCode = `PL-${exportRecord.code}`;
      await tx.exportPickList.create({
        data: {
          export_id: exportId,
          organization_id: exportRecord.organization_id,
          warehouse_id: exportRecord.warehouse_id,
          code: pickListCode,
          status: 'PENDING',
          notes: dto.notes || null,
          created_by: actorId,
          details: {
            create: pickListDetails.map((d) => ({
              export_detail_id: d.export_detail_id,
              product_id: d.product_id,
              batch_id: d.batch_id,
              block_id: d.block_id,
              required_qty: d.required_qty,
              picked_qty: 0,
              created_by: actorId,
            })),
          },
        },
      });

      // 3. Cập nhật status → PICKING
      return tx.export.update({
        where: { id: exportId },
        data: {
          status: ExportStatus.PICKING,
          approved_by: actorId,
          approved_at: new Date(),
          updated_by: actorId,
        },
        include: {
          warehouse: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true, code: true } },
          details: {
            where: { is_deleted: false },
            include: {
              product: {
                select: { id: true, name: true, sku: true, image_url: true },
              },
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
    this.websocketGateway.emitToOrganization(
      exportRecord.organization_id,
      'outbound:approved',
      {
        exportId: exportRecord.id,
        code: exportRecord.code,
        approvedBy: actorId,
        pickingStrategy,
        timestamp: new Date().toISOString(),
      },
    );

    return result as unknown as IOutboundRequest;
  }

  /**
   * Tách phiếu xuất PENDING thành 2 phiếu:
   * - Phiếu hiện tại: giữ các dòng đủ tồn
   * - Phiếu mới: chứa các dòng thiếu tồn
   */
  async splitOutbound(
    exportId: string,
    warehouseIds: string[],
    actorId: string,
    lang: string,
  ): Promise<{
    original_export_id: string;
    split_export_id: string;
    original_export_code: string;
    split_export_code: string;
    moved_detail_count: number;
    kept_detail_count: number;
  }> {
    const exportRecord = await this.prisma.export.findFirst({
      where: {
        id: exportId,
        warehouse_id: { in: warehouseIds },
        is_deleted: false,
      },
      include: {
        details: {
          where: { is_deleted: false },
        },
      },
    });

    if (!exportRecord) {
      throw new NotFoundException(
        await this.i18n.translate('inventory-request.errors.export_not_found', {
          lang,
        }),
      );
    }

    if (exportRecord.status !== ExportStatus.PENDING) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.invalid_status_transition',
          { lang },
        ),
      );
    }

    if (!exportRecord.details.length) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.invalid_status_transition',
          { lang },
        ),
      );
    }

    const sufficientDetailIds: string[] = [];
    const insufficientDetails = [] as typeof exportRecord.details;

    for (const detail of exportRecord.details) {
      const requiredQty =
        detail.quantity.toNumber() * detail.conversion_rate.toNumber();

      const aggregate = await this.prisma.inventory.aggregate({
        where: {
          organization_id: exportRecord.organization_id,
          warehouse_id: exportRecord.warehouse_id,
          product_id: detail.product_id,
          ...(detail.required_batch_id && {
            batch_id: detail.required_batch_id,
          }),
          is_deleted: false,
        },
        _sum: { quantity_available: true },
      });

      const availableQty = aggregate._sum.quantity_available?.toNumber() ?? 0;
      if (availableQty >= requiredQty) {
        sufficientDetailIds.push(detail.id);
      } else {
        insufficientDetails.push(detail);
      }
    }

    if (insufficientDetails.length === 0) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.split_not_required',
          { lang },
        ),
      );
    }

    if (sufficientDetailIds.length === 0) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.split_no_sufficient_detail',
          { lang },
        ),
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const splitCode = `${exportRecord.code}-S${Date.now().toString().slice(-6)}`;

      const splitExport = await tx.export.create({
        data: {
          organization_id: exportRecord.organization_id,
          warehouse_id: exportRecord.warehouse_id,
          partner_id: exportRecord.partner_id,
          code: splitCode,
          sales_order_code: exportRecord.sales_order_code,
          status: ExportStatus.PENDING,
          notes: exportRecord.notes,
          created_by: actorId,
        },
      });

      await tx.exportDetail.createMany({
        data: insufficientDetails.map((detail) => ({
          export_id: splitExport.id,
          product_id: detail.product_id,
          required_batch_id: detail.required_batch_id,
          quantity: detail.quantity,
          unit_id: detail.unit_id,
          conversion_rate: detail.conversion_rate,
          created_by: actorId,
        })),
      });

      await tx.exportDetail.updateMany({
        where: {
          export_id: exportRecord.id,
          id: { in: insufficientDetails.map((d) => d.id) },
          is_deleted: false,
        },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: actorId,
          updated_by: actorId,
        },
      });

      await tx.export.update({
        where: { id: exportRecord.id },
        data: { updated_by: actorId },
      });

      return {
        original_export_id: exportRecord.id,
        split_export_id: splitExport.id,
        original_export_code: exportRecord.code,
        split_export_code: splitExport.code,
        moved_detail_count: insufficientDetails.length,
        kept_detail_count: sufficientDetailIds.length,
      };
    });

    await Promise.all([
      this.redisService.delByPattern(`${this.OUTBOUND_KEY_PREFIX}:*`),
      this.redisService.del(`${this.OUTBOUND_KEY_PREFIX}:detail:${exportId}`),
    ]);

    this.websocketGateway.emitToOrganization(
      exportRecord.organization_id,
      'outbound:split',
      {
        exportId: exportRecord.id,
        code: exportRecord.code,
        splitExportId: result.split_export_id,
        splitExportCode: result.split_export_code,
        movedDetailCount: result.moved_detail_count,
        performedBy: actorId,
        timestamp: new Date().toISOString(),
      },
    );

    return result;
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
        await this.i18n.translate('inventory-request.errors.export_not_found', {
          lang,
        }),
      );
    }

    if (exportRecord.status !== ExportStatus.PENDING) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.already_processed',
          { lang },
        ),
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
    this.websocketGateway.emitToOrganization(
      exportRecord.organization_id,
      'outbound:rejected',
      {
        exportId: exportRecord.id,
        code: exportRecord.code,
        rejectedBy: actorId,
        reason: dto.reason,
        timestamp: new Date().toISOString(),
      },
    );

    return result as unknown as IOutboundRequest;
  }

  // ==================== INBOUND WORKFLOW STEPS ====================

  /**
   * Bắt đầu kiểm đếm: APPROVED → RECEIVING
   */
  async startReceiving(
    receiptId: string,
    warehouseIds: string[],
    dto: StartReceivingDto,
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
        await this.i18n.translate(
          'inventory-request.errors.receipt_not_found',
          { lang },
        ),
      );
    }

    if (receipt.status !== ReceiptStatus.APPROVED) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.receipt_not_approved',
          { lang },
        ),
      );
    }

    const result = await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        status: ReceiptStatus.RECEIVING,
        checker_id: dto.checker_id || null,
        receiving_started_at: new Date(),
        updated_by: actorId,
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true, code: true } },
        details: {
          where: { is_deleted: false },
          include: {
            product: {
              select: { id: true, name: true, sku: true, image_url: true },
            },
            batch: { select: { id: true, code: true, expiry_date: true } },
            unit: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Invalidate cache
    await this.redisService.delByPattern(`${this.INBOUND_KEY_PREFIX}:*`);

    // Emit realtime event
    this.websocketGateway.emitToOrganization(
      receipt.organization_id,
      'inbound:receiving-started',
      {
        receiptId: receipt.id,
        code: receipt.code,
        startedBy: actorId,
        timestamp: new Date().toISOString(),
      },
    );

    return result as unknown as IInboundRequest;
  }

  /**
   * Xác nhận kiểm đếm: RECEIVING → PROCESSING
   */
  async confirmReceiving(
    receiptId: string,
    warehouseIds: string[],
    dto: ConfirmReceivingDto,
    actorId: string,
    lang: string,
  ): Promise<IInboundRequest> {
    const receipt = await this.prisma.receipt.findFirst({
      where: {
        id: receiptId,
        warehouse_id: { in: warehouseIds },
        is_deleted: false,
      },
      include: {
        details: { where: { is_deleted: false } },
      },
    });

    if (!receipt) {
      throw new NotFoundException(
        await this.i18n.translate(
          'inventory-request.errors.receipt_not_found',
          { lang },
        ),
      );
    }

    if (receipt.status !== ReceiptStatus.RECEIVING) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.invalid_status_transition',
          { lang },
        ),
      );
    }

    let hasMismatch = false;
    for (const item of dto.details) {
      const existingDetail = receipt.details.find(
        (d) => d.id === item.detail_id,
      );
      if (
        existingDetail &&
        Number(existingDetail.expected_qty) !== item.actual_qty
      ) {
        hasMismatch = true;
        break;
      }
    }

    if (hasMismatch && dto.is_customer_agreed === undefined) {
      throw new BadRequestException({
        message: lang === 'vi'
          ? 'Số lượng thực tế khác với dự kiến. Vui lòng xác nhận khách hàng có đồng ý hay không (is_customer_agreed).'
          : 'Actual quantity differs from expected. Please confirm customer agreement (is_customer_agreed).',
        require_customer_agreement: true,
        mismatches: dto.details
          .map(item => {
            const existingDetail = receipt.details.find(d => d.id === item.detail_id);
            if (!existingDetail) return null;
            const expected = Number(existingDetail.expected_qty);
            if (expected !== item.actual_qty) {
              return {
                detail_id: existingDetail.id,
                product_id: existingDetail.product_id,
                expected_qty: expected,
                actual_qty: item.actual_qty,
                diff: item.actual_qty - expected
              };
            }
            return null;
          })
          .filter(Boolean),
      });
    }

    const finalStatus =
      hasMismatch && dto.is_customer_agreed === false
        ? 'CANCELLED'
        : 'PROCESSING';
    const failReason =
      lang === 'vi'
        ? 'Báo nhập kho thất bại: Khách hàng không đồng ý sai lệch số lượng'
        : 'Inbound failed: Customer rejected quantity discrepancy';

    const result = await this.prisma.$transaction(async (tx) => {
      // Cập nhật actual_qty cho từng detail
      for (const item of dto.details) {
        await tx.receiptDetail.update({
          where: { id: item.detail_id },
          data: { actual_qty: item.actual_qty },
        });
      }

      return tx.receipt.update({
        where: { id: receiptId },
        data: {
          status: finalStatus as ReceiptStatus,
          receiving_completed_at:
            finalStatus === 'PROCESSING' ? new Date() : undefined,
          notes:
            finalStatus === 'CANCELLED'
              ? failReason
              : dto.notes || receipt.notes,
          updated_by: actorId,
        },
        include: {
          warehouse: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true, code: true } },
          details: {
            where: { is_deleted: false },
            include: {
              product: {
                select: { id: true, name: true, sku: true, image_url: true },
              },
              batch: { select: { id: true, code: true, expiry_date: true } },
              unit: { select: { id: true, name: true } },
            },
          },
        },
      });
    });

    // Invalidate cache
    await this.redisService.delByPattern(`${this.INBOUND_KEY_PREFIX}:*`);

    // Emit realtime event
    this.websocketGateway.emitToOrganization(
      receipt.organization_id,
      'inbound:receiving-confirmed',
      {
        receiptId: receipt.id,
        code: receipt.code,
        confirmedBy: actorId,
        timestamp: new Date().toISOString(),
      },
    );

    return result as unknown as IInboundRequest;
  }

  /**
   * Xác nhận cất hàng: PROCESSING → COMPLETED
   * GỌI fillInventory() ở đây (thay vì ở approveInbound)
   */
  async confirmPutaway(
    receiptId: string,
    warehouseIds: string[],
    dto: ConfirmPutawayDto,
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
        await this.i18n.translate(
          'inventory-request.errors.receipt_not_found',
          { lang },
        ),
      );
    }

    // Delegate to InventoryRequestService for standardized 3D-aware putaway logic
    return this.inventoryRequestService.confirmPutaway(
      receipt.organization_id,
      receiptId,
      actorId,
      lang,
    );
  }

  /**
   * Phân công nhân viên cho phiếu nhập (không đổi status)
   */
  async assignWorkers(
    receiptId: string,
    warehouseIds: string[],
    dto: AssignWorkersDto,
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
        await this.i18n.translate(
          'inventory-request.errors.receipt_not_found',
          { lang },
        ),
      );
    }

    const updateData: Record<string, any> = { updated_by: actorId };
    if (dto.checker_id !== undefined) updateData.checker_id = dto.checker_id;

    const result = await this.prisma.receipt.update({
      where: { id: receiptId },
      data: updateData,
      include: {
        warehouse: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true, code: true } },
        details: {
          where: { is_deleted: false },
          include: {
            product: {
              select: { id: true, name: true, sku: true, image_url: true },
            },
            batch: { select: { id: true, code: true, expiry_date: true } },
            unit: { select: { id: true, name: true } },
          },
        },
      },
    });

    return result as unknown as IInboundRequest;
  }

  // ==================== OUTBOUND WORKFLOW STEPS ====================

  /**
   * Xác nhận nhặt hàng: PICKING → CHECKING
   */
  async confirmPicking(
    exportId: string,
    warehouseIds: string[],
    dto: ConfirmPickingDto,
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
        pick_lists: {
          where: { is_deleted: false },
          include: { details: { where: { is_deleted: false } } },
        },
      },
    });

    if (!exportRecord) {
      throw new NotFoundException(
        await this.i18n.translate('inventory-request.errors.export_not_found', {
          lang,
        }),
      );
    }

    if (exportRecord.status !== ExportStatus.PICKING) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.invalid_status_transition',
          { lang },
        ),
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Cập nhật picked_qty cho từng pick list detail
      for (const item of dto.details) {
        await tx.exportPickListDetail.update({
          where: { id: item.pick_list_detail_id },
          data: { picked_qty: item.picked_qty },
        });
      }

      // Cập nhật pick list status
      for (const pickList of exportRecord.pick_lists) {
        await tx.exportPickList.update({
          where: { id: pickList.id },
          data: {
            status: PickListStatus.COMPLETED,
            completed_at: new Date(),
            updated_by: actorId,
          },
        });
      }

      return tx.export.update({
        where: { id: exportId },
        data: {
          status: ExportStatus.CHECKING,
          picking_completed_at: new Date(),
          updated_by: actorId,
        },
        include: {
          warehouse: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true, code: true } },
          details: {
            where: { is_deleted: false },
            include: {
              product: {
                select: { id: true, name: true, sku: true, image_url: true },
              },
              batch: { select: { id: true, code: true, expiry_date: true } },
              unit: { select: { id: true, name: true } },
            },
          },
        },
      });
    });

    // Invalidate cache
    await this.redisService.delByPattern(`${this.OUTBOUND_KEY_PREFIX}:*`);

    // Emit realtime event
    this.websocketGateway.emitToOrganization(
      exportRecord.organization_id,
      'outbound:picking-confirmed',
      {
        exportId: exportRecord.id,
        code: exportRecord.code,
        confirmedBy: actorId,
        timestamp: new Date().toISOString(),
      },
    );

    return result as unknown as IOutboundRequest;
  }

  /**
   * Xác nhận kiểm tra xuất: CHECKING → PACKED
   */
  async confirmChecking(
    exportId: string,
    warehouseIds: string[],
    dto: ConfirmCheckingDto,
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
        await this.i18n.translate('inventory-request.errors.export_not_found', {
          lang,
        }),
      );
    }

    if (exportRecord.status !== ExportStatus.CHECKING) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.invalid_status_transition',
          { lang },
        ),
      );
    }

    // Validate all items passed
    const allPassed = dto.details.every((d) => d.passed !== false);
    if (!allPassed) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.checking_not_passed',
          { lang },
        ),
      );
    }

    const result = await this.prisma.export.update({
      where: { id: exportId },
      data: {
        status: ExportStatus.PACKED,
        checking_completed_at: new Date(),
        updated_by: actorId,
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true, code: true } },
        details: {
          where: { is_deleted: false },
          include: {
            product: {
              select: { id: true, name: true, sku: true, image_url: true },
            },
            batch: { select: { id: true, code: true, expiry_date: true } },
            unit: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Invalidate cache
    await this.redisService.delByPattern(`${this.OUTBOUND_KEY_PREFIX}:*`);

    // Emit realtime event
    this.websocketGateway.emitToOrganization(
      exportRecord.organization_id,
      'outbound:checking-confirmed',
      {
        exportId: exportRecord.id,
        code: exportRecord.code,
        confirmedBy: actorId,
        timestamp: new Date().toISOString(),
      },
    );

    return result as unknown as IOutboundRequest;
  }

  /**
   * Hoàn tất xuất kho: PACKED → SHIPPED
   * TRỪ INVENTORY THẬT ở đây (quantity, on_hand, allocated)
   */
  async completeShipment(
    exportId: string,
    warehouseIds: string[],
    dto: CompleteShipmentDto,
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
        pick_lists: {
          where: { is_deleted: false },
          include: {
            details: { where: { is_deleted: false } },
          },
        },
        warehouse: true,
      },
    });

    if (!exportRecord) {
      throw new NotFoundException(
        await this.i18n.translate('inventory-request.errors.export_not_found', {
          lang,
        }),
      );
    }

    if (exportRecord.status !== ExportStatus.PACKED) {
      throw new BadRequestException(
        await this.i18n.translate(
          'inventory-request.errors.invalid_status_transition',
          { lang },
        ),
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Trừ inventory thật dựa trên pick list details (đã reserve trước đó)
      for (const pickList of exportRecord.pick_lists) {
        for (const plDetail of pickList.details) {
          const pickedQty =
            plDetail.picked_qty.toNumber() || plDetail.required_qty.toNumber();

          if (pickedQty > 0) {
            // Tìm inventory record đã reserve
            const inv = await tx.inventory.findFirst({
              where: {
                organization_id: exportRecord.organization_id,
                warehouse_id: exportRecord.warehouse_id,
                block_id: plDetail.block_id,
                product_id: plDetail.product_id,
                batch_id: plDetail.batch_id,
                is_deleted: false,
              },
            });

            if (inv) {
              const updatedInv = await tx.inventory.update({
                where: { id: inv.id },
                data: {
                  quantity: { decrement: pickedQty },
                  quantity_on_hand: { decrement: pickedQty },
                  quantity_allocated: { decrement: pickedQty },
                  updated_by: actorId,
                },
              });

              // Giải phóng bin nếu tồn kho về 0
              if (updatedInv.quantity.toNumber() <= 0 && updatedInv.bin_id) {
                await tx.bin.update({
                  where: { id: updatedInv.bin_id },
                  data: { status: 'Available' },
                });
              }

              // Tạo transaction log
              await tx.inventoryTransaction.create({
                data: {
                  organization_id: exportRecord.organization_id,
                  warehouse_id: exportRecord.warehouse_id,
                  product_id: plDetail.product_id,
                  batch_id: plDetail.batch_id,
                  from_block_id: plDetail.block_id,
                  type: TransactionType.OUTBOUND,
                  quantity: pickedQty,
                  reference_code: exportRecord.code,
                  created_by: actorId,
                },
              });
            }
          }
        }
      }

      return tx.export.update({
        where: { id: exportId },
        data: {
          status: ExportStatus.SHIPPED,
          shipped_at: new Date(),
          tracking_number: dto.tracking_number || null,
          updated_by: actorId,
        },
        include: {
          warehouse: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true, code: true } },
          details: {
            where: { is_deleted: false },
            include: {
              product: {
                select: { id: true, name: true, sku: true, image_url: true },
              },
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
    this.websocketGateway.emitToOrganization(
      exportRecord.organization_id,
      'outbound:shipment-completed',
      {
        exportId: exportRecord.id,
        code: exportRecord.code,
        completedBy: actorId,
        trackingNumber: dto.tracking_number,
        timestamp: new Date().toISOString(),
      },
    );

    // Audit log
    this.auditLogService.logUpdate(
      exportRecord.organization_id,
      'Export',
      exportRecord.id,
      { status: ExportStatus.PACKED } as Record<string, unknown>,
      { status: ExportStatus.SHIPPED } as Record<string, unknown>,
      {
        userId: actorId,
        description: `Shipment completed: ${exportRecord.code}`,
      },
    );

    return result as unknown as IOutboundRequest;
  }
}
