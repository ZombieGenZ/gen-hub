import { Injectable } from '@nestjs/common';
import { Prisma, ConsultationRequest } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConsultationRequestRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.ConsultationRequestUncheckedCreateInput): Promise<ConsultationRequest> {
        return this.prisma.consultationRequest.create({
            data,
            include: {
                warehouse_template: true,
                assigned_staff: true,
            },
        });
    }

    async findAll(query: any) {
        const {
            page = 1,
            limit = 10,
            search,
            status,
            source,
            assigned_to,
            createdBy,
            sort_by = 'created_at',
            sort_order = 'desc',
        } = query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: Prisma.ConsultationRequestWhereInput = {
            is_deleted: false,
            ...(createdBy && { created_by: createdBy }),
            ...(status && { status }),
            ...(source && { source }),
            ...(assigned_to && { assigned_to }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    { code: { contains: search, mode: 'insensitive' } },
                    { subject: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.consultationRequest.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { [sort_by]: sort_order },
                include: {
                    warehouse_template: true,
                    assigned_staff: true,
                },
            }),
            this.prisma.consultationRequest.count({ where }),
        ]);

        return {
            items,
            total,
            limit: Number(limit),
            offset: skip,
            hasMore: skip + Number(limit) < total,
        };
    }

    async findById(id: string): Promise<ConsultationRequest | null> {
        return this.prisma.consultationRequest.findFirst({
            where: { id, is_deleted: false },
            include: {
                warehouse_template: true,
                assigned_staff: true,
            },
        });
    }

    async update(id: string, data: Prisma.ConsultationRequestUncheckedUpdateInput): Promise<ConsultationRequest> {
        return this.prisma.consultationRequest.update({
            where: { id },
            data,
            include: {
                warehouse_template: true,
                assigned_staff: true,
            },
        });
    }

    async softDelete(id: string, userId: string): Promise<void> {
        await this.prisma.consultationRequest.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });
    }
}
