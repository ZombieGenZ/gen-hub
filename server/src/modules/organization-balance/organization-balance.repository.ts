import { Injectable } from '@nestjs/common';
import { Prisma, BalanceTransactionType, BalanceReferenceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IOrganizationBalance, IOrganizationBalanceTransaction, IPaginatedResponse } from './interfaces';
import { QueryBalanceTransactionDto } from './dto';

@Injectable()
export class OrganizationBalanceRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lấy hoặc tạo OrganizationBalance cho organization
     */
    async getOrCreateByOrganizationId(organizationId: string): Promise<IOrganizationBalance> {
        let balance = await this.prisma.organizationBalance.findUnique({
            where: { organization_id: organizationId },
            include: {
                organization: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!balance) {
            balance = await this.prisma.organizationBalance.create({
                data: {
                    organization_id: organizationId,
                    balance: 0,
                    total_deposited: 0,
                    total_spent: 0,
                    total_refunded: 0,
                },
                include: {
                    organization: {
                        select: { id: true, name: true },
                    },
                },
            });
        }

        return this.toInterface(balance);
    }

    /**
     * Lấy OrganizationBalance theo organization ID
     */
    async findByOrganizationId(organizationId: string): Promise<IOrganizationBalance | null> {
        const balance = await this.prisma.organizationBalance.findUnique({
            where: { organization_id: organizationId },
            include: {
                organization: {
                    select: { id: true, name: true },
                },
            },
        });

        return balance ? this.toInterface(balance) : null;
    }

    /**
     * Lấy OrganizationBalance theo ID
     */
    async findById(id: string): Promise<IOrganizationBalance | null> {
        const balance = await this.prisma.organizationBalance.findUnique({
            where: { id },
            include: {
                organization: {
                    select: { id: true, name: true },
                },
            },
        });

        return balance ? this.toInterface(balance) : null;
    }

    /**
     * Lấy danh sách tất cả OrganizationBalances (Admin)
     */
    async findAll(query: {
        limit?: number;
        offset?: number;
        keywords?: string;
    }): Promise<IPaginatedResponse<IOrganizationBalance>> {
        const { limit = 20, offset = 0, keywords } = query;

        const where: Prisma.OrganizationBalanceWhereInput = {
            is_deleted: false,
        };

        if (keywords) {
            where.organization = {
                OR: [
                    { name: { contains: keywords, mode: 'insensitive' } },
                ],
            };
        }

        const [items, total] = await Promise.all([
            this.prisma.organizationBalance.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' },
                include: {
                    organization: {
                        select: { id: true, name: true },
                    },
                },
            }),
            this.prisma.organizationBalance.count({ where }),
        ]);

        return {
            items: items.map((item) => this.toInterface(item)),
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    /**
     * Cập nhật số dư và tạo transaction
     */
    async updateBalance(
        organizationId: string,
        type: BalanceTransactionType,
        amount: number,
        performedByUserId: string | null,
        options: {
            referenceType?: BalanceReferenceType;
            referenceId?: string;
            description?: string;
            notes?: string;
            metadata?: Record<string, unknown>;
        } = {},
    ): Promise<{ balance: IOrganizationBalance; transaction: IOrganizationBalanceTransaction }> {
        return this.prisma.$transaction(async (tx) => {
            // Lấy hoặc tạo balance
            let organizationBalance = await tx.organizationBalance.findUnique({
                where: { organization_id: organizationId },
            });

            if (!organizationBalance) {
                organizationBalance = await tx.organizationBalance.create({
                    data: {
                        organization_id: organizationId,
                        balance: 0,
                        total_deposited: 0,
                        total_spent: 0,
                        total_refunded: 0,
                    },
                });
            }

            const balanceBefore = Number(organizationBalance.balance);
            let balanceChange = amount;
            let newTotalDeposited = Number(organizationBalance.total_deposited);
            let newTotalSpent = Number(organizationBalance.total_spent);
            let newTotalRefunded = Number(organizationBalance.total_refunded);

            // Tính toán thay đổi dựa trên loại giao dịch
            switch (type) {
                case 'DEPOSIT':
                case 'BONUS':
                    newTotalDeposited += amount;
                    break;
                case 'PAYMENT':
                case 'WITHDRAW':
                    balanceChange = -amount;
                    newTotalSpent += amount;
                    break;
                case 'REFUND':
                    newTotalRefunded += amount;
                    break;
                case 'ADJUSTMENT':
                    // Điều chỉnh có thể dương hoặc âm
                    if (amount < 0) {
                        newTotalSpent += Math.abs(amount);
                    } else {
                        newTotalDeposited += amount;
                    }
                    break;
            }

            const balanceAfter = balanceBefore + balanceChange;

            // Cập nhật balance
            const updatedBalance = await tx.organizationBalance.update({
                where: { id: organizationBalance.id },
                data: {
                    balance: balanceAfter,
                    total_deposited: newTotalDeposited,
                    total_spent: newTotalSpent,
                    total_refunded: newTotalRefunded,
                    updated_at: new Date(),
                },
                include: {
                    organization: {
                        select: { id: true, name: true },
                    },
                },
            });

            // Tạo transaction record
            const transaction = await tx.organizationBalanceTransaction.create({
                data: {
                    organization_balance_id: organizationBalance.id,
                    organization_id: organizationId,
                    performed_by_user_id: performedByUserId,
                    type,
                    amount: Math.abs(amount),
                    balance_before: balanceBefore,
                    balance_after: balanceAfter,
                    reference_type: options.referenceType,
                    reference_id: options.referenceId,
                    description: options.description,
                    notes: options.notes,
                    metadata: options.metadata as Prisma.InputJsonValue,
                },
            });

            return {
                balance: this.toInterface(updatedBalance),
                transaction: this.toTransactionInterface(transaction),
            };
        });
    }

    /**
     * Lấy danh sách giao dịch của organization
     */
    async findTransactionsByOrganizationId(
        organizationId: string,
        query: QueryBalanceTransactionDto,
    ): Promise<IPaginatedResponse<IOrganizationBalanceTransaction>> {
        const { limit = 20, offset = 0, type, keywords } = query;

        const where: Prisma.OrganizationBalanceTransactionWhereInput = {
            organization_id: organizationId,
        };

        if (type) {
            where.type = type;
        }

        if (keywords) {
            where.OR = [
                { description: { contains: keywords, mode: 'insensitive' } },
                { notes: { contains: keywords, mode: 'insensitive' } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.organizationBalanceTransaction.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.organizationBalanceTransaction.count({ where }),
        ]);

        return {
            items: items.map((item) => this.toTransactionInterface(item)),
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    private toInterface(data: any): IOrganizationBalance {
        return {
            id: data.id,
            organization_id: data.organization_id,
            balance: Number(data.balance),
            total_deposited: Number(data.total_deposited),
            total_spent: Number(data.total_spent),
            total_refunded: Number(data.total_refunded),
            is_active: data.is_active,
            created_at: data.created_at,
            updated_at: data.updated_at,
            is_deleted: data.is_deleted,
            deleted_at: data.deleted_at,
            organization: data.organization,
        };
    }

    private toTransactionInterface(data: any): IOrganizationBalanceTransaction {
        return {
            id: data.id,
            organization_balance_id: data.organization_balance_id,
            organization_id: data.organization_id,
            performed_by_user_id: data.performed_by_user_id,
            type: data.type,
            amount: Number(data.amount),
            balance_before: Number(data.balance_before),
            balance_after: Number(data.balance_after),
            reference_type: data.reference_type,
            reference_id: data.reference_id,
            description: data.description,
            notes: data.notes,
            metadata: data.metadata,
            created_at: data.created_at,
            performed_by_user: data.performed_by_user,
        };
    }
}
