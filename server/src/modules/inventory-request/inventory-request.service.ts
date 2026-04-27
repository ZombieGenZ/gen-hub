import {
  Injectable,
  NotFoundException,
  ConflictException,
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
  PutawayStatus,
} from '@prisma/client';
import { InventoryRequestRepository } from './inventory-request.repository';
import {
  CreateInboundRequestDto,
  CreateOutboundRequestDto,
  QueryInboundRequestDto,
  QueryOutboundRequestDto,
  StartReceivingDto,
  ConfirmReceivingDto,
  ConfirmPutawayDto,
  ConfirmPickingDto,
  ConfirmCheckingDto,
  CompleteShipmentDto,
  QueryTransactionDto,
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

import { ExcelService } from '../../common/services/excel.service';

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

    private readonly excelService: ExcelService,
  ) {
    this.INBOUND_LIST_TTL =
      this.configService.get<number>('REDIS_INBOUND_LIST_TTL') || 60;
    this.OUTBOUND_LIST_TTL =
      this.configService.get<number>('REDIS_OUTBOUND_LIST_TTL') || 60;
    this.INBOUND_DETAIL_TTL =
      this.configService.get<number>('REDIS_INBOUND_DETAIL_TTL') || 120;
    this.OUTBOUND_DETAIL_TTL =
      this.configService.get<number>('REDIS_OUTBOUND_DETAIL_TTL') || 120;
  }

  private getInboundListCacheKey(
    orgId: string,
    query: QueryInboundRequestDto,
  ): string {
    const sortedParams = Object.keys(query)
      .sort()
      .filter((key) => query[key as keyof QueryInboundRequestDto] !== undefined)
      .map((key) => `${key}=${query[key as keyof QueryInboundRequestDto]}`)
      .join('&');
    return this.cacheKeys.inboundList(orgId, sortedParams);
  }

  private getOutboundListCacheKey(
    orgId: string,
    query: QueryOutboundRequestDto,
  ): string {
    const sortedParams = Object.keys(query)
      .sort()
      .filter(
        (key) => query[key as keyof QueryOutboundRequestDto] !== undefined,
      )
      .map((key) => `${key}=${query[key as keyof QueryOutboundRequestDto]}`)
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
   * Lấy danh sách tồn kho thực tế (có phân trang)
   */
  async listInventoryStock(
    orgId: string,
    warehouseId?: string,
    keywords?: string,
    limit = 20,
    offset = 0,
  ): Promise<{ items: ReturnType<typeof this._mapStockItem>[]; total: number }> {
    const where = {
      organization_id: orgId,
      is_deleted: false,
      quantity: { gt: 0 },
      ...(warehouseId && { warehouse_id: warehouseId }),
      ...(keywords && {
        product: {
          OR: [
            { name: { contains: keywords, mode: 'insensitive' as const } },
            { sku: { contains: keywords, mode: 'insensitive' as const } },
          ],
        },
      }),
    };

    const include = {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          image_url: true,
          weight: true,
          length: true,
          width: true,
          height: true,
        },
      },
      batch: { select: { id: true, code: true, expiry_date: true } },
      block: {
        select: {
          id: true,
          code: true,
          shelf: {
            select: {
              id: true,
              code: true,
              rack: {
                select: {
                  id: true,
                  code: true,
                  row: { select: { id: true, code: true, name: true } },
                },
              },
            },
          },
        },
      },
      warehouse: { select: { id: true, name: true } },
    };

    const [rawItems, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include,
        orderBy: [{ product: { name: 'asc' } }, { created_at: 'asc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return {
      items: rawItems.map((inv) => this._mapStockItem(inv)),
      total,
    };
  }

  private _mapStockItem(inv: {
    id: string;
    quantity: { toNumber: () => number };
    quantity_on_hand: { toNumber: () => number };
    quantity_allocated: { toNumber: () => number };
    quantity_available: { toNumber: () => number };
    created_at: Date;
    product: {
      id: string;
      name: string;
      sku: string;
      image_url?: string | null;
      weight?: { toNumber: () => number } | null;
      length?: { toNumber: () => number } | null;
      width?: { toNumber: () => number } | null;
      height?: { toNumber: () => number } | null;
    };
    batch?: { id: string; code: string; expiry_date?: Date | null } | null;
    block: {
      id: string;
      code: string;
      shelf?: {
        id: string;
        code: string;
        rack?: {
          id: string;
          code: string;
          row?: { id: string; code: string; name: string } | null;
        } | null;
      } | null;
    };
    warehouse: { id: string; name: string };
  }) {
    return {
      id: inv.id,
      product_id: inv.product.id,
      product_name: inv.product.name,
      sku: inv.product.sku,
      image_url: inv.product.image_url,
      product_weight: inv.product.weight ? Number(inv.product.weight) : 0,
      product_length: inv.product.length ? Number(inv.product.length) : 0,
      product_width: inv.product.width ? Number(inv.product.width) : 0,
      product_height: inv.product.height ? Number(inv.product.height) : 0,
      batch_code: inv.batch?.code || null,
      expiry_date: inv.batch?.expiry_date?.toISOString() || null,
      quantity: inv.quantity.toNumber(),
      quantity_on_hand: inv.quantity_on_hand.toNumber(),
      quantity_allocated: inv.quantity_allocated.toNumber(),
      quantity_available: inv.quantity_available.toNumber(),
      warehouse_id: inv.warehouse.id,
      warehouse_name: inv.warehouse.name,
      block_id: inv.block.id,
      location: [
        inv.block.shelf?.rack?.row?.name || inv.block.shelf?.rack?.row?.code,
        inv.block.shelf?.rack?.code,
        inv.block.shelf?.code,
        inv.block.code,
      ]
        .filter(Boolean)
        .join(' > '),
      row_code: inv.block.shelf?.rack?.row?.code || '',
      rack_code: inv.block.shelf?.rack?.code || '',
      days_in_storage: Math.floor(
        (Date.now() - new Date(inv.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
      created_at: inv.created_at.toISOString(),
    };
  }

  /**
   * Lấy danh sách kho mà tổ chức có quyền sử dụng.
   * Nếu không có kho nào, thử backfill từ hợp đồng ACTIVE (lazy activation).
   */
  async listOrgWarehouses(
    orgId: string,
  ): Promise<{ id: string; name: string }[]> {
    let warehouses = await this.repository.listOrgWarehouses(orgId);

    if (warehouses.length === 0) {
      // Lazy backfill: tạo Warehouse cho các hợp đồng ACTIVE chưa được generate
      const activeStatuses = [
        'ACTIVE',
        'OVERDUE_LEVEL_1',
        'OVERDUE_LEVEL_2',
        'OVERDUE_LEVEL_3',
      ];
      const details = await this.prisma.rentalContractDetail.findMany({
        where: {
          is_deleted: false,
          warehouse_id: null,
          rental_contract: {
            organization_id: orgId,
            is_deleted: false,
            status: { in: activeStatuses as any },
          },
        },
        include: {
          detail_rows: true,
          warehouse_template: {
            include: {
              rows: {
                where: { is_deleted: false },
                include: {
                  racks: {
                    where: { is_deleted: false },
                    include: {
                      shelves: {
                        where: { is_deleted: false },
                        include: {
                          blocks: {
                            where: { is_deleted: false },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      for (const detail of details) {
        const template = detail.warehouse_template;
        if (!template) continue;

        try {
          await this.prisma.$transaction(async (tx) => {
            const warehouse = await tx.warehouse.create({
              data: {
                name: detail.warehouse_name || template.name,
                description:
                  detail.warehouse_description || template.description || null,
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

            // Deep clone rows, racks, shelves, and blocks
            for (const rowTpl of template.rows) {
              if (!detail.is_whole_warehouse && detail.detail_rows) {
                const rentedRowIds = detail.detail_rows.map(
                  (dr) => dr.row_template_id,
                );
                if (!rentedRowIds.includes(rowTpl.id)) {
                  continue; // Skip cloning this row!
                }
              }

              const row = await tx.row.create({
                data: {
                  warehouse_id: warehouse.id,
                  name: rowTpl.name,
                  code: rowTpl.code,
                  description: rowTpl.description,
                  is_rented: rowTpl.is_rented,
                  position_x: rowTpl.position_x,
                  position_y: rowTpl.position_y,
                  position_rotation: rowTpl.position_rotation,
                  total_weight_capacity: rowTpl.total_weight_capacity,
                  row_template_id: rowTpl.id,
                  is_active: true,
                  is_deleted: false,
                  created_by: 'SYSTEM_BACKFILL',
                },
              });

              for (const rackTpl of rowTpl.racks) {
                const rack = await tx.rack.create({
                  data: {
                    row_id: row.id,
                    name: rackTpl.name,
                    code: rackTpl.code,
                    description: rackTpl.description,
                    position_x: rackTpl.position_x,
                    position_y: rackTpl.position_y,
                    position_rotation: rackTpl.position_rotation,
                    dimensions_width: rackTpl.dimensions_width,
                    dimensions_depth: rackTpl.dimensions_depth,
                    dimensions_height: rackTpl.dimensions_height,
                    default_block_max_weight_capacity:
                      rackTpl.default_block_max_weight_capacity,
                    total_weight_capacity: rackTpl.total_weight_capacity,
                    total_height: rackTpl.total_height,
                    overload_threshold_percent:
                      rackTpl.overload_threshold_percent,
                    is_rented: false,
                    is_active: true,
                    is_deleted: false,
                    created_by: 'SYSTEM_BACKFILL',
                  },
                });

                for (const shelfTpl of rackTpl.shelves) {
                  const shelf = await tx.shelf.create({
                    data: {
                      rack_id: rack.id,
                      name: shelfTpl.name,
                      code: shelfTpl.code,
                      description: shelfTpl.description,
                      height: shelfTpl.height,
                      total_weight_capacity: shelfTpl.total_weight_capacity,
                      is_active: true,
                      is_deleted: false,
                      created_by: 'SYSTEM_BACKFILL',
                    },
                  });

                  for (const blockTpl of shelfTpl.blocks) {
                    const block = await tx.block.create({
                      data: {
                        shelf_id: shelf.id,
                        name: blockTpl.name,
                        code: blockTpl.code,
                        description: blockTpl.description,
                        position_x: blockTpl.position_x,
                        position_y: blockTpl.position_y,
                        dimensions_width: blockTpl.dimensions_width,
                        dimensions_height: blockTpl.dimensions_height,
                        max_weight_capacity: blockTpl.max_weight_capacity,
                        height: blockTpl.height,
                        is_active: true,
                        is_deleted: false,
                        created_by: 'SYSTEM_BACKFILL',
                      },
                    });

                    // Tạo Bin tương ứng để phục vụ AI Slotting
                    await (tx as any).bin.create({
                      data: {
                        uid: `BIN-${warehouse.id.substring(0, 8)}-${block.code}`,
                        warehouse_id: warehouse.id,
                        zone_type: 'PICKING',
                        status: 'Available',
                        position_xyz: {
                          x:
                            Number(row.position_x || 0) +
                            Number(rack.position_x || 0) +
                            Number(block.position_x || 0),
                          y: Number(shelf.height || 0),
                          z:
                            Number(row.position_y || 0) +
                            Number(rack.position_y || 0) +
                            Number(block.position_y || 0),
                        },
                        dimensions: {
                          w: Number(block.dimensions_width || 1),
                          h: Number(block.dimensions_height || 1),
                          d: Number(rack.dimensions_depth || 1),
                        },
                      },
                    });
                  }
                }
              }
            }

            await tx.rentalContractDetail.update({
              where: { id: detail.id },
              data: { warehouse_id: warehouse.id },
            });
          });
        } catch (error: any) {
          console.error('[Lazy Backfill Error]', error.message);
        }
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
    // Validate warehouse thuộc org và hợp đồng còn hiệu lực
    const [warehouseValid, hasActiveContract] = await Promise.all([
      this.repository.warehouseExistsInOrg(dto.warehouse_id, orgId),
      this.repository.warehouseHasActiveContract(dto.warehouse_id, orgId),
    ]);

    if (!warehouseValid) {
      throw new NotFoundException(
        await this.i18n.translate(
          'inventory-request.errors.warehouse_not_rented',
          { lang },
        ),
      );
    }

    if (!hasActiveContract) {
      throw new BadRequestException(
        lang === 'vi'
          ? 'Kho này chưa có hợp đồng thuê đang hoạt động. Vui lòng kiểm tra lại hợp đồng.'
          : 'This warehouse does not have an active rental contract.',
      );
    }

    // Validate partner nếu có
    if (dto.partner_id) {
      const partnerValid = await this.repository.partnerExistsInOrg(
        dto.partner_id,
        orgId,
      );
      if (!partnerValid) {
        throw new NotFoundException(
          await this.i18n.translate(
            'inventory-request.errors.partner_not_found',
            { lang },
          ),
        );
      }
    }

    // Validate products, units, batches theo lô để tránh N+1 query
    const uniqueProductIds = Array.from(
      new Set(dto.details.map((detail) => detail.product_id)),
    );
    const uniqueUnitIds = Array.from(
      new Set(dto.details.map((detail) => detail.unit_id)),
    );
    const detailBatchPairs = dto.details
      .filter((detail) => !!detail.batch_id)
      .map((detail) => `${detail.product_id}:${detail.batch_id as string}`);
    const uniqueBatchPairs = Array.from(new Set(detailBatchPairs));
    const batchIds = Array.from(
      new Set(
        dto.details
          .map((detail) => detail.batch_id)
          .filter(Boolean) as string[],
      ),
    );

    const [products, units, batches, productUnits] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          organization_id: orgId,
          is_deleted: false,
          id: { in: uniqueProductIds },
        },
        select: { id: true },
      }),
      this.prisma.unit.findMany({
        where: {
          organization_id: orgId,
          is_deleted: false,
          is_active: true,
          id: { in: uniqueUnitIds },
        },
        select: { id: true },
      }),
      batchIds.length > 0
        ? this.prisma.batch.findMany({
            where: {
              id: { in: batchIds },
              product_id: { in: uniqueProductIds },
              is_deleted: false,
            },
            select: { id: true, product_id: true },
          })
        : Promise.resolve([]),
      this.prisma.productUnit.findMany({
        where: {
          is_deleted: false,
          product_id: { in: uniqueProductIds },
          unit_id: { in: uniqueUnitIds },
        },
        select: { product_id: true, unit_id: true, conversion_rate: true },
      }),
    ]);

    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException(
        await this.i18n.translate(
          'inventory-request.errors.product_not_found',
          { lang },
        ),
      );
    }

    if (units.length !== uniqueUnitIds.length) {
      throw new NotFoundException(
        await this.i18n.translate('inventory-request.errors.unit_not_found', {
          lang,
        }),
      );
    }

    if (uniqueBatchPairs.length > 0) {
      const batchPairSet = new Set(
        batches.map((batch) => `${batch.product_id}:${batch.id}`),
      );
      const hasInvalidBatch = uniqueBatchPairs.some(
        (pair) => !batchPairSet.has(pair),
      );
      if (hasInvalidBatch) {
        throw new NotFoundException(
          await this.i18n.translate(
            'inventory-request.errors.batch_not_found',
            { lang },
          ),
        );
      }
    }

    const conversionRateByPair = new Map(
      productUnits.map((item) => [
        `${item.product_id}:${item.unit_id}`,
        item.conversion_rate?.toNumber() ?? 1,
      ]),
    );

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
          ...(dto.partner_id && {
            partner: { connect: { id: dto.partner_id } },
          }),
          created_by: actorId,
        },
      });

      // Tạo chi tiết với batch mới nếu cần
      const receiptDetailsData: Prisma.ReceiptDetailCreateManyInput[] = [];
      for (const detail of dto.details) {
        let batchId = detail.batch_id;

        // Tạo batch mới nếu không có batch_id nhưng có thông tin batch
        if (!batchId && detail.batch_code) {
          const newBatch = await tx.batch.create({
            data: {
              code: detail.batch_code,
              manufacturing_date: detail.manufacturing_date
                ? new Date(detail.manufacturing_date)
                : null,
              expiry_date: detail.expiry_date
                ? new Date(detail.expiry_date)
                : null,
              import_price: detail.import_price ?? 0,
              product: { connect: { id: detail.product_id } },
              created_by: actorId,
            },
          });
          batchId = newBatch.id;
        }

        receiptDetailsData.push({
          receipt_id: createdReceipt.id,
          product_id: detail.product_id,
          batch_id: batchId ?? null,
          unit_id: detail.unit_id,
          expected_qty: detail.expected_qty,
          actual_qty: 0,
          conversion_rate:
            conversionRateByPair.get(
              `${detail.product_id}:${detail.unit_id}`,
            ) ?? 1,
          created_by: actorId,
        });
      }

      await tx.receiptDetail.createMany({ data: receiptDetailsData });

      return createdReceipt;
    });

    // Lấy full receipt với relations
    const fullReceipt = await this.repository.findInboundById(
      receipt.id,
      orgId,
    );

    // Invalidate cache
    // Invalidate cache
    await this.redisService.delByPattern(
      this.cacheKeys.inboundList(orgId, '*'),
    );

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
      {
        userId: actorId,
        description: `Created inbound request: ${receipt.code}`,
      },
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
    void lang;
    const cacheKey = this.getInboundListCacheKey(orgId, query);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as IPaginatedResponse<IInboundRequest>;
    }

    const result = await this.repository.findInboundByOrgId(orgId, query);

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.INBOUND_LIST_TTL,
    );

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
        await this.i18n.translate(
          'inventory-request.errors.receipt_not_found',
          { lang },
        ),
      );
    }

    await this.redisService.set(
      cacheKey,
      JSON.stringify(receipt),
      this.INBOUND_DETAIL_TTL,
    );

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
    // Validate warehouse thuộc org và hợp đồng còn hiệu lực
    const [warehouseValid, hasActiveContract] = await Promise.all([
      this.repository.warehouseExistsInOrg(dto.warehouse_id, orgId),
      this.repository.warehouseHasActiveContract(dto.warehouse_id, orgId),
    ]);

    if (!warehouseValid) {
      throw new NotFoundException(
        await this.i18n.translate(
          'inventory-request.errors.warehouse_not_rented',
          { lang },
        ),
      );
    }

    if (!hasActiveContract) {
      throw new BadRequestException(
        lang === 'vi'
          ? 'Kho này chưa có hợp đồng thuê đang hoạt động. Vui lòng kiểm tra lại hợp đồng.'
          : 'This warehouse does not have an active rental contract.',
      );
    }

    // Validate partner nếu có
    if (dto.partner_id) {
      const partnerValid = await this.repository.partnerExistsInOrg(
        dto.partner_id,
        orgId,
      );
      if (!partnerValid) {
        throw new NotFoundException(
          await this.i18n.translate(
            'inventory-request.errors.partner_not_found',
            { lang },
          ),
        );
      }
    }

    // Validate products và units
    const requiredBySpecificBatch = new Map<string, number>();
    const requiredByGeneralProduct = new Map<string, number>();
    const requiredSpecificByProduct = new Map<string, number>();

    const uniqueProductIds = Array.from(
      new Set(dto.details.map((detail) => detail.product_id)),
    );
    const uniqueUnitIds = Array.from(
      new Set(dto.details.map((detail) => detail.unit_id)),
    );
    const uniqueRequiredBatchPairs = Array.from(
      new Set(
        dto.details
          .filter((detail) => !!detail.required_batch_id)
          .map(
            (detail) =>
              `${detail.product_id}:${detail.required_batch_id as string}`,
          ),
      ),
    );
    const requiredBatchIds = Array.from(
      new Set(
        dto.details
          .map((detail) => detail.required_batch_id)
          .filter(Boolean) as string[],
      ),
    );

    const [products, units, requiredBatches, productUnits] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          organization_id: orgId,
          is_deleted: false,
          id: { in: uniqueProductIds },
        },
        select: { id: true },
      }),
      this.prisma.unit.findMany({
        where: {
          organization_id: orgId,
          is_deleted: false,
          is_active: true,
          id: { in: uniqueUnitIds },
        },
        select: { id: true },
      }),
      requiredBatchIds.length > 0
        ? this.prisma.batch.findMany({
            where: {
              id: { in: requiredBatchIds },
              product_id: { in: uniqueProductIds },
              is_deleted: false,
            },
            select: { id: true, product_id: true },
          })
        : Promise.resolve([]),
      this.prisma.productUnit.findMany({
        where: {
          is_deleted: false,
          product_id: { in: uniqueProductIds },
          unit_id: { in: uniqueUnitIds },
        },
        select: { product_id: true, unit_id: true, conversion_rate: true },
      }),
    ]);

    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException(
        await this.i18n.translate(
          'inventory-request.errors.product_not_found',
          { lang },
        ),
      );
    }

    if (units.length !== uniqueUnitIds.length) {
      throw new NotFoundException(
        await this.i18n.translate('inventory-request.errors.unit_not_found', {
          lang,
        }),
      );
    }

    if (uniqueRequiredBatchPairs.length > 0) {
      const requiredBatchPairSet = new Set(
        requiredBatches.map((batch) => `${batch.product_id}:${batch.id}`),
      );
      const hasInvalidBatch = uniqueRequiredBatchPairs.some(
        (pair) => !requiredBatchPairSet.has(pair),
      );
      if (hasInvalidBatch) {
        throw new NotFoundException(
          await this.i18n.translate(
            'inventory-request.errors.batch_not_found',
            { lang },
          ),
        );
      }
    }

    const conversionRateByPair = new Map(
      productUnits.map((item) => [
        `${item.product_id}:${item.unit_id}`,
        item.conversion_rate?.toNumber() ?? 1,
      ]),
    );

    for (const detail of dto.details) {
      const quantityInBaseUnit =
        detail.quantity *
        (conversionRateByPair.get(`${detail.product_id}:${detail.unit_id}`) ??
          1);

      if (detail.required_batch_id) {
        const key = `${detail.product_id}:${detail.required_batch_id}`;
        requiredBySpecificBatch.set(
          key,
          (requiredBySpecificBatch.get(key) ?? 0) + quantityInBaseUnit,
        );
        requiredSpecificByProduct.set(
          detail.product_id,
          (requiredSpecificByProduct.get(detail.product_id) ?? 0) +
            quantityInBaseUnit,
        );
      } else {
        requiredByGeneralProduct.set(
          detail.product_id,
          (requiredByGeneralProduct.get(detail.product_id) ?? 0) +
            quantityInBaseUnit,
        );
      }
    }

    // Validate tồn kho: phần yêu cầu batch cụ thể + phần tổng quát theo product
    const specificBatchRows =
      requiredBySpecificBatch.size > 0
        ? await this.prisma.inventory.groupBy({
            by: ['product_id', 'batch_id'],
            where: {
              organization_id: orgId,
              warehouse_id: dto.warehouse_id,
              is_deleted: false,
              product_id: {
                in: Array.from(
                  new Set(
                    Array.from(requiredBySpecificBatch.keys()).map(
                      (key) => key.split(':')[0],
                    ),
                  ),
                ),
              },
              batch_id: {
                in: Array.from(
                  new Set(
                    Array.from(requiredBySpecificBatch.keys()).map(
                      (key) => key.split(':')[1],
                    ),
                  ),
                ),
              },
            },
            _sum: { quantity_available: true },
          })
        : [];

    const availableBySpecificBatch = new Map(
      specificBatchRows.map((row) => [
        `${row.product_id}:${row.batch_id}`,
        row._sum.quantity_available?.toNumber() ?? 0,
      ]),
    );

    for (const [key, requiredQty] of requiredBySpecificBatch.entries()) {
      const availableQty = availableBySpecificBatch.get(key) ?? 0;
      if (availableQty < requiredQty) {
        throw new BadRequestException(
          await this.i18n.translate(
            'inventory-request.errors.insufficient_stock',
            { lang },
          ),
        );
      }
    }

    const generalProductIds = Array.from(requiredByGeneralProduct.keys());
    const generalProductRows =
      generalProductIds.length > 0
        ? await this.prisma.inventory.groupBy({
            by: ['product_id'],
            where: {
              organization_id: orgId,
              warehouse_id: dto.warehouse_id,
              is_deleted: false,
              product_id: { in: generalProductIds },
            },
            _sum: { quantity_available: true },
          })
        : [];

    const availableByProduct = new Map(
      generalProductRows.map((row) => [
        row.product_id,
        row._sum.quantity_available?.toNumber() ?? 0,
      ]),
    );

    for (const [productId, requiredQty] of requiredByGeneralProduct.entries()) {
      const totalAvailable = availableByProduct.get(productId) ?? 0;
      const reservedForSpecificBatch =
        requiredSpecificByProduct.get(productId) ?? 0;
      const remainingAvailableForGeneral =
        totalAvailable - reservedForSpecificBatch;

      if (remainingAvailableForGeneral < requiredQty) {
        throw new BadRequestException(
          await this.i18n.translate(
            'inventory-request.errors.insufficient_stock',
            { lang },
          ),
        );
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
          notes: dto.notes,
          delivery_address: dto.delivery_address,
          vehicle_info: dto.vehicle_info,
          required_date: dto.required_date
            ? new Date(dto.required_date)
            : null,
          organization_id: orgId,
          warehouse: { connect: { id: dto.warehouse_id } },
          ...(dto.partner_id && {
            partner: { connect: { id: dto.partner_id } },
          }),
          created_by: actorId,
        },
      });

      // Tạo chi tiết
      const exportDetailsData: Prisma.ExportDetailCreateManyInput[] = [];
      for (const detail of dto.details) {
        exportDetailsData.push({
          export_id: createdExport.id,
          product_id: detail.product_id,
          required_batch_id: detail.required_batch_id ?? null,
          unit_id: detail.unit_id,
          quantity: detail.quantity,
          conversion_rate:
            conversionRateByPair.get(
              `${detail.product_id}:${detail.unit_id}`,
            ) ?? 1,
          created_by: actorId,
        });
      }

      await tx.exportDetail.createMany({ data: exportDetailsData });

      return createdExport;
    });

    // Lấy full export với relations
    const fullExport = await this.repository.findOutboundById(
      exportRecord.id,
      orgId,
    );

    // Invalidate cache
    // Invalidate cache
    await this.redisService.delByPattern(
      this.cacheKeys.outboundList(orgId, '*'),
    );

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
      {
        userId: actorId,
        description: `Created outbound request: ${exportRecord.code}`,
      },
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
    void lang;
    const cacheKey = this.getOutboundListCacheKey(orgId, query);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as IPaginatedResponse<IOutboundRequest>;
    }

    const result = await this.repository.findOutboundByOrgId(orgId, query);

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.OUTBOUND_LIST_TTL,
    );

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
        await this.i18n.translate('inventory-request.errors.export_not_found', {
          lang,
        }),
      );
    }

    await this.redisService.set(
      cacheKey,
      JSON.stringify(exportRecord),
      this.OUTBOUND_DETAIL_TTL,
    );

    return exportRecord;
  }

  /**
   * Xuất Excel danh sách phiếu nhập kho
   */
  async exportInbound(
    orgId: string,
    query: QueryInboundRequestDto,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const items = await this.repository.findInboundForExport(orgId, query);

    const columns = [
      { header: 'Mã phiếu', key: 'code', width: 20 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Kho', key: 'warehouse', width: 25 },
      { header: 'Đối tác', key: 'partner', width: 25 },
      { header: 'Mã PO', key: 'po_code', width: 20 },
      { header: 'Ngày tạo', key: 'created_at', width: 20 },
      { header: 'Ghi chú', key: 'notes', width: 30 },
      { header: 'Sản phẩm (SKU:SL:Đơn vị)', key: 'details', width: 50 },
    ];

    const statusMap: Record<string, string> = {
      PENDING: 'Chờ duyệt',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Từ chối',
      RECEIVING: 'Đang kiểm đếm',
      RECEIVED: 'Đã kiểm đếm',
      PUTAWAY: 'Đang cất hàng',
      COMPLETED: 'Hoàn tất',
      CANCELLED: 'Đã hủy',
    };

    const data = items.map((item) => ({
      code: item.code,
      status: statusMap[item.status] || item.status,
      warehouse: item.warehouse?.name || '',
      partner: item.partner?.name || '',
      po_code: item.purchase_order_code || '',
      created_at: item.created_at.toLocaleString('vi-VN'),
      notes: item.notes || '',
      details:
        item.details
          ?.map(
            (d) => `${d.product?.sku}:${d.expected_qty}:${d.unit?.name || ''}`,
          )
          .join(', ') || '',
    }));

    const buffer = await this.excelService.createExcelBuffer(
      columns,
      data as any[],
      'Danh sách Nhập kho',
    );
    return {
      buffer,
      fileName: `NhapKho_${new Date().toISOString().split('T')[0]}.xlsx`,
    };
  }

  /**
   * Xuất Excel danh sách phiếu xuất kho
   */
  async exportOutbound(
    orgId: string,
    query: QueryOutboundRequestDto,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const items = await this.repository.findOutboundForExport(orgId, query);

    const columns = [
      { header: 'Mã phiếu', key: 'code', width: 20 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Kho', key: 'warehouse', width: 25 },
      { header: 'Đối tác', key: 'partner', width: 25 },
      { header: 'Mã SO', key: 'so_code', width: 20 },
      { header: 'Ngày tạo', key: 'created_at', width: 20 },
      { header: 'Ghi chú', key: 'notes', width: 30 },
      { header: 'Sản phẩm (SKU:SL:Đơn vị)', key: 'details', width: 50 },
    ];

    const statusMap: Record<string, string> = {
      PENDING: 'Chờ duyệt',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Từ chối',
      PICKING: 'Đang nhặt hàng',
      PICKED: 'Đã nhặt hàng',
      CHECKING: 'Đang kiểm tra',
      CHECKED: 'Đã kiểm tra',
      PACKED: 'Đã đóng gói',
      SHIPPED: 'Đã xuất kho',
      COMPLETED: 'Hoàn tất',
      CANCELLED: 'Đã hủy',
    };

    const data = items.map((item) => ({
      code: item.code,
      status: statusMap[item.status] || item.status,
      warehouse: item.warehouse?.name || '',
      partner: item.partner?.name || '',
      so_code: item.sales_order_code || '',
      created_at: item.created_at.toLocaleString('vi-VN'),
      notes: item.notes || '',
      details:
        item.details
          ?.map((d) => `${d.product?.sku}:${d.quantity}:${d.unit?.name || ''}`)
          .join(', ') || '',
    }));

    const buffer = await this.excelService.createExcelBuffer(
      columns,
      data as any[],
      'Danh sách Xuất kho',
    );
    return {
      buffer,
      fileName: `XuatKho_${new Date().toISOString().split('T')[0]}.xlsx`,
    };
  }

  /**
   * Xuất Excel danh sách tồn kho
   */
  async exportStock(
    orgId: string,
    warehouseId?: string,
    keywords?: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const { items: stocks } = await this.listInventoryStock(orgId, warehouseId, keywords, 10000, 0);

    const columns = [
      { header: 'Sản phẩm', key: 'product_name', width: 30 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Kho', key: 'warehouse_name', width: 20 },
      { header: 'Vị trí', key: 'location', width: 40 },
      { header: 'Mã lô', key: 'batch_code', width: 15 },
      { header: 'Ngày hết hạn', key: 'expiry_date', width: 15 },
      { header: 'Tổng tồn', key: 'quantity', width: 12 },
      { header: 'Sẵn sàng', key: 'quantity_available', width: 12 },
      { header: 'Đang giữ', key: 'quantity_allocated', width: 12 },
      { header: 'Ngày lưu kho', key: 'days_in_storage', width: 15 },
    ];

    const data = stocks.map((s) => ({
      ...s,
      expiry_date: s.expiry_date
        ? new Date(s.expiry_date).toLocaleDateString('vi-VN')
        : '',
    }));

    const buffer = await this.excelService.createExcelBuffer(
      columns,
      data,
      'Báo cáo Tồn kho',
    );
    return {
      buffer,
      fileName: `TonKho_${new Date().toISOString().split('T')[0]}.xlsx`,
    };
  }

  /**
   * Nhập Excel phiếu nhập kho
   */
  async importInbound(
    orgId: string,
    buffer: Buffer,
    actorId: string,
    lang: string,
  ) {
    const rows = await this.excelService.parseExcel<any>(buffer);
    if (!rows || rows.length === 0) {
      throw new BadRequestException('File Excel không có dữ liệu');
    }

    const errors: string[] = [];
    let successCount = 0;

    // Group rows by po_code
    const groupedRows: Record<string, any[]> = rows.reduce(
      (acc, row) => {
        const key = row['Mã PO*'] || row['po_code'] || 'DEFAULT';
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    // Fetch common data for validation
    const [warehouses, products, units] = await Promise.all([
      this.prisma.warehouse.findMany({
        where: { organization_id: orgId, is_deleted: false },
      }),
      this.prisma.product.findMany({
        where: { organization_id: orgId, is_deleted: false },
      }),
      this.prisma.unit.findMany({
        where: { organization_id: orgId, is_deleted: false },
      }),
    ]);

    for (const [poCode, orderRowsTyped] of Object.entries(groupedRows)) {
      try {
        const firstRow = orderRowsTyped[0];
        const warehouseName =
          firstRow['Kho nhận*'] || firstRow['warehouse_name'];
        const warehouse = warehouses.find(
          (w) => w.name?.toLowerCase() === warehouseName?.toLowerCase(),
        );

        if (!warehouse) {
          errors.push(`Mã PO ${poCode}: Không tìm thấy kho "${warehouseName}"`);
          continue;
        }

        const details: any[] = [];
        for (const row of orderRowsTyped) {
          const sku = row['Mã sản phẩm (SKU)*'] || row['sku'];
          const product = products.find(
            (p) => p.sku?.toLowerCase() === sku?.toLowerCase(),
          );
          if (!product) {
            errors.push(
              `Mã PO ${poCode}: Không tìm thấy sản phẩm SKU "${sku}"`,
            );
            continue;
          }

          const unitName = row['Đơn vị*'] || row['unit_name'];
          const unit = units.find(
            (u) => u.name?.toLowerCase() === unitName?.toLowerCase(),
          );
          if (!unit) {
            errors.push(
              `Mã PO ${poCode}, SKU ${sku}: Không tìm thấy đơn vị "${unitName}"`,
            );
            continue;
          }

          const quantity = Number(row['Số lượng*'] || row['quantity']);
          if (isNaN(quantity) || quantity <= 0) {
            errors.push(`Mã PO ${poCode}, SKU ${sku}: Số lượng không hợp lệ`);
            continue;
          }

          details.push({
            product_id: product.id,
            unit_id: unit.id,
            expected_qty: quantity,
            batch_code: row['Mã lô'] || row['batch_code'],
            expiry_date: row['Ngày hết hạn (dd/mm/yyyy)'] || row['expiry_date'],
            notes: row['Ghi chú'] || row['note'],
          });
        }

        if (details.length > 0) {
          await this.createInbound(
            orgId,
            {
              warehouse_id: warehouse.id,
              purchase_order_code: poCode === 'DEFAULT' ? undefined : poCode,
              details,
              notes: 'Nhập từ file Excel',
            },
            actorId,
            lang,
          );
          successCount++;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Mã PO ${poCode}: Lỗi hệ thống - ${message}`);
      }
    }

    return { successCount, errors };
  }

  /**
   * Nhập Excel phiếu xuất kho
   */
  async importOutbound(
    orgId: string,
    buffer: Buffer,
    actorId: string,
    lang: string,
  ) {
    const rows = await this.excelService.parseExcel<any>(buffer);
    if (!rows || rows.length === 0) {
      throw new BadRequestException('File Excel không có dữ liệu');
    }

    const errors: string[] = [];
    let successCount = 0;

    // Group rows by so_code
    const groupedRows: Record<string, any[]> = rows.reduce(
      (acc, row) => {
        const key = row['Mã SO/Đơn hàng*'] || row['so_code'] || 'DEFAULT';
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    // Fetch common data for validation
    const [warehouses, products, units] = await Promise.all([
      this.prisma.warehouse.findMany({
        where: { organization_id: orgId, is_deleted: false },
      }),
      this.prisma.product.findMany({
        where: { organization_id: orgId, is_deleted: false },
      }),
      this.prisma.unit.findMany({
        where: { organization_id: orgId, is_deleted: false },
      }),
    ]);

    for (const [soCode, orderRowsTyped] of Object.entries(groupedRows)) {
      try {
        const firstRow = orderRowsTyped[0];
        const warehouseName =
          firstRow['Kho xuất*'] || firstRow['warehouse_name'];
        const warehouse = warehouses.find(
          (w) => w.name?.toLowerCase() === warehouseName?.toLowerCase(),
        );

        if (!warehouse) {
          errors.push(`Mã SO ${soCode}: Không tìm thấy kho "${warehouseName}"`);
          continue;
        }

        const details: any[] = [];
        for (const row of orderRowsTyped) {
          const sku = row['Mã sản phẩm (SKU)*'] || row['sku'];
          const product = products.find(
            (p) => p.sku?.toLowerCase() === sku?.toLowerCase(),
          );
          if (!product) {
            errors.push(
              `Mã SO ${soCode}: Không tìm thấy sản phẩm SKU "${sku}"`,
            );
            continue;
          }

          const unitName = row['Đơn vị*'] || row['unit_name'];
          const unit = units.find(
            (u) => u.name?.toLowerCase() === unitName?.toLowerCase(),
          );
          if (!unit) {
            errors.push(
              `Mã SO ${soCode}, SKU ${sku}: Không tìm thấy đơn vị "${unitName}"`,
            );
            continue;
          }

          const quantity = Number(row['Số lượng*'] || row['quantity']);
          if (isNaN(quantity) || quantity <= 0) {
            errors.push(`Mã SO ${soCode}, SKU ${sku}: Số lượng không hợp lệ`);
            continue;
          }

          details.push({
            product_id: product.id,
            unit_id: unit.id,
            quantity: quantity,
            notes: row['Ghi chú'] || row['note'],
          });
        }

        if (details.length > 0) {
          await this.createOutbound(
            orgId,
            {
              warehouse_id: warehouse.id,
              sales_order_code: soCode === 'DEFAULT' ? `EXCEL-${Date.now()}` : soCode,
              vehicle_info: firstRow['Thông tin xe'] || firstRow['vehicle_info'] || 'N/A',
              details,
              notes: 'Xuất hàng từ file Excel',
            },
            actorId,
            lang,
          );
          successCount++;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Mã SO ${soCode}: Lỗi hệ thống - ${message}`);
      }
    }

    return { successCount, errors };
  }

  /**
   * Duyệt phiếu nhập kho (PENDING → COMPLETED)
   * Tự động thực hiện cất hàng vào kho 3D (Auto-Putaway)
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
        await this.i18n.translate(
          'inventory-request.errors.receipt_not_found',
          { lang },
        ),
      );
    }
    if (receipt.status !== ReceiptStatus.PENDING) {
      throw new ConflictException(
        await this.i18n.translate('inventory-request.errors.invalid_status', {
          lang,
        }),
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Tự động mở rộng mặt bằng nếu thiếu chỗ (layout physical) – chỉ chuẩn bị vị trí
      await this.autoAllocateLayout(tx, id, receipt.warehouse_id, actorId);

      // 2. Chỉ chuyển trạng thái PENDING → APPROVED
      //    fillInventory và putaway sẽ được thực hiện ở bước confirmPutaway
      return tx.receipt.update({
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
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  image_url: true,
                  width: true,
                  height: true,
                  length: true,
                },
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
      this.redisService.del(this.getInboundDetailCacheKey(id)),
      this.redisService.delByPattern(this.cacheKeys.inboundList(orgId, '*')),
    ]);

    // Emit realtime event: inbound:approved
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
      {
        userId: actorId,
        description: `Approved inbound request: ${updated.code}`,
      },
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
        await this.i18n.translate(
          'inventory-request.errors.receipt_not_found',
          { lang },
        ),
      );
    }
    if (receipt.status !== ReceiptStatus.PENDING) {
      throw new ConflictException(
        await this.i18n.translate('inventory-request.errors.invalid_status', {
          lang,
        }),
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
    await Promise.all([
      this.redisService.del(this.getInboundDetailCacheKey(id)),
      this.redisService.delByPattern(this.cacheKeys.inboundList(orgId, '*')),
    ]);

    // Emit realtime event (new semantic event for cancelled state)
    this.websocketGateway.emitToOrganization(orgId, 'inbound:cancelled', {
      receiptId: id,
      code: updated.code,
      cancelledBy: actorId,
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
      {
        userId: actorId,
        description: `Rejected inbound request: ${updated.code}`,
      },
    );

    return updated as unknown as IInboundRequest;
  }

  /**
   * Duyệt phiếu xuất kho (PENDING → PICKING)
   * Tạo ExportPickList + reserve inventory (giống WM flow)
   */
  async approveOutbound(
    orgId: string,
    id: string,
    actorId: string,
    lang: string,
    notes?: string,
    pickingStrategy: 'FEFO' | 'FIFO' = 'FEFO',
  ): Promise<IOutboundRequest> {
    const exportRecord = await this.prisma.export.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
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
    if (exportRecord.status !== 'PENDING') {
      throw new ConflictException(
        await this.i18n.translate('inventory-request.errors.invalid_status', {
          lang,
        }),
      );
    }

    // Transaction: Reserve inventory + tạo ExportPickList + cập nhật status
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Reserve inventory (tăng allocated, giảm available)
      const pickListDetails: {
        export_detail_id: string;
        product_id: string;
        batch_id: string | null;
        block_id: string;
        required_qty: number;
      }[] = [];

      const detailDemands = exportRecord.details.map((detail) => ({
        detail,
        demandKey: `${detail.product_id}:${detail.required_batch_id ?? '*'}`,
        quantityToReserve:
          detail.quantity.toNumber() * detail.conversion_rate.toNumber(),
      }));

      const uniqueDemandKeys = Array.from(
        new Set(detailDemands.map((item) => item.demandKey)),
      );
      const inventoryCandidatesByKey = new Map<
        string,
        Array<{
          id: string;
          batch_id: string | null;
          block_id: string;
          remainingAvailable: number;
        }>
      >();

      await Promise.all(
        uniqueDemandKeys.map(async (demandKey) => {
          const [productId, requiredBatchId] = demandKey.split(':');
          const inventories = await tx.inventory.findMany({
            where: {
              organization_id: orgId,
              warehouse_id: exportRecord.warehouse_id,
              product_id: productId,
              ...(requiredBatchId !== '*' && { batch_id: requiredBatchId }),
              quantity_available: { gt: 0 },
              is_deleted: false,
            },
            include: { batch: true },
            orderBy:
              pickingStrategy === 'FEFO'
                ? [{ batch: { expiry_date: 'asc' } }, { created_at: 'asc' }]
                : [{ created_at: 'asc' }],
          });

          inventoryCandidatesByKey.set(
            demandKey,
            inventories.map((inv) => ({
              id: inv.id,
              batch_id: inv.batch_id,
              block_id: inv.block_id,
              remainingAvailable: inv.quantity_available.toNumber(),
            })),
          );
        }),
      );

      const reservedByInventoryId = new Map<string, number>();

      for (const { detail, demandKey, quantityToReserve } of detailDemands) {
        const inventories = inventoryCandidatesByKey.get(demandKey) ?? [];
        let remaining = quantityToReserve;
        for (const inv of inventories) {
          if (remaining <= 0) break;
          const available = inv.remainingAvailable;
          if (available <= 0) {
            continue;
          }
          const reserveQty = Math.min(remaining, available);
          inv.remainingAvailable -= reserveQty;

          reservedByInventoryId.set(
            inv.id,
            (reservedByInventoryId.get(inv.id) ?? 0) + reserveQty,
          );

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

      for (const [
        inventoryId,
        reservedQty,
      ] of reservedByInventoryId.entries()) {
        await tx.inventory.update({
          where: { id: inventoryId },
          data: {
            quantity_allocated: { increment: reservedQty },
            quantity_available: { decrement: reservedQty },
            updated_by: actorId,
          },
        });
      }

      // 2. Tạo ExportPickList
      const pickListCode = `PL-${exportRecord.code}`;
      await tx.exportPickList.create({
        data: {
          export_id: id,
          organization_id: orgId,
          warehouse_id: exportRecord.warehouse_id,
          code: pickListCode,
          status: 'PENDING',
          notes: notes || null,
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
        where: { id },
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
      this.redisService.del(this.getOutboundDetailCacheKey(id)),
      this.redisService.delByPattern(this.cacheKeys.outboundList(orgId, '*')),
    ]);

    // Emit realtime event
    this.websocketGateway.emitToOrganization(orgId, 'outbound:approved', {
      exportId: id,
      code: result.code,
      approvedBy: actorId,
      pickingStrategy,
      timestamp: new Date().toISOString(),
    });

    // Audit log
    this.auditLogService.logUpdate(
      orgId,
      'Export',
      id,
      { status: 'PENDING' },
      { status: 'PICKING' },
      {
        userId: actorId,
        description: `Approved outbound request: ${result.code}`,
      },
    );

    return result as unknown as IOutboundRequest;
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
        await this.i18n.translate('inventory-request.errors.export_not_found', {
          lang,
        }),
      );
    }
    if (exportRecord.status !== 'PENDING') {
      throw new ConflictException(
        await this.i18n.translate('inventory-request.errors.invalid_status', {
          lang,
        }),
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
      {
        userId: actorId,
        description: `Rejected outbound request: ${updated.code}`,
      },
    );

    return updated as unknown as IOutboundRequest;
  }

  // ==================== INBOUND WORKFLOW STEPS ====================

  /**
   * Bắt đầu kiểm đếm: APPROVED → RECEIVING
   */
  async startReceiving(
    orgId: string,
    id: string,
    actorId: string,
    lang: string,
    dto?: StartReceivingDto,
  ): Promise<IInboundRequest> {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
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
        await this.i18n.translate('inventory-request.errors.invalid_status', {
          lang,
        }),
      );
    }

    const updated = await this.prisma.receipt.update({
      where: { id },
      data: {
        status: ReceiptStatus.RECEIVING,
        checker_id: dto?.checker_id || null,
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

    await Promise.all([
      this.redisService.del(this.getInboundDetailCacheKey(id)),
      this.redisService.delByPattern(this.cacheKeys.inboundList(orgId, '*')),
    ]);

    this.websocketGateway.emitToOrganization(
      orgId,
      'inbound:receiving-started',
      {
        receiptId: id,
        code: updated.code,
        startedBy: actorId,
        timestamp: new Date().toISOString(),
      },
    );

    return updated as unknown as IInboundRequest;
  }

  /**
   * Hoàn tác bắt đầu kiểm đếm: RECEIVING → APPROVED
   */
  async revertToApproved(
    orgId: string,
    id: string,
    actorId: string,
    lang: string,
  ): Promise<IInboundRequest> {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
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
        await this.i18n.translate('inventory-request.errors.invalid_status', {
          lang,
        }),
      );
    }

    const updated = await this.prisma.receipt.update({
      where: { id },
      data: {
        status: ReceiptStatus.APPROVED,
        checker_id: null,
        receiving_started_at: null,
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

    await Promise.all([
      this.redisService.del(this.getInboundDetailCacheKey(id)),
      this.redisService.delByPattern(this.cacheKeys.inboundList(orgId, '*')),
    ]);

    this.websocketGateway.emitToOrganization(orgId, 'inbound:approved', {
      receiptId: id,
      code: updated.code,
      revertedBy: actorId,
      timestamp: new Date().toISOString(),
    });

    return updated as unknown as IInboundRequest;
  }

  /**
   * Hoàn tác xác nhận kiểm đếm: PROCESSING → RECEIVING
   */
  async revertToReceiving(
    orgId: string,
    id: string,
    actorId: string,
    lang: string,
  ): Promise<IInboundRequest> {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
      include: { details: { where: { is_deleted: false } } },
    });
    if (!receipt) {
      throw new NotFoundException(
        await this.i18n.translate(
          'inventory-request.errors.receipt_not_found',
          { lang },
        ),
      );
    }
    if (receipt.status !== ReceiptStatus.PROCESSING) {
      throw new BadRequestException(
        await this.i18n.translate('inventory-request.errors.invalid_status', {
          lang,
        }),
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Reset actual_qty về expected_qty để kiểm đếm lại
      for (const detail of receipt.details) {
        await tx.receiptDetail.update({
          where: { id: detail.id },
          data: { actual_qty: detail.expected_qty },
        });
      }
      return tx.receipt.update({
        where: { id },
        data: {
          status: ReceiptStatus.RECEIVING,
          receiving_completed_at: null,
          is_customer_mismatch_agreed: false,
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

    await Promise.all([
      this.redisService.del(this.getInboundDetailCacheKey(id)),
      this.redisService.delByPattern(this.cacheKeys.inboundList(orgId, '*')),
    ]);

    this.websocketGateway.emitToOrganization(
      orgId,
      'inbound:receiving-started',
      {
        receiptId: id,
        code: updated.code,
        revertedBy: actorId,
        timestamp: new Date().toISOString(),
      },
    );

    return updated as unknown as IInboundRequest;
  }

  /**
   * Xác nhận kiểm đếm: RECEIVING → PROCESSING
   */
  async confirmReceiving(
    orgId: string,
    id: string,
    actorId: string,
    lang: string,
    dto: ConfirmReceivingDto,
  ): Promise<IInboundRequest> {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
      include: { details: { where: { is_deleted: false } } },
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
        await this.i18n.translate('inventory-request.errors.invalid_status', {
          lang,
        }),
      );
    }

    // Tính danh sách dòng lệch số lượng
    const mismatchDetails = dto.details
      .map((item) => {
        const existing = receipt.details.find((d) => d.id === item.detail_id);
        if (!existing) return null;
        const expectedQty = Number(existing.expected_qty);
        if (expectedQty === item.actual_qty) return null;
        return {
          detail_id: item.detail_id,
          product_id: existing.product_id,
          expected_qty: expectedQty,
          actual_qty: item.actual_qty,
          diff: item.actual_qty - expectedQty,
        };
      })
      .filter(Boolean);

    const hasMismatch = mismatchDetails.length > 0;

    // Phát hiện lệch số lượng → yêu cầu xác nhận của khách hàng
    if (hasMismatch && dto.is_customer_agreed === undefined) {
      throw new BadRequestException({
        code: 'inventory-request.errors.mismatch_confirm_required',
        message: await this.i18n.translate(
          'inventory-request.errors.mismatch_confirm_required',
          { lang },
        ),
        mismatches: mismatchDetails,
        require_customer_agreement: true,
      });
    }

    // Khách hàng không đồng ý → huỷ phiếu nhập, không để treo đơn
    const isCancelled = hasMismatch && dto.is_customer_agreed === false;
    const finalStatus = isCancelled
      ? ReceiptStatus.CANCELLED
      : ReceiptStatus.PROCESSING;
    const cancelReason = await this.i18n.translate(
      'inventory-request.errors.inbound_cancelled_customer_rejected',
      { lang },
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.details) {
        await tx.receiptDetail.update({
          where: { id: item.detail_id },
          data: { actual_qty: item.actual_qty },
        });
      }
      return tx.receipt.update({
        where: { id },
        data: {
          status: finalStatus,
          receiving_completed_at: new Date(),
          notes: isCancelled ? cancelReason : (dto.notes ?? receipt.notes),
          // ✅ Lưu flag: khách hàng đã đồng ý với mismatch
          is_customer_mismatch_agreed:
            hasMismatch && dto.is_customer_agreed === true ? true : false,
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

    await Promise.all([
      this.redisService.del(this.getInboundDetailCacheKey(id)),
      this.redisService.delByPattern(this.cacheKeys.inboundList(orgId, '*')),
    ]);

    if (isCancelled) {
      this.websocketGateway.emitToOrganization(orgId, 'inbound:cancelled', {
        receiptId: id,
        code: updated.code,
        reason: 'customer_rejected_mismatch',
        cancelledBy: actorId,
        mismatches: mismatchDetails,
        timestamp: new Date().toISOString(),
      });
    } else {
      this.websocketGateway.emitToOrganization(
        orgId,
        'inbound:receiving-confirmed',
        {
          receiptId: id,
          code: updated.code,
          hasMismatch,
          customerAgreed: dto.is_customer_agreed ?? null,
          confirmedBy: actorId,
          timestamp: new Date().toISOString(),
        },
      );
    }

    return updated as unknown as IInboundRequest;
  }

  /**
   * Xác nhận cất hàng: PROCESSING → COMPLETED (gọi fillInventory)
   */
  async confirmPutaway(
    orgId: string,
    id: string,
    actorId: string,
    lang: string,
    dto?: ConfirmPutawayDto,
  ): Promise<IInboundRequest> {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
      include: {
        details: {
          where: { is_deleted: false },
          include: {
            product: {
              select: { id: true, name: true, weight: true, sku: true },
            },
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
    if (receipt.status !== ReceiptStatus.PROCESSING) {
      throw new BadRequestException(
        await this.i18n.translate('inventory-request.errors.invalid_status', {
          lang,
        }),
      );
    }

    // Kiểm tra số lượng kiểm đếm thực tế
    const mismatchDetails = receipt.details.filter((d) => {
      const actualQty = (d.actual_qty as any as Prisma.Decimal).toNumber();
      const expectedQty = (d.expected_qty as any as Prisma.Decimal).toNumber();
      return actualQty === 0 || actualQty !== expectedQty;
    });

    // ✅ Nếu khách hàng đã đồng ý mismatch ở receiving → cho phép cất hàng ngay (không yêu cầu force)
    const hasCustomerApprovedMismatch =
      (receipt as any).is_customer_mismatch_agreed === true;

    if (
      mismatchDetails.length > 0 &&
      !dto?.force &&
      !hasCustomerApprovedMismatch
    ) {
      const mismatches = mismatchDetails.map((d) => ({
        detail_id: d.id,
        product_name: (d as any).product?.name || d.product_id,
        expected_qty: (d.expected_qty as any as Prisma.Decimal).toNumber(),
        actual_qty: (d.actual_qty as any as Prisma.Decimal).toNumber(),
      }));
      throw new BadRequestException({
        code: 'inventory-request.errors.quantity_mismatch',
        message: await this.i18n.translate(
          'inventory-request.errors.quantity_mismatch',
          { lang },
        ),
        mismatches,
        require_force: true,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Fill inventory cho từng detail và lấy thông tin block đã dùng
      const allUsedBlocks: {
        product_id: string;
        batch_id: string | null;
        block_ids: string[];
      }[] = [];

      for (const detail of receipt.details) {
        // receipt lấy từ prisma.findFirst nên các trường Decimal cần .toNumber()
        const actualQty =
          (detail.actual_qty as any as Prisma.Decimal).toNumber() ||
          (detail.expected_qty as any as Prisma.Decimal).toNumber();
        if (actualQty > 0) {
          const blockIds = await this.fillInventory(
            tx,
            orgId,
            receipt.warehouse_id,
            detail.product_id,
            detail.batch_id ?? null,
            actualQty,
            (detail.conversion_rate as any as Prisma.Decimal).toNumber(),
            receipt.code,
            actorId,
            detail.product?.sku, // Pass SKU for priority slotting
          );
          allUsedBlocks.push({
            product_id: detail.product_id,
            batch_id: detail.batch_id ?? null,
            block_ids: blockIds,
          });
        }
      }

      // Tạo ReceiptPutaway record với mapping chính xác
      const putaway = await tx.receiptPutaway.create({
        data: {
          receipt_id: receipt.id,
          organization_id: orgId,
          warehouse_id: receipt.warehouse_id,
          code: `PA-${receipt.code.split('-').pop()}`,
          status: PutawayStatus.COMPLETED,
          worker_id: actorId,
          completed_at: new Date(),
          created_by: actorId,
        },
      });

      // Tạo chi tiết Putaway - một dòng cho mỗi block được sử dụng để mapping 1-1
      for (const usedItem of allUsedBlocks) {
        const receiptDetail = receipt.details.find(
          (d) => d.product_id === usedItem.product_id,
        );
        if (!receiptDetail) continue;

        for (const blockId of usedItem.block_ids) {
          await tx.receiptPutawayDetail.create({
            data: {
              putaway_id: putaway.id,
              receipt_detail_id: receiptDetail.id,
              product_id: usedItem.product_id,
              batch_id: usedItem.batch_id,
              block_id: blockId, // Gán đúng ID của Block
              expected_qty: 1,
              actual_qty: 1,
              created_by: actorId,
            },
          });
        }
      }

      // Cập nhật trạng thái phiếu nhập sang COMPLETED
      return tx.receipt.update({
        where: { id: id },
        data: {
          status: ReceiptStatus.COMPLETED,
          putaway_completed_at: new Date(),
          updated_at: new Date(),
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

    await Promise.all([
      this.redisService.del(this.getInboundDetailCacheKey(id)),
      this.redisService.delByPattern(this.cacheKeys.inboundList(orgId, '*')),
    ]);

    this.websocketGateway.emitToOrganization(
      orgId,
      'inbound:putaway-confirmed',
      {
        receiptId: id,
        code: updated.code,
        confirmedBy: actorId,
        totalProducts: (receipt.details ?? []).length,
        timestamp: new Date().toISOString(),
      },
    );

    this.auditLogService.logUpdate(
      orgId,
      'Receipt',
      id,
      { status: ReceiptStatus.PROCESSING } as Record<string, unknown>,
      { status: ReceiptStatus.COMPLETED } as Record<string, unknown>,
      { userId: actorId, description: `Putaway confirmed: ${receipt.code}` },
    );

    return updated as unknown as IInboundRequest;
  }

  // ==================== OUTBOUND WORKFLOW STEPS ====================

  /**
   * Xác nhận nhặt hàng: PICKING → CHECKING
   */
  async confirmPicking(
    orgId: string,
    id: string,
    actorId: string,
    lang: string,
    dto: ConfirmPickingDto,
  ): Promise<IOutboundRequest> {
    const exportRecord = await this.prisma.export.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
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
        await this.i18n.translate('inventory-request.errors.invalid_status', {
          lang,
        }),
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.details) {
        await tx.exportPickListDetail.update({
          where: { id: item.pick_list_detail_id },
          data: { picked_qty: item.picked_qty },
        });
      }
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
        where: { id },
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

    await Promise.all([
      this.redisService.del(this.getOutboundDetailCacheKey(id)),
      this.redisService.delByPattern(this.cacheKeys.outboundList(orgId, '*')),
    ]);

    this.websocketGateway.emitToOrganization(
      orgId,
      'outbound:picking-confirmed',
      {
        exportId: id,
        code: updated.code,
        confirmedBy: actorId,
        timestamp: new Date().toISOString(),
      },
    );

    return updated as unknown as IOutboundRequest;
  }

  /**
   * Xác nhận kiểm tra xuất: CHECKING → PACKED
   */
  async confirmChecking(
    orgId: string,
    id: string,
    actorId: string,
    lang: string,
    dto: ConfirmCheckingDto,
  ): Promise<IOutboundRequest> {
    const exportRecord = await this.prisma.export.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
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
        await this.i18n.translate('inventory-request.errors.invalid_status', {
          lang,
        }),
      );
    }

    // Ngăn kiểm tra trùng lặp
    if (exportRecord.checking_completed_at) {
      throw new ConflictException(
        lang === 'vi'
          ? 'Phiếu xuất đã được kiểm tra trước đó'
          : 'This export has already been checked',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Lưu kết quả kiểm tra cho từng dòng phiếu xuất
      for (const item of dto.details) {
        await tx.exportDetail.update({
          where: { id: item.export_detail_id },
          data: {
            checked_qty: item.checked_qty,
            passed: item.passed ?? true,
            updated_by: actorId,
          },
        });
      }

      return tx.export.update({
        where: { id },
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
    });

    await Promise.all([
      this.redisService.del(this.getOutboundDetailCacheKey(id)),
      this.redisService.delByPattern(this.cacheKeys.outboundList(orgId, '*')),
    ]);

    this.websocketGateway.emitToOrganization(
      orgId,
      'outbound:checking-confirmed',
      {
        exportId: id,
        code: updated.code,
        confirmedBy: actorId,
        timestamp: new Date().toISOString(),
      },
    );

    return updated as unknown as IOutboundRequest;
  }

  /**
   * Hoàn tất xuất kho: PACKED → SHIPPED (trừ inventory thật)
   */
  async completeShipment(
    orgId: string,
    id: string,
    actorId: string,
    lang: string,
    dto?: CompleteShipmentDto,
  ): Promise<IOutboundRequest> {
    const exportRecord = await this.prisma.export.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
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
          include: { details: { where: { is_deleted: false } } },
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
        await this.i18n.translate('inventory-request.errors.invalid_status', {
          lang,
        }),
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Trừ inventory thật dựa trên pick list details
      for (const pickList of exportRecord.pick_lists) {
        for (const plDetail of pickList.details) {
          const pickedQty =
            plDetail.picked_qty.toNumber() || plDetail.required_qty.toNumber();
          if (pickedQty > 0) {
            const inv = await tx.inventory.findFirst({
              where: {
                organization_id: orgId,
                warehouse_id: exportRecord.warehouse_id,
                block_id: plDetail.block_id,
                product_id: plDetail.product_id,
                batch_id: plDetail.batch_id,
                is_deleted: false,
              },
            });
            if (inv) {
              await tx.inventory.update({
                where: { id: inv.id },
                data: {
                  quantity: { decrement: pickedQty },
                  quantity_on_hand: { decrement: pickedQty },
                  quantity_allocated: { decrement: pickedQty },
                  updated_by: actorId,
                },
              });
              await tx.inventoryTransaction.create({
                data: {
                  organization_id: orgId,
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
        where: { id },
        data: {
          status: ExportStatus.SHIPPED,
          shipped_at: new Date(),
          tracking_number: dto?.tracking_number || null,
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

    await Promise.all([
      this.redisService.del(this.getOutboundDetailCacheKey(id)),
      this.redisService.delByPattern(this.cacheKeys.outboundList(orgId, '*')),
    ]);

    this.websocketGateway.emitToOrganization(
      orgId,
      'outbound:shipment-completed',
      {
        exportId: id,
        code: updated.code,
        completedBy: actorId,
        trackingNumber: dto?.tracking_number,
        timestamp: new Date().toISOString(),
      },
    );

    this.auditLogService.logUpdate(
      orgId,
      'Export',
      id,
      { status: ExportStatus.PACKED } as Record<string, unknown>,
      { status: ExportStatus.SHIPPED } as Record<string, unknown>,
      { userId: actorId, description: `Shipment completed: ${updated.code}` },
    );

    return updated as unknown as IOutboundRequest;
  }

  /**
   * Bổ sung tồn kho cho phiếu nhập COMPLETED nhưng chưa có inventory
   * (do thiếu block tại thời điểm confirmPutaway)
   */
  async refillInventory(
    orgId: string,
    id: string,
    actorId: string,
    lang: string,
  ) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
      include: {
        details: {
          where: { is_deleted: false },
          include: {
            product: {
              select: { id: true, name: true, sku: true, image_url: true },
            },
            batch: { select: { id: true, code: true, expiry_date: true } },
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
    if (receipt.status !== ReceiptStatus.COMPLETED) {
      throw new BadRequestException(
        lang === 'vi'
          ? 'Chỉ có thể bổ sung tồn kho cho phiếu nhập đã hoàn tất'
          : 'Only completed receipts can be refilled',
      );
    }

    // Kiểm tra đã có inventory cho phiếu này chưa
    const existingCount = await this.prisma.inventoryTransaction.count({
      where: {
        organization_id: orgId,
        reference_code: receipt.code,
        type: TransactionType.INBOUND,
      },
    });
    if (existingCount > 0) {
      throw new BadRequestException(
        lang === 'vi'
          ? 'Phiếu nhập này đã có tồn kho rồi'
          : 'This receipt already has inventory records',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const detail of receipt.details) {
        const actualQty =
          (detail.actual_qty as any as Prisma.Decimal).toNumber() ||
          (detail.expected_qty as any as Prisma.Decimal).toNumber();
        if (actualQty > 0) {
          await this.fillInventory(
            tx,
            orgId,
            receipt.warehouse_id,
            detail.product_id,
            detail.batch_id ?? null,
            actualQty,
            (detail.conversion_rate as any as Prisma.Decimal).toNumber(),
            receipt.code,
            actorId,
            detail.product?.sku, // Pass SKU for priority slotting
          );
        }
      }

      return tx.receipt.findFirst({
        where: { id },
        include: {
          warehouse: { select: { id: true, name: true } },
          details: {
            where: { is_deleted: false },
            include: {
              product: {
                select: { id: true, name: true, sku: true, image_url: true },
              },
              batch: { select: { id: true, code: true, expiry_date: true } },
            },
          },
        },
      });
    });
  }

  // ==================== FILL INVENTORY ALGORITHM ====================

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
    productSku?: string,
  ): Promise<string[]> {
    const baseQuantity = quantity * conversionRate;
    const usedBlockIds: string[] = [];
    let remainingQty = baseQuantity;

    // Determine priority class based on SKU
    let priorityClass: 'A' | 'B' | 'C' = 'B';
    if (productSku) {
      const sku = productSku.toUpperCase();
      if (sku.startsWith('A') || sku.includes('VIP')) priorityClass = 'A';
      else if (sku.startsWith('C') || sku.includes('BULK')) priorityClass = 'C';
    }

    // 1. Helper function to find and fill available bins
    const findAndFill = async (qtyToFill: number) => {
      const binClient = (tx as any).bin;
      // Optimization: Get all available bins for this warehouse
      const availableBins = (await binClient.findMany({
        where: {
          warehouse_id: warehouseId,
          status: 'Available',
          is_deleted: false,
        },
      })) as Array<{
        id: string;
        uid: string;
        position_xyz: { x?: number; y?: number; z?: number };
      }>;

      // Sort bins based on priority class
      // pos.z: depth (front-to-back), pos.y: height (floor-to-ceiling)
      const sortedBins = availableBins.sort((a, b) => {
        const posA = a.position_xyz;
        const posB = b.position_xyz;

        if (priorityClass === 'A') {
          // Fast moving: Front (z ASC) and Low (y ASC)
          return (
            Number(posA.z) - Number(posB.z) ||
            Number(posA.y) - Number(posB.y) ||
            Number(posA.x) - Number(posB.x)
          );
        } else if (priorityClass === 'C') {
          // Slow movingBin: Back (z DESC) and High (y DESC)
          return (
            Number(posB.z) - Number(posA.z) ||
            Number(posB.y) - Number(posA.y) ||
            Number(posA.x) - Number(posB.x)
          );
        } else {
          // Standard: Front-to-back
          return (
            Number(posA.z) - Number(posB.z) ||
            Number(posA.y) - Number(posB.y) ||
            Number(posA.x) - Number(posB.x)
          );
        }
      });

      const blockCodeByBinId = new Map<string, string>();
      for (const bin of sortedBins) {
        const blockCode = bin.uid.split('-').slice(2).join('-');
        if (blockCode) {
          blockCodeByBinId.set(bin.id, blockCode);
        }
      }

      const candidateBlockCodes = Array.from(
        new Set(Array.from(blockCodeByBinId.values())),
      );
      const blocks =
        candidateBlockCodes.length > 0
          ? await tx.block.findMany({
              where: {
                code: { in: candidateBlockCodes },
                shelf: { rack: { row: { warehouse_id: warehouseId } } },
                is_deleted: false,
              },
              select: { id: true, code: true },
            })
          : [];

      const blockByCode = new Map(
        blocks.map((block) => [block.code, block.id]),
      );
      const inventoryRows: Prisma.InventoryCreateManyInput[] = [];
      const transactionRows: Prisma.InventoryTransactionCreateManyInput[] = [];
      const occupiedBinIds: string[] = [];

      let filled = 0;
      for (const bin of sortedBins) {
        if (filled >= qtyToFill) break;

        const blockCode = blockCodeByBinId.get(bin.id);
        if (!blockCode) continue;
        const blockId = blockByCode.get(blockCode);
        if (!blockId) continue;

        inventoryRows.push({
          organization_id: orgId,
          warehouse_id: warehouseId,
          block_id: blockId,
          bin_id: bin.id,
          product_id: productId,
          batch_id: batchId,
          quantity: 1,
          quantity_on_hand: 1,
          quantity_allocated: 0,
          quantity_available: 1,
          created_by: actorId,
        });

        transactionRows.push({
          organization_id: orgId,
          warehouse_id: warehouseId,
          product_id: productId,
          batch_id: batchId,
          to_block_id: blockId,
          type: TransactionType.INBOUND,
          quantity: 1,
          reference_code: referenceCode,
          created_by: actorId,
        });

        occupiedBinIds.push(bin.id);
        usedBlockIds.push(blockId);
        filled++;
      }

      if (inventoryRows.length > 0) {
        await tx.inventory.createMany({ data: inventoryRows });
      }

      if (transactionRows.length > 0) {
        await tx.inventoryTransaction.createMany({ data: transactionRows });
      }

      if (occupiedBinIds.length > 0) {
        await binClient.updateMany({
          where: { id: { in: occupiedBinIds } },
          data: { status: 'Occupied' },
        });
      }

      return filled;
    };

    // Execution Level 1: Fill using existing space
    const initialFilled = await findAndFill(remainingQty);
    remainingQty -= initialFilled;

    // Execution Level 2: Auto-expand if still needed
    if (remainingQty > 0) {
      const receipt = await tx.receipt.findFirst({
        where: { code: referenceCode },
      });
      if (receipt) {
        await this.autoAllocateLayout(tx, receipt.id, warehouseId, actorId);

        // Try filling again after expansion
        const finalFilled = await findAndFill(remainingQty);
        remainingQty -= finalFilled;
      }
    }

    return usedBlockIds;
  }

  private async autoAllocateLayout(
    tx: Prisma.TransactionClient,
    receiptId: string,
    warehouseId: string,
    actorId: string,
  ): Promise<void> {
    const details = await tx.receiptDetail.findMany({
      where: { receipt_id: receiptId, is_deleted: false },
    });

    if (details.length === 0) return;

    let totalExpectedQty = 0;
    for (const detail of details) {
      totalExpectedQty += Number(detail.expected_qty);
    }

    // QUY TẮC MỚI: 1 ô chứa đúng 1 thùng
    const UNIT_PER_BLOCK = 1;
    const blocksNeeded = Math.ceil(totalExpectedQty / UNIT_PER_BLOCK);
    if (blocksNeeded === 0) return;

    // Đếm số ô còn trống thực tế (đã trừ các ô có hàng hoặc đã được gán)
    const totalBlocksCount = await tx.block.count({
      where: {
        shelf: {
          rack: {
            row: { warehouse_id: warehouseId, is_deleted: false },
            is_deleted: false,
          },
          is_deleted: false,
        },
        is_deleted: false,
      },
    });

    // Đếm số Bin bận
    const occupiedBins = Number(
      await (tx as any).bin.count({
        where: {
          warehouse_id: warehouseId,
          status: { in: ['Reserved', 'Occupied'] },
          is_deleted: false,
        },
      }),
    );

    // Đếm số ô có Inventory > 0 (Dành cho các ca đã cũ hoặc không qua Bin)
    const itemsWithStock = await tx.inventory.count({
      where: {
        warehouse_id: warehouseId,
        quantity: { gt: 0 },
        is_deleted: false,
      },
    });

    // Ô trống thực sự = Tổng ô - Max(Bin bận, Ô có hàng)
    const emptyBlocks =
      totalBlocksCount - Math.max(occupiedBins, itemsWithStock);

    if (emptyBlocks >= blocksNeeded) {
      return; // Đã đủ chỗ
    }

    const blocksToGen = blocksNeeded - emptyBlocks;
    const blocksPerShelf = 12; // 12 ô mỗi tầng
    const shelvesPerRack = 3; // 3 tầng mỗi kệ
    const blocksPerRack = blocksPerShelf * shelvesPerRack; // 36 ô/kệ
    const racksNeeded = Math.ceil(blocksToGen / blocksPerRack);

    const lastRow = await tx.row.findFirst({
      where: { warehouse_id: warehouseId, is_deleted: false },
      orderBy: { position_y: 'desc' },
    });

    // Mỗi lần sinh 1 dãy mới cách dãy cũ 3m (Lối đi)
    const nextPositionY =
      lastRow && lastRow.position_y ? Number(lastRow.position_y) + 3 : 2;

    const row = await tx.row.create({
      data: {
        warehouse_id: warehouseId,
        name: `Dãy bổ sung (Phiếu: ${receiptId.slice(-6)})`,
        code: `ROW-EXT-${Date.now().toString().slice(-6)}`,
        description: 'Tự động mở rộng khi nhập hàng',
        is_rented: false,
        position_x: 2,
        position_y: nextPositionY,
        position_rotation: 0,
        total_weight_capacity: 50000,
        is_active: true,
        is_deleted: false,
        created_by: actorId,
      },
    });

    for (let r = 0; r < racksNeeded; r++) {
      const rack = await tx.rack.create({
        data: {
          row_id: row.id,
          name: `Rack-${(r + 1).toString().padStart(2, '0')}`,
          code: `RACK-${Date.now().toString().slice(-4)}-${r}`,
          position_x: 2 + r * 6, // Khoảng cách giữa các kệ trong dãy
          position_y: nextPositionY,
          position_rotation: 0,
          dimensions_width: 12, // Kệ dài 12m cho 12 ô
          dimensions_depth: 1,
          dimensions_height: 3,
          default_block_max_weight_capacity: 1000,
          total_weight_capacity: 36000,
          total_height: 3,
          overload_threshold_percent: 10,
          is_rented: false,
          is_active: true,
          is_deleted: false,
          created_by: actorId,
        },
      });

      for (let s = 0; s < shelvesPerRack; s++) {
        const shelf = await tx.shelf.create({
          data: {
            rack_id: rack.id,
            name: `Level ${s + 1}`,
            code: `LV-${rack.code}-${s + 1}`,
            height: s + 1, // Độ cao tầng
            total_weight_capacity: 12000,
            is_active: true,
            is_deleted: false,
            created_by: actorId,
          },
        });

        for (let b = 0; b < blocksPerShelf; b++) {
          const block = await tx.block.create({
            data: {
              shelf_id: shelf.id,
              name: `Slot ${b + 1}`,
              code: `B-${shelf.code}-${b + 1}`,
              position_x: b * 1, // Xếp ngang 1m mỗi ô
              position_y: 0,
              dimensions_width: 1,
              dimensions_height: 1,
              max_weight_capacity: 1000,
              height: 1,
              is_active: true,
              is_deleted: false,
              created_by: actorId,
            },
          });

          // Quan trọng: Tạo BIN đồng bộ cho AI Slotting với UID duy nhất
          await (tx as any).bin.create({
            data: {
              uid: `BIN-${warehouseId.substring(0, 8)}-${block.code}`,
              warehouse_id: warehouseId,
              zone_type: 'PICKING',
              status: 'Available',
              position_xyz: {
                x:
                  Number(row.position_x || 0) +
                  Number(rack.position_x || 0) +
                  Number(block.position_x || 0),
                y: Number(shelf.height || 0) * 1.2, // Giả sử mỗi tầng cao 1.2m
                z: Number(row.position_y || 0) + r * 1.5, // Giãn cách giữa các kệ
              },
              dimensions: {
                w: 1,
                h: 1,
                d: 1,
              },
            },
          });
        }
      }
    }
  }

  /**
   * Lấy tổng hợp tồn kho theo Warehouse (Dashboard)
   */
  async getInventoryTotal(orgId: string, warehouseId: string) {
    return this.repository.getInventoryTotalByWarehouse(orgId, warehouseId);
  }

  /**
   * Lấy lịch sử giao dịch kho
   */
  async listTransactions(orgId: string, query: QueryTransactionDto) {
    return this.repository.findTransactions(orgId, query);
  }

  async rebalanceWarehouse(
    orgId: string,
    warehouseId: string,
    actorId: string,
    lang: string,
  ) {
    const overloadedItems = await this.prisma.inventory.findMany({
      where: {
        warehouse_id: warehouseId,
        organization_id: orgId,
        quantity: { gt: 1 },
        is_deleted: false,
      },
      include: {
        product: { select: { name: true, sku: true } },
      },
    });

    if (overloadedItems.length === 0) {
      return {
        message:
          lang === 'vi'
            ? 'Không có hàng bị chồng lấp'
            : 'No stacked inventory found',
        movedCount: 0,
      };
    }

    let totalMoved = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const item of overloadedItems) {
        const extraQty =
          (item.quantity as any as Prisma.Decimal).toNumber() - 1;

        // 1. Cập nhật record hiện tại về số lượng 1
        await tx.inventory.update({
          where: { id: item.id },
          data: {
            quantity: 1,
            quantity_on_hand: 1,
            quantity_available: 1,
            updated_at: new Date(),
            updated_by: actorId,
          },
        });

        // 2. Chuyển phần dư N-1 vào các ô mới dùng fillInventory
        const movedBlocks = await this.fillInventory(
          tx,
          orgId,
          warehouseId,
          item.product_id,
          item.batch_id,
          extraQty,
          1, // Conversion rate = 1
          `REB-${Date.now().toString().slice(-6)}`,
          actorId,
          item.product.sku, // Pass SKU for priority slotting
        );

        totalMoved += movedBlocks.length;
      }
    });

    // Xóa cache
    await this.redisService.delByPattern(
      this.cacheKeys.inboundList(orgId, '*'),
    );

    return {
      message:
        lang === 'vi'
          ? `Đã phân bổ lại ${totalMoved} sản phẩm vào các ô riêng biệt`
          : `Successfully redistributed ${totalMoved} items into individual slots`,
      movedCount: totalMoved,
      affectedProducts: Array.from(
        new Set(overloadedItems.map((i) => i.product.name)),
      ),
    };
  }

  async getInboundTemplate(): Promise<Buffer> {
    const columns = [
      { header: 'Mã PO*', key: 'po_code', width: 20 },
      { header: 'Kho nhận*', key: 'warehouse_name', width: 25 },
      { header: 'Mã sản phẩm (SKU)*', key: 'sku', width: 20 },
      { header: 'Số lượng*', key: 'quantity', width: 15 },
      { header: 'Đơn vị*', key: 'unit_name', width: 15 },
      { header: 'Mã lô', key: 'batch_code', width: 15 },
      { header: 'Ngày hết hạn (dd/mm/yyyy)', key: 'expiry_date', width: 20 },
      { header: 'Ghi chú', key: 'note', width: 30 },
    ];

    const data = [
      {
        po_code: 'PO-2026-001',
        warehouse_name: 'Kho Tổng TP.HCM',
        sku: 'AQUA-500ML',
        quantity: 100,
        unit_name: 'Thùng',
        batch_code: 'L01',
        expiry_date: '31/12/2026',
        note: 'Nhập mẫu Aquafina',
      },
    ];

    return this.excelService.createExcelBuffer(
      columns,
      data,
      'Template Nhập Kho',
    );
  }

  async getOutboundTemplate(): Promise<Buffer> {
    const columns = [
      { header: 'Mã SO/Đơn hàng*', key: 'so_code', width: 20 },
      { header: 'Kho xuất*', key: 'warehouse_name', width: 25 },
      { header: 'Mã sản phẩm (SKU)*', key: 'sku', width: 20 },
      { header: 'Số lượng*', key: 'quantity', width: 15 },
      { header: 'Đơn vị*', key: 'unit_name', width: 15 },
      { header: 'Khách hàng', key: 'customer_name', width: 25 },
      { header: 'Địa chỉ giao hàng', key: 'delivery_address', width: 40 },
      { header: 'Ghi chú', key: 'note', width: 30 },
    ];

    const data = [
      {
        so_code: 'SO-2026-001',
        warehouse_name: 'Kho Tổng TP.HCM',
        sku: 'AQUA-500ML',
        quantity: 50,
        unit_name: 'Thùng',
        customer_name: 'Nguyễn Văn A',
        delivery_address: '123 Đường Lê Lợi, Quận 1, TP.HCM',
        note: 'Xuất mẫu cho đại lý',
      },
    ];

    return this.excelService.createExcelBuffer(
      columns,
      data,
      'Template Xuất Kho',
    );
  }
}
