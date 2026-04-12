import { Injectable } from '@nestjs/common';
import { Prisma, ReceiptStatus, ExportStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryInboundRequestDto, QueryOutboundRequestDto } from './dto';
import {
  IInboundRequest,
  IOutboundRequest,
  IPaginatedResponse,
} from './interfaces';

@Injectable()
export class InventoryRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly inboundDetailSelect = {
    id: true,
    receipt_id: true,
    product_id: true,
    batch_id: true,
    expected_qty: true,
    actual_qty: true,
    unit_id: true,
    conversion_rate: true,
    product: { select: { id: true, name: true, sku: true, image_url: true } },
    batch: { select: { id: true, code: true, expiry_date: true } },
    unit: { select: { id: true, name: true } },
  } satisfies Prisma.ReceiptDetailSelect;

  private readonly inboundBaseSelect = {
    id: true,
    organization_id: true,
    warehouse_id: true,
    partner_id: true,
    code: true,
    purchase_order_code: true,
    status: true,
    notes: true,
    expected_arrival: true,
    vehicle_info: true,
    approved_by: true,
    approved_at: true,
    checker_id: true,
    is_active: true,
    created_at: true,
    updated_at: true,
    created_by: true,
    updated_by: true,
    warehouse: { select: { id: true, name: true } },
    partner: { select: { id: true, name: true, code: true } },
  } satisfies Prisma.ReceiptSelect;

  private readonly outboundDetailSelect = {
    id: true,
    export_id: true,
    product_id: true,
    required_batch_id: true,
    quantity: true,
    unit_id: true,
    conversion_rate: true,
    product: { select: { id: true, name: true, sku: true, image_url: true } },
    batch: { select: { id: true, code: true, expiry_date: true } },
    unit: { select: { id: true, name: true } },
  } satisfies Prisma.ExportDetailSelect;

  private readonly outboundBaseSelect = {
    id: true,
    organization_id: true,
    warehouse_id: true,
    partner_id: true,
    code: true,
    sales_order_code: true,
    status: true,
    notes: true,
    approved_by: true,
    approved_at: true,
    picker_id: true,
    checker_id: true,
    tracking_number: true,
    is_active: true,
    created_at: true,
    updated_at: true,
    created_by: true,
    updated_by: true,
    warehouse: { select: { id: true, name: true } },
    partner: { select: { id: true, name: true, code: true } },
  } satisfies Prisma.ExportSelect;

  /**
   * Tạo phiếu nhập kho
   */
  async createInbound(
    data: Prisma.ReceiptCreateInput,
  ): Promise<IInboundRequest> {
    return this.prisma.receipt.create({
      data,
      include: {
        warehouse: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true, code: true } },
        details: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, image_url: true },
            },
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
  async findInboundById(
    id: string,
    orgId: string,
  ): Promise<IInboundRequest | null> {
    return this.prisma.receipt.findFirst({
      where: {
        id,
        organization_id: orgId,
        is_deleted: false,
      },
      select: {
        ...this.inboundBaseSelect,
        details: {
          where: { is_deleted: false },
          select: this.inboundDetailSelect,
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
        select: {
          ...this.inboundBaseSelect,
          _count: {
            select: {
              details: { where: { is_deleted: false } },
            },
          },
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
   * Danh sách phiếu nhập full detail cho export Excel
   */
  async findInboundForExport(
    orgId: string,
    query: QueryInboundRequestDto,
  ): Promise<IInboundRequest[]> {
    const { warehouse_id, keywords, status } = query;

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

    return this.prisma.receipt.findMany({
      where,
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
      orderBy: { created_at: 'desc' },
    }) as unknown as IInboundRequest[];
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
            product: {
              select: { id: true, name: true, sku: true, image_url: true },
            },
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
  async createOutbound(
    data: Prisma.ExportCreateInput,
  ): Promise<IOutboundRequest> {
    return this.prisma.export.create({
      data,
      include: {
        warehouse: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true, code: true } },
        details: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, image_url: true },
            },
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
  async findOutboundById(
    id: string,
    orgId: string,
  ): Promise<IOutboundRequest | null> {
    return this.prisma.export.findFirst({
      where: {
        id,
        organization_id: orgId,
        is_deleted: false,
      },
      select: {
        ...this.outboundBaseSelect,
        details: {
          where: { is_deleted: false },
          select: this.outboundDetailSelect,
        },
        pick_lists: {
          where: { is_deleted: false },
          select: {
            id: true,
            export_id: true,
            code: true,
            status: true,
            created_at: true,
            details: {
              where: { is_deleted: false },
              select: {
                id: true,
                pick_list_id: true,
                export_detail_id: true,
                product_id: true,
                batch_id: true,
                block_id: true,
                required_qty: true,
                picked_qty: true,
                block: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
                export_detail: {
                  select: {
                    id: true,
                    product: {
                      select: {
                        id: true,
                        name: true,
                        sku: true,
                      },
                    },
                  },
                },
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
        select: {
          ...this.outboundBaseSelect,
          _count: {
            select: {
              details: { where: { is_deleted: false } },
            },
          },
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
   * Danh sách phiếu xuất full detail cho export Excel
   */
  async findOutboundForExport(
    orgId: string,
    query: QueryOutboundRequestDto,
  ): Promise<IOutboundRequest[]> {
    const { warehouse_id, keywords, status } = query;

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

    return this.prisma.export.findMany({
      where,
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
      orderBy: { created_at: 'desc' },
    }) as unknown as IOutboundRequest[];
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
            product: {
              select: { id: true, name: true, sku: true, image_url: true },
            },
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
  async warehouseExistsInOrg(
    warehouseId: string,
    orgId: string,
  ): Promise<boolean> {
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
   * Kiểm tra warehouse có hợp đồng thuê ACTIVE (chưa hết hạn)
   */
  async warehouseHasActiveContract(
    warehouseId: string,
    orgId: string,
  ): Promise<boolean> {
    const activeStatuses = [
      'ACTIVE',
      'OVERDUE_LEVEL_1',
      'OVERDUE_LEVEL_2',
      'OVERDUE_LEVEL_3',
    ];
    const count = await this.prisma.rentalContractDetail.count({
      where: {
        warehouse_id: warehouseId,
        is_deleted: false,
        rental_contract: {
          organization_id: orgId,
          is_deleted: false,
          status: { in: activeStatuses as any },
        },
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
      where: {
        id: partnerId,
        organization_id: orgId,
        is_deleted: false,
        is_active: true,
      },
    });
    return count > 0;
  }

  /**
   * Kiểm tra unit thuộc org
   */
  async unitExistsInOrg(unitId: string, orgId: string): Promise<boolean> {
    const count = await this.prisma.unit.count({
      where: {
        id: unitId,
        organization_id: orgId,
        is_deleted: false,
        is_active: true,
      },
    });
    return count > 0;
  }

  /**
   * Kiểm tra batch thuộc product
   */
  async batchExistsForProduct(
    batchId: string,
    productId: string,
  ): Promise<boolean> {
    const count = await this.prisma.batch.count({
      where: { id: batchId, product_id: productId, is_deleted: false },
    });
    return count > 0;
  }

  /**
   * Lấy danh sách kho mà tổ chức có quyền sử dụng (có hợp đồng thuê)
   */
  async listOrgWarehouses(
    orgId: string,
  ): Promise<{ id: string; name: string }[]> {
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

  /**
   * Lấy tổng hợp tồn kho theo Warehouse (Dashboard)
   */
  async getInventoryTotalByWarehouse(orgId: string, warehouseId: string) {
    const stats = await this.prisma.inventory.aggregate({
      where: {
        organization_id: orgId,
        warehouse_id: warehouseId,
        is_deleted: false,
      },
      _sum: {
        quantity: true,
        quantity_available: true,
        quantity_allocated: true,
      },
    });

    return {
      total_on_hand: Number(stats._sum.quantity || 0),
      total_available: Number(stats._sum.quantity_available || 0),
      total_allocated: Number(stats._sum.quantity_allocated || 0),
    };
  }

  /**
   * Lấy danh sách lịch sử giao dịch kho (InventoryTransaction)
   */
  async findTransactions(orgId: string, query: any) {
    const { warehouse_id, keywords, type, limit = 10, offset = 0 } = query;

    const where: Prisma.InventoryTransactionWhereInput = {
      organization_id: orgId,
      is_deleted: false,
      ...(warehouse_id && { warehouse_id }),
      ...(type && { type }),
      ...(keywords && {
        OR: [
          { product: { name: { contains: keywords, mode: 'insensitive' } } },
          { product: { sku: { contains: keywords, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          from_block: { select: { id: true, code: true } },
          to_block: { select: { id: true, code: true } },
          warehouse: { select: { id: true, name: true } },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }
}
