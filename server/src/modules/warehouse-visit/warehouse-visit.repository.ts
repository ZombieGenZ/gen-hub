import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WarehouseVisitBooking, Prisma } from '@prisma/client';
import { IPaginatedResponse } from '../../common/interfaces/pagination.interface';

@Injectable()
export class WarehouseVisitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createBooking(
    data:
      | Prisma.WarehouseVisitBookingCreateInput
      | Prisma.WarehouseVisitBookingUncheckedCreateInput,
  ): Promise<WarehouseVisitBooking> {
    return this.prisma.warehouseVisitBooking.create({
      data,
      include: {
        warehouse_template: true,
        organization: true,
      },
    });
  }

  async findAllBookings(
    query: any,
  ): Promise<IPaginatedResponse<WarehouseVisitBooking>> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      warehouse_template_id,
      organization_id,
      sort_by = 'created_at',
      sort_order = 'desc',
      date,
      start_date,
      end_date,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.WarehouseVisitBookingWhereInput = {
      is_deleted: false,
      ...(search && {
        OR: [
          { visitor_name: { contains: search, mode: 'insensitive' } },
          { visitor_email: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(warehouse_template_id && { warehouse_template_id }),
      ...(organization_id && { organization_id }),
    };

    if (date) {
      const startDate = new Date(date);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setUTCHours(23, 59, 59, 999);
      where.visit_date = { gte: startDate, lte: endDate };
    } else if (start_date || end_date) {
      where.visit_date = {};
      if (start_date) where.visit_date.gte = new Date(start_date);
      if (end_date) where.visit_date.lte = new Date(end_date);
    }

    const [data, total] = await Promise.all([
      this.prisma.warehouseVisitBooking.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sort_by]: sort_order },
        include: {
          warehouse_template: true,
          organization: true,
        },
      }),
      this.prisma.warehouseVisitBooking.count({ where }),
    ]);

    return {
      items: data,
      total,
      limit: Number(limit),
      offset: skip,
      hasMore: skip + Number(limit) < total,
    };
  }

  async findBookingById(id: string): Promise<WarehouseVisitBooking | null> {
    return this.prisma.warehouseVisitBooking.findUnique({
      where: { id, is_deleted: false },
      include: {
        warehouse_template: true,
        organization: true,
        rescheduled_from: true,
        rescheduled_to: true,
      },
    });
  }

  async updateBooking(
    id: string,
    data: Prisma.WarehouseVisitBookingUpdateInput,
  ): Promise<WarehouseVisitBooking> {
    return this.prisma.warehouseVisitBooking.update({
      where: { id },
      data,
      include: {
        warehouse_template: true,
        organization: true,
      },
    });
  }

  async softDeleteBooking(id: string, userId: string): Promise<void> {
    await this.prisma.warehouseVisitBooking.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  async countBookings(
    where: Prisma.WarehouseVisitBookingWhereInput,
  ): Promise<number> {
    return this.prisma.warehouseVisitBooking.count({ where });
  }
}
