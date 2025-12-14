import { Injectable } from '@nestjs/common';
import { Prisma, ContractStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryRentalContractDto } from './dto';
import { IRentalContractWithRelations, IPaginatedResponse } from './interfaces';

/**
 * Repository xử lý database operations cho RentalContract
 */
@Injectable()
export class RentalContractRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paginationConfig: PaginationConfigService,
    ) { }

    private readonly fullInclude = {
        organization: {
            select: {
                id: true,
                name: true,
            },
        },
        details: {
            where: { is_deleted: false },
            include: {
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                row: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        },
    };

    private readonly listInclude = {
        organization: {
            select: {
                id: true,
                name: true,
            },
        },
        _count: {
            select: {
                details: { where: { is_deleted: false } },
            },
        },
    };

    async create(data: Prisma.RentalContractCreateInput): Promise<IRentalContractWithRelations> {
        return this.prisma.rentalContract.create({
            data,
            include: this.fullInclude,
        }) as unknown as IRentalContractWithRelations;
    }

    async createWithDetails(
        contractData: Prisma.RentalContractCreateInput,
        detailsData: Prisma.RentalContractDetailCreateManyInput[],
    ): Promise<IRentalContractWithRelations> {
        return this.prisma.$transaction(async (tx) => {
            const contract = await tx.rentalContract.create({
                data: contractData,
            });

            if (detailsData.length > 0) {
                await tx.rentalContractDetail.createMany({
                    data: detailsData.map(d => ({
                        ...d,
                        rental_contract_id: contract.id,
                    })),
                });
            }

            return tx.rentalContract.findUnique({
                where: { id: contract.id },
                include: this.fullInclude,
            }) as unknown as IRentalContractWithRelations;
        });
    }

    async findById(id: string): Promise<IRentalContractWithRelations | null> {
        return this.prisma.rentalContract.findFirst({
            where: { id, is_deleted: false },
            include: this.fullInclude,
        }) as unknown as IRentalContractWithRelations | null;
    }

    async findByCode(code: string): Promise<IRentalContractWithRelations | null> {
        return this.prisma.rentalContract.findFirst({
            where: { code, is_deleted: false },
            include: this.fullInclude,
        }) as unknown as IRentalContractWithRelations | null;
    }

    async findMany(
        query: QueryRentalContractDto,
    ): Promise<IPaginatedResponse<IRentalContractWithRelations>> {
        const limit = this.paginationConfig.getLimit(query.limit);
        const offset = this.paginationConfig.getOffset(query.offset);
        const { keywords, status, organization_id } = query;

        const where: Prisma.RentalContractWhereInput = {
            is_deleted: false,
            ...(status && { status }),
            ...(organization_id && { organization_id }),
            ...(keywords && {
                OR: [
                    { code: { contains: keywords, mode: 'insensitive' } },
                    { name: { contains: keywords, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.rentalContract.findMany({
                where,
                include: this.listInclude,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.rentalContract.count({ where }),
        ]);

        return {
            items: items as unknown as IRentalContractWithRelations[],
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    async update(id: string, data: Prisma.RentalContractUpdateInput): Promise<IRentalContractWithRelations> {
        return this.prisma.rentalContract.update({
            where: { id },
            data,
            include: this.fullInclude,
        }) as unknown as IRentalContractWithRelations;
    }

    async updateStatus(id: string, status: ContractStatus, userId: string): Promise<IRentalContractWithRelations> {
        return this.prisma.rentalContract.update({
            where: { id },
            data: {
                status,
                updated_by: userId,
            },
            include: this.fullInclude,
        }) as unknown as IRentalContractWithRelations;
    }

    async softDelete(id: string, deletedBy: string): Promise<IRentalContractWithRelations> {
        return this.prisma.rentalContract.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
                status: ContractStatus.CANCELLED,
            },
            include: this.fullInclude,
        }) as unknown as IRentalContractWithRelations;
    }

    /**
     * Đếm số hợp đồng PENDING của user trong organization
     */
    async countPendingByUser(userId: string): Promise<number> {
        return this.prisma.rentalContract.count({
            where: {
                created_by: userId,
                status: ContractStatus.PENDING,
                is_deleted: false,
            },
        });
    }

    /**
     * Lấy danh sách hợp đồng sắp hết hạn
     */
    async findExpiringContracts(daysBeforeExpiry: number): Promise<IRentalContractWithRelations[]> {
        const now = new Date();
        const expiryDate = new Date(now.getTime() + daysBeforeExpiry * 24 * 60 * 60 * 1000);

        return this.prisma.rentalContract.findMany({
            where: {
                status: ContractStatus.ACTIVE,
                is_deleted: false,
                expired_at: {
                    gte: now,
                    lte: expiryDate,
                },
            },
            include: this.fullInclude,
        }) as unknown as IRentalContractWithRelations[];
    }

    /**
     * Lấy danh sách hợp đồng quá hạn
     */
    async findOverdueContracts(): Promise<IRentalContractWithRelations[]> {
        return this.prisma.rentalContract.findMany({
            where: {
                status: ContractStatus.ACTIVE,
                is_deleted: false,
                expired_at: {
                    lt: new Date(),
                },
            },
            include: this.fullInclude,
        }) as unknown as IRentalContractWithRelations[];
    }

    /**
     * Cập nhật overdue status cho nhiều contracts
     */
    async updateOverdueStatus(
        ids: string[],
        status: ContractStatus,
        overdueData: Partial<{
            overdue_level_1_at: Date;
            overdue_level_2_at: Date;
            overdue_level_3_at: Date;
            is_sealed: boolean;
            is_liquidated: boolean;
        }>,
    ): Promise<void> {
        await this.prisma.rentalContract.updateMany({
            where: { id: { in: ids } },
            data: {
                status,
                ...overdueData,
            },
        });
    }

    async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }
}
