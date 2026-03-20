import { Injectable } from '@nestjs/common';
import { Prisma, RefundStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryRefundRequestDto } from './dto';
import { IRefundRequestWithRelations, IPaginatedRefundRequestResponse } from './interfaces';

/**
 * Repository xử lý data access cho RefundRequest
 */
@Injectable()
export class RefundRequestRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Tìm danh sách RefundRequest với pagination và filters
     */
    async findMany(query: QueryRefundRequestDto): Promise<IPaginatedRefundRequestResponse> {
        const limit = query.limit || 10;
        const offset = query.offset || 0;

        const where: Prisma.RefundRequestWhereInput = {
            is_deleted: false,
        };

        if (query.organization_id) {
            where.organization_id = query.organization_id;
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.keywords) {
            where.OR = [
                { reason: { contains: query.keywords, mode: 'insensitive' } },
                { process_notes: { contains: query.keywords, mode: 'insensitive' } },
                {
                    rental_contract: {
                        code: { contains: query.keywords, mode: 'insensitive' },
                    },
                },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.refundRequest.findMany({
                where,
                include: {
                    rental_contract: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            status: true,
                            organization_id: true,
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.refundRequest.count({ where }),
        ]);

        return {
            items: items as IRefundRequestWithRelations[],
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    /**
     * Tìm RefundRequest theo ID
     */
    async findById(id: string): Promise<IRefundRequestWithRelations | null> {
        const result = await this.prisma.refundRequest.findFirst({
            where: { id, is_deleted: false },
            include: {
                rental_contract: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        status: true,
                        organization_id: true,
                    },
                },
            },
        });

        return result as IRefundRequestWithRelations | null;
    }

    /**
     * Tạo mới RefundRequest
     */
    async create(data: Prisma.RefundRequestUncheckedCreateInput): Promise<IRefundRequestWithRelations> {
        const result = await this.prisma.refundRequest.create({
            data,
            include: {
                rental_contract: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        status: true,
                        organization_id: true,
                    },
                },
            },
        });

        return result as IRefundRequestWithRelations;
    }

    /**
     * Cập nhật trạng thái RefundRequest
     */
    async updateStatus(
        id: string,
        status: RefundStatus,
        processedBy: string,
        processNotes?: string,
        calculationData?: {
            fee_percent: number;
            fee_amount: number;
            final_refund_amount: number;
        }
    ): Promise<IRefundRequestWithRelations> {
        const data: Prisma.RefundRequestUpdateInput = {
            status,
            processed_by: processedBy,
            processed_at: new Date(),
            process_notes: processNotes,
            updated_at: new Date(),
        };

        if (calculationData) {
            data.fee_percent = calculationData.fee_percent;
            data.fee_amount = calculationData.fee_amount;
            data.final_refund_amount = calculationData.final_refund_amount;
        }

        const result = await this.prisma.refundRequest.update({
            where: { id },
            data,
            include: {
                rental_contract: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        status: true,
                        organization_id: true,
                    },
                },
            },
        });

        return result as IRefundRequestWithRelations;
    }

    /**
     * Soft delete RefundRequest
     */
    async softDelete(id: string, deletedBy: string): Promise<void> {
        await this.prisma.refundRequest.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                is_active: false,
            },
        });
    }

    /**
     * Tìm danh sách theo organization
     */
    async findByOrganization(
        organizationId: string,
        query: QueryRefundRequestDto,
    ): Promise<IPaginatedRefundRequestResponse> {
        return this.findMany({
            ...query,
            organization_id: organizationId,
        });
    }
}
