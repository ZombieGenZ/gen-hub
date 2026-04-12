import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IWarehouseTemplateSummary,
  IRowTemplateSummary,
  IAddonSummary,
  IInsuranceSummary,
  IAiContext,
} from './interfaces/ai.interface';

/**
 * Repository lấy dữ liệu từ database để cung cấp context cho Coze AI
 * Dữ liệu bao gồm: Warehouse Templates, Row Templates, Addons, Insurances
 */
@Injectable()
export class AiContextRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách Warehouse Template với thống kê và gifts
   */
  async getWarehouseTemplatesSummary(): Promise<IWarehouseTemplateSummary[]> {
    // Lấy danh sách warehouse templates cơ bản
    const templates = await this.prisma.warehouseTemplate.findMany({
      where: {
        is_active: true,
        is_deleted: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        length: true,
        width: true,
        price_per_month: true,
        address_detail: true,
        is_shared_warehouse: true,
        is_cold_storage: true,
      },
    });

    // Lấy thống kê và data bổ sung cho từng template
    const result: IWarehouseTemplateSummary[] = [];

    for (const t of templates) {
      // Lấy các row IDs của template này
      const rows = await this.prisma.rowTemplate.findMany({
        where: {
          warehouse_template_id: t.id,
          is_active: true,
          is_deleted: false,
        },
        select: { id: true },
      });
      const rowIds = rows.map((r) => r.id);
      const rowCount = rowIds.length;

      // Đếm số lượng racks (qua row IDs)
      let rackCount = 0;
      let shelfCount = 0;
      let blockCount = 0;

      if (rowIds.length > 0) {
        // Lấy rack IDs
        const racks = await this.prisma.rackTemplate.findMany({
          where: {
            row_template_id: { in: rowIds },
            is_active: true,
            is_deleted: false,
          },
          select: { id: true },
        });
        const rackIds = racks.map((r) => r.id);
        rackCount = rackIds.length;

        if (rackIds.length > 0) {
          // Lấy shelf IDs
          const shelves = await this.prisma.shelfTemplate.findMany({
            where: {
              rack_template_id: { in: rackIds },
              is_active: true,
              is_deleted: false,
            },
            select: { id: true },
          });
          const shelfIds = shelves.map((s) => s.id);
          shelfCount = shelfIds.length;

          if (shelfIds.length > 0) {
            // Đếm blocks
            blockCount = await this.prisma.blockTemplate.count({
              where: {
                shelf_template_id: { in: shelfIds },
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      // Lấy addon gifts
      const addonGifts = await this.prisma.warehouseAddonGift.findMany({
        where: {
          warehouse_template_id: t.id,
          is_active: true,
        },
        include: {
          addon: {
            select: { name: true, description: true },
          },
        },
      });

      // Lấy insurance gifts
      const insuranceGifts = await this.prisma.warehouseInsuranceGift.findMany({
        where: {
          warehouse_template_id: t.id,
          is_active: true,
        },
        include: {
          insurance: {
            select: { name: true, description: true },
          },
        },
      });

      // Lấy images
      const images = await this.prisma.warehouseTemplateImage.findMany({
        where: {
          warehouse_template_id: t.id,
          is_active: true,
          is_deleted: false,
        },
        orderBy: { order: 'asc' },
        select: { url: true },
      });

      result.push({
        id: t.id,
        name: t.name,
        description: t.description,
        area: t.length * t.width,
        pricePerMonth: Number(t.price_per_month),
        address: t.address_detail,
        isSharedWarehouse: t.is_shared_warehouse,
        isColdStorage: t.is_cold_storage,
        totalRows: rowCount,
        totalRacks: rackCount,
        totalShelves: shelfCount,
        totalBlocks: blockCount,
        addonGifts: addonGifts.map((g) => ({
          name: g.addon.name,
          description: g.addon.description,
        })),
        insuranceGifts: insuranceGifts.map((g) => ({
          name: g.insurance.name,
          description: g.insurance.description,
        })),
        discountConfigs: [],
        images: images.map((i) => i.url),
      });
    }

    return result;
  }

  /**
   * Lấy danh sách Row Template với thống kê và gifts
   */
  async getRowTemplatesSummary(): Promise<IRowTemplateSummary[]> {
    // Lấy danh sách row templates cơ bản
    const rows = await this.prisma.rowTemplate.findMany({
      where: {
        is_active: true,
        is_deleted: false,
      },
      select: {
        id: true,
        warehouse_template_id: true,
        name: true,
        code: true,
        description: true,
        price_per_month: true,
      },
    });

    const result: IRowTemplateSummary[] = [];

    for (const r of rows) {
      // Lấy rack IDs
      const racks = await this.prisma.rackTemplate.findMany({
        where: {
          row_template_id: r.id,
          is_active: true,
          is_deleted: false,
        },
        select: { id: true },
      });
      const rackIds = racks.map((rack) => rack.id);
      const rackCount = rackIds.length;

      let shelfCount = 0;
      let blockCount = 0;

      if (rackIds.length > 0) {
        // Lấy shelf IDs
        const shelves = await this.prisma.shelfTemplate.findMany({
          where: {
            rack_template_id: { in: rackIds },
            is_active: true,
            is_deleted: false,
          },
          select: { id: true },
        });
        const shelfIds = shelves.map((s) => s.id);
        shelfCount = shelfIds.length;

        if (shelfIds.length > 0) {
          // Đếm blocks
          blockCount = await this.prisma.blockTemplate.count({
            where: {
              shelf_template_id: { in: shelfIds },
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Lấy addon gifts
      const addonGifts = await this.prisma.rowAddonGift.findMany({
        where: {
          row_template_id: r.id,
          is_active: true,
        },
        include: {
          addon: {
            select: { name: true, description: true },
          },
        },
      });

      // Lấy insurance gifts
      const insuranceGifts = await this.prisma.rowInsuranceGift.findMany({
        where: {
          row_template_id: r.id,
          is_active: true,
        },
        include: {
          insurance: {
            select: { name: true, description: true },
          },
        },
      });

      result.push({
        id: r.id,
        warehouseTemplateId: r.warehouse_template_id,
        name: r.name,
        code: r.code,
        description: r.description,
        pricePerMonth: Number(r.price_per_month),
        totalRacks: rackCount,
        totalShelves: shelfCount,
        totalBlocks: blockCount,
        addonGifts: addonGifts.map((g) => ({
          name: g.addon.name,
          description: g.addon.description,
        })),
        insuranceGifts: insuranceGifts.map((g) => ({
          name: g.insurance.name,
          description: g.insurance.description,
        })),
        discountConfigs: [],
      });
    }

    return result;
  }

  /**
   * Lấy danh sách Addon với thông tin loại
   */
  async getAddonsSummary(): Promise<IAddonSummary[]> {
    const addons = await this.prisma.addon.findMany({
      where: {
        is_active: true,
        is_deleted: false,
      },
    });

    return addons.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      price: Number(a.price),
      isMonthlyPayment: a.is_monthly_payment,
      types: [],
    }));
  }

  /**
   * Lấy danh sách Insurance
   */
  async getInsurancesSummary(): Promise<IInsuranceSummary[]> {
    const insurances = await this.prisma.insurance.findMany({
      where: {
        is_active: true,
        is_deleted: false,
      },
    });

    return insurances.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: Number(i.price),
      useManagementFee: i.use_management_fee,
      managementFeeType: i.management_fee_type,
      managementFeeValue: i.management_fee_value
        ? Number(i.management_fee_value)
        : null,
    }));
  }

  /**
   * Lấy toàn bộ context cho AI
   */
  async getFullContext(): Promise<IAiContext> {
    const [warehouseTemplates, rowTemplates, addons, insurances] =
      await Promise.all([
        this.getWarehouseTemplatesSummary(),
        this.getRowTemplatesSummary(),
        this.getAddonsSummary(),
        this.getInsurancesSummary(),
      ]);

    return {
      warehouseTemplates,
      rowTemplates,
      addons,
      insurances,
    };
  }
}
