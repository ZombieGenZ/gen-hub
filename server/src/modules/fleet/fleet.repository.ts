import { Injectable } from '@nestjs/common';
import { FleetVehicleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FleetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.FleetVehicleUncheckedCreateInput) {
    return this.prisma.fleetVehicle.create({ data });
  }

  async findAll(params: {
    warehouseId?: string;
    status?: FleetVehicleStatus;
    limit: number;
    offset: number;
  }) {
    const where: Prisma.FleetVehicleWhereInput = {
      is_deleted: false,
      ...(params.warehouseId && { warehouse_id: params.warehouseId }),
      ...(params.status && { status: params.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.fleetVehicle.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: params.limit,
        skip: params.offset,
        include: {
          warehouse: { select: { id: true, name: true, latitude: true, longitude: true } },
          exports: {
            where: { is_deleted: false, status: { not: 'CANCELLED' } },
            select: {
              id: true,
              code: true,
              status: true,
              delivery_address: true,
              required_date: true,
              partner: { select: { id: true, name: true } },
            },
            orderBy: { created_at: 'desc' },
          },
        },
      }),
      this.prisma.fleetVehicle.count({ where }),
    ]);

    return { items, total, hasMore: params.offset + params.limit < total };
  }

  async findById(id: string) {
    return this.prisma.fleetVehicle.findFirst({
      where: { id, is_deleted: false },
      include: {
        warehouse: { select: { id: true, name: true, latitude: true, longitude: true } },
        exports: {
          where: { is_deleted: false, status: { not: 'CANCELLED' } },
          select: {
            id: true,
            code: true,
            status: true,
            delivery_address: true,
            required_date: true,
            partner: { select: { id: true, name: true } },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });
  }

  async findAvailable(warehouseId: string) {
    return this.prisma.fleetVehicle.findMany({
      where: {
        warehouse_id: warehouseId,
        status: FleetVehicleStatus.AVAILABLE,
        is_deleted: false,
        is_active: true,
      },
      orderBy: { name: 'asc' },
      include: {
        exports: {
          where: { is_deleted: false, status: { not: 'CANCELLED' } },
          select: {
            id: true,
            code: true,
            status: true,
            delivery_address: true,
            required_date: true,
            partner: { select: { id: true, name: true } },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });
  }

  async update(id: string, data: Prisma.FleetVehicleUncheckedUpdateInput) {
    return this.prisma.fleetVehicle.update({ where: { id }, data });
  }

  async findAllWarehouses() {
    return this.prisma.warehouse.findMany({
      where: { is_deleted: false, is_active: true },
      select: {
        id: true,
        name: true,
        organization_id: true,
        organization: { select: { name: true } },
      },
      orderBy: [{ name: 'asc' }, { organization_id: 'asc' }],
    });
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.fleetVehicle.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
        is_active: false,
      },
    });
  }
}
