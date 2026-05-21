import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransactionType } from '@prisma/client';

@Injectable()
export class InventoryAlertRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllConfigs(organizationId: string, warehouseId?: string) {
    return this.prisma.inventoryAlertConfig.findMany({
      where: {
        organization_id: organizationId,
        ...(warehouseId && { warehouse_id: warehouseId }),
        is_deleted: false,
        is_active: true,
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });
  }

  async findConfig(organizationId: string, warehouseId: string, productId: string) {
    return this.prisma.inventoryAlertConfig.findUnique({
      where: {
        organization_id_warehouse_id_product_id: {
          organization_id: organizationId,
          warehouse_id: warehouseId,
          product_id: productId,
        },
      },
    });
  }

  async upsertConfig(data: Prisma.InventoryAlertConfigUncheckedCreateInput) {
    return this.prisma.inventoryAlertConfig.upsert({
      where: {
        organization_id_warehouse_id_product_id: {
          organization_id: data.organization_id,
          warehouse_id: data.warehouse_id,
          product_id: data.product_id,
        },
      },
      create: data,
      update: {
        min_quantity: data.min_quantity,
        reorder_point: data.reorder_point,
        lead_time_days: data.lead_time_days,
        is_active: data.is_active,
        updated_by: data.updated_by,
        updated_at: new Date(),
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
      },
    });
  }

  async deleteConfig(id: string, deletedBy: string) {
    return this.prisma.inventoryAlertConfig.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date(), deleted_by: deletedBy, is_active: false },
    });
  }

  async findActiveAlerts(organizationId: string, warehouseId?: string, isResolved?: boolean) {
    return this.prisma.inventoryAlert.findMany({
      where: {
        organization_id: organizationId,
        ...(warehouseId && { warehouse_id: warehouseId }),
        ...(isResolved !== undefined && { is_resolved: isResolved }),
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { days_until_stockout: 'asc' },
    });
  }

  async upsertAlert(data: Prisma.InventoryAlertUncheckedCreateInput) {
    const existing = await this.prisma.inventoryAlert.findFirst({
      where: {
        organization_id: data.organization_id,
        warehouse_id: data.warehouse_id,
        product_id: data.product_id,
        is_resolved: false,
      },
    });

    if (existing) {
      return this.prisma.inventoryAlert.update({
        where: { id: existing.id },
        data: {
          current_quantity: data.current_quantity,
          avg_daily_outbound: data.avg_daily_outbound,
          days_until_stockout: data.days_until_stockout,
          ai_prediction: data.ai_prediction,
          ai_suggestion: data.ai_suggestion,
          updated_at: new Date(),
        },
      });
    }

    return this.prisma.inventoryAlert.create({ data });
  }

  async resolveAlert(alertId: string, resolvedBy: string) {
    return this.prisma.inventoryAlert.update({
      where: { id: alertId },
      data: { is_resolved: true, resolved_at: new Date(), resolved_by: resolvedBy },
    });
  }

  async markNotified(alertId: string) {
    return this.prisma.inventoryAlert.update({
      where: { id: alertId },
      data: {
        notified_at: new Date(),
        notification_sent_count: { increment: 1 },
      },
    });
  }

  async getInventoryStockData(organizationId: string, warehouseId: string, productId: string) {
    return this.prisma.inventory.aggregate({
      where: {
        organization_id: organizationId,
        warehouse_id: warehouseId,
        product_id: productId,
        is_deleted: false,
      },
      _sum: { quantity_available: true },
    });
  }

  async getOutboundVelocity(organizationId: string, warehouseId: string, productId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const result = await this.prisma.inventoryTransaction.aggregate({
      where: {
        organization_id: organizationId,
        warehouse_id: warehouseId,
        product_id: productId,
        type: TransactionType.OUTBOUND,
        created_at: { gte: since },
      },
      _sum: { quantity: true },
    });

    const total = Number(result._sum.quantity ?? 0);
    return total / days;
  }

  async countUnresolved(organizationId: string) {
    return this.prisma.inventoryAlert.count({
      where: { organization_id: organizationId, is_resolved: false },
    });
  }

  async getWarehouseManagerEmails(warehouseId: string): Promise<string[]> {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { warehouse_template_id: true },
    });
    if (!warehouse) return [];

    const managers = await this.prisma.warehouseTemplateManager.findMany({
      where: {
        warehouse_template_id: warehouse.warehouse_template_id,
        is_deleted: false,
        is_active: true,
      },
      include: { user: { select: { email: true } } },
    });

    return managers
      .map((m) => m.user.email)
      .filter((e): e is string => !!e);
  }

  async getProductName(productId: string): Promise<string> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, sku: true },
    });
    return product ? `${product.name} (${product.sku ?? productId})` : productId;
  }

  async getWarehouseName(warehouseId: string): Promise<string> {
    const wh = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { name: true },
    });
    return wh?.name ?? warehouseId;
  }
}
