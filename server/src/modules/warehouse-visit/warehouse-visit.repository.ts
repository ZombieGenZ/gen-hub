import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WarehouseVisitBooking, Prisma } from '@prisma/client';
import { IPaginatedResponse } from '../../common/interfaces/pagination.interface';

@Injectable()
export class WarehouseVisitRepository {
    constructor(private readonly prisma: PrismaService) { }

    async createBooking(data: Prisma.WarehouseVisitBookingCreateInput | Prisma.WarehouseVisitBookingUncheckedCreateInput): Promise<WarehouseVisitBooking> {
        return this.prisma.warehouseVisitBooking.create({
            data,
            include: {
                warehouse_template: true,
                organization: true,
            },
        });
    }

    async findAllBookings(query: any): Promise<IPaginatedResponse<WarehouseVisitBooking>> {
        const { page = 1, limit = 10, search, status, warehouse_template_id, organization_id, sort_by = 'created_at', sort_order = 'desc' } = query;
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

    async updateBooking(id: string, data: Prisma.WarehouseVisitBookingUpdateInput): Promise<WarehouseVisitBooking> {
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

    async countBookings(where: Prisma.WarehouseVisitBookingWhereInput): Promise<number> {
        return this.prisma.warehouseVisitBooking.count({ where });
    }
}
