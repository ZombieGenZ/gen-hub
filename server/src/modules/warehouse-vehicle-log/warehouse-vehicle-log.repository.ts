import { Injectable } from '@nestjs/common';
import { Prisma, VehicleLogStatus, ReceiptStatus, ExportStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehicleLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.VehicleLogUncheckedCreateInput) {
    return this.prisma.vehicleLog.create({ data });
  }

  async findAll(params: {
    warehouseTemplateId?: string;
    licensePlate?: string;
    status?: VehicleLogStatus;
    purpose?: string;
    date?: string;
    limit: number;
    offset: number;
  }) {
    const where: Prisma.VehicleLogWhereInput = {
      is_deleted: false,
      ...(params.warehouseTemplateId && { warehouse_template_id: params.warehouseTemplateId }),
      ...(params.licensePlate && { license_plate: { contains: params.licensePlate, mode: 'insensitive' } }),
      ...(params.status && { status: params.status }),
      ...(params.purpose && { purpose: params.purpose as Prisma.EnumVehiclePurposeFilter }),
      ...(params.date && {
        entry_time: {
          gte: new Date(`${params.date}T00:00:00.000Z`),
          lte: new Date(`${params.date}T23:59:59.999Z`),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.vehicleLog.findMany({
        where,
        orderBy: { entry_time: 'desc' },
        take: params.limit,
        skip: params.offset,
        include: {
          warehouse_template: { select: { id: true, name: true } },
        },
      }),
      this.prisma.vehicleLog.count({ where }),
    ]);

    return { items, total, hasMore: params.offset + params.limit < total };
  }

  async findById(id: string) {
    return this.prisma.vehicleLog.findFirst({
      where: { id, is_deleted: false },
      include: {
        warehouse_template: { select: { id: true, name: true } },
      },
    });
  }

  async findActive(warehouseTemplateId?: string) {
    return this.prisma.vehicleLog.findMany({
      where: {
        status: VehicleLogStatus.INSIDE,
        is_deleted: false,
        ...(warehouseTemplateId && { warehouse_template_id: warehouseTemplateId }),
      },
      orderBy: { entry_time: 'asc' },
      include: {
        warehouse_template: { select: { id: true, name: true } },
      },
    });
  }

  async exit(id: string, updatedBy: string) {
    return this.prisma.vehicleLog.update({
      where: { id },
      data: {
        exit_time: new Date(),
        status: VehicleLogStatus.EXITED,
        updated_by: updatedBy,
        updated_at: new Date(),
      },
    });
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.vehicleLog.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date(), deleted_by: deletedBy, is_active: false },
    });
  }

  async lookupByLicensePlate(licensePlate: string, warehouseTemplateId: string) {
    // Resolve warehouse IDs for this physical warehouse template
    const warehouses = await this.prisma.warehouse.findMany({
      where: { warehouse_template_id: warehouseTemplateId, is_deleted: false },
      select: { id: true },
    });
    const warehouseIds = warehouses.map((w) => w.id);

    const [activeLog, pendingReceipts, pendingExports] = await Promise.all([
      this.prisma.vehicleLog.findFirst({
        where: { license_plate: licensePlate, status: VehicleLogStatus.INSIDE, is_deleted: false },
      }),
      this.prisma.receipt.findMany({
        where: {
          ...(warehouseIds.length > 0 && { warehouse_id: { in: warehouseIds } }),
          status: { in: [ReceiptStatus.PENDING, ReceiptStatus.APPROVED] },
          is_deleted: false,
        },
        take: 5,
        select: { id: true, code: true, status: true, warehouse_id: true, partner_id: true },
      }),
      this.prisma.export.findMany({
        where: {
          ...(warehouseIds.length > 0 && { warehouse_id: { in: warehouseIds } }),
          status: { in: [ExportStatus.PENDING, ExportStatus.PICKING] },
          is_deleted: false,
        },
        take: 5,
        select: { id: true, code: true, status: true, warehouse_id: true },
      }),
    ]);

    return { active_log: activeLog, pending_receipts: pendingReceipts, pending_exports: pendingExports };
  }

  async findActiveByPlate(licensePlate: string, warehouseTemplateId: string) {
    return this.prisma.vehicleLog.findFirst({
      where: {
        license_plate: licensePlate,
        warehouse_template_id: warehouseTemplateId,
        status: VehicleLogStatus.INSIDE,
        is_deleted: false,
      },
    });
  }

  async countInsideToday(warehouseTemplateId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.vehicleLog.count({
      where: {
        status: VehicleLogStatus.INSIDE,
        is_deleted: false,
        entry_time: { gte: today },
        ...(warehouseTemplateId && { warehouse_template_id: warehouseTemplateId }),
      },
    });
  }
}
