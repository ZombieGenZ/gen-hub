import { Injectable } from '@nestjs/common';
import { DockScheduleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DockScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DockScheduleUncheckedCreateInput) {
    return this.prisma.dockSchedule.create({ data });
  }

  async findAll(params: {
    warehouseTemplateId?: string;
    organizationId?: string;
    date?: string;
    dockNumber?: number;
    status?: DockScheduleStatus;
    licensePlate?: string;
    limit: number;
    offset: number;
  }) {
    const where: Prisma.DockScheduleWhereInput = {
      is_deleted: false,
      ...(params.warehouseTemplateId && { warehouse_template_id: params.warehouseTemplateId }),
      ...(params.organizationId && { organization_id: params.organizationId }),
      ...(params.dockNumber && { dock_number: params.dockNumber }),
      ...(params.status && { status: params.status }),
      ...(params.licensePlate && {
        license_plate: { contains: params.licensePlate, mode: 'insensitive' as const },
      }),
      ...(params.date && {
        scheduled_date: new Date(params.date),
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.dockSchedule.findMany({
        where,
        orderBy: [{ scheduled_date: 'asc' }, { scheduled_time_start: 'asc' }],
        take: params.limit,
        skip: params.offset,
        include: {
          warehouse_template: { select: { id: true, name: true, dock_count: true } },
          organization: { select: { id: true, name: true } },
        },
      }),
      this.prisma.dockSchedule.count({ where }),
    ]);

    return { items, total, hasMore: params.offset + params.limit < total };
  }

  async findById(id: string) {
    return this.prisma.dockSchedule.findFirst({
      where: { id, is_deleted: false },
      include: {
        warehouse_template: { select: { id: true, name: true, dock_count: true } },
        organization: { select: { id: true, name: true } },
      },
    });
  }

  async findSlotsByDate(warehouseTemplateId: string, date: string) {
    return this.prisma.dockSchedule.findMany({
      where: {
        warehouse_template_id: warehouseTemplateId,
        scheduled_date: new Date(date),
        status: { in: [DockScheduleStatus.CONFIRMED, DockScheduleStatus.ARRIVED, DockScheduleStatus.PENDING] },
        is_deleted: false,
      },
      orderBy: [{ dock_number: 'asc' }, { scheduled_time_start: 'asc' }],
      include: {
        warehouse_template: { select: { id: true, name: true, dock_count: true } },
        organization: { select: { id: true, name: true } },
      },
    });
  }

  async findConflict(params: {
    warehouseTemplateId: string;
    dockNumber: number;
    date: string;
    timeStart: string;
    timeEnd: string;
    excludeId?: string;
  }) {
    return this.prisma.dockSchedule.findFirst({
      where: {
        warehouse_template_id: params.warehouseTemplateId,
        dock_number: params.dockNumber,
        scheduled_date: new Date(params.date),
        status: { in: [DockScheduleStatus.CONFIRMED, DockScheduleStatus.ARRIVED] },
        is_deleted: false,
        AND: [
          { scheduled_time_start: { lt: params.timeEnd } },
          { scheduled_time_end: { gt: params.timeStart } },
        ],
        ...(params.excludeId && { id: { not: params.excludeId } }),
      },
    });
  }

  async findConfirmedByPlateAndDate(licensePlate: string, warehouseTemplateId: string, date: string) {
    return this.prisma.dockSchedule.findFirst({
      where: {
        license_plate: licensePlate,
        warehouse_template_id: warehouseTemplateId,
        scheduled_date: new Date(date),
        status: DockScheduleStatus.CONFIRMED,
        is_deleted: false,
      },
    });
  }

  async update(id: string, data: Prisma.DockScheduleUpdateInput) {
    return this.prisma.dockSchedule.update({ where: { id }, data });
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.dockSchedule.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date(), deleted_by: deletedBy, is_active: false },
    });
  }
}
