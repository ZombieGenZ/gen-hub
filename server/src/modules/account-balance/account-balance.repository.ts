import { Injectable } from '@nestjs/common';
import { Prisma, BalanceTransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IAccountBalance, IBalanceTransaction, IPaginatedResponse } from './interfaces';
import { QueryBalanceTransactionDto } from './dto';

@Injectable()
export class AccountBalanceRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lấy hoặc tạo AccountBalance cho user
     */
    async getOrCreateByUserId(userId: string): Promise<IAccountBalance> {
        let balance = await this.prisma.accountBalance.findUnique({
            where: { user_id: userId },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        if (!balance) {
            balance = await this.prisma.accountBalance.create({
                data: {
                    user_id: userId,
                    balance: 0,
                    total_deposited: 0,
                    total_spent: 0,
                    total_refunded: 0,
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                },
            });
        }

        return this.toInterface(balance);
    }

    /**
     * Lấy AccountBalance theo user ID
     */
    async findByUserId(userId: string): Promise<IAccountBalance | null> {
        const balance = await this.prisma.accountBalance.findUnique({
            where: { user_id: userId },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        return balance ? this.toInterface(balance) : null;
    }

    /**
     * Lấy AccountBalance theo ID
     */
    async findById(id: string): Promise<IAccountBalance | null> {
        const balance = await this.prisma.accountBalance.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        return balance ? this.toInterface(balance) : null;
    }

    /**
     * Lấy danh sách tất cả AccountBalances (Admin)
     */
    async findAll(query: {
        limit?: number;
        offset?: number;
        keywords?: string;
    }): Promise<IPaginatedResponse<IAccountBalance>> {
        const { limit = 20, offset = 0, keywords } = query;

        const where: Prisma.AccountBalanceWhereInput = {
            is_deleted: false,
        };

        if (keywords) {
            where.user = {
                OR: [
                    { name: { contains: keywords, mode: 'insensitive' } },
                    { email: { contains: keywords, mode: 'insensitive' } },
                ],
            };
        }

        const [items, total] = await Promise.all([
            this.prisma.accountBalance.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' },
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                },
            }),
            this.prisma.accountBalance.count({ where }),
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
        userId: string,
        type: BalanceTransactionType,
        amount: number,
        options: {
            referenceType?: string;
            referenceId?: string;
            description?: string;
            notes?: string;
            metadata?: Record<string, unknown>;
        } = {},
    ): Promise<{ balance: IAccountBalance; transaction: IBalanceTransaction }> {
        return this.prisma.$transaction(async (tx) => {
            // Lấy hoặc tạo balance
            let accountBalance = await tx.accountBalance.findUnique({
                where: { user_id: userId },
            });

            if (!accountBalance) {
                accountBalance = await tx.accountBalance.create({
                    data: {
                        user_id: userId,
                        balance: 0,
                        total_deposited: 0,
                        total_spent: 0,
                        total_refunded: 0,
                    },
                });
            }

            const balanceBefore = Number(accountBalance.balance);
            let balanceChange = amount;
            let newTotalDeposited = Number(accountBalance.total_deposited);
            let newTotalSpent = Number(accountBalance.total_spent);
            let newTotalRefunded = Number(accountBalance.total_refunded);

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
            const updatedBalance = await tx.accountBalance.update({
                where: { id: accountBalance.id },
                data: {
                    balance: balanceAfter,
                    total_deposited: newTotalDeposited,
                    total_spent: newTotalSpent,
                    total_refunded: newTotalRefunded,
                    updated_at: new Date(),
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                },
            });

            // Tạo transaction record
            const transaction = await tx.balanceTransaction.create({
                data: {
                    account_balance_id: accountBalance.id,
                    user_id: userId,
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
     * Lấy danh sách giao dịch của user
     */
    async findTransactionsByUserId(
        userId: string,
        query: QueryBalanceTransactionDto,
    ): Promise<IPaginatedResponse<IBalanceTransaction>> {
        const { limit = 20, offset = 0, type, keywords } = query;

        const where: Prisma.BalanceTransactionWhereInput = {
            user_id: userId,
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
            this.prisma.balanceTransaction.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.balanceTransaction.count({ where }),
        ]);

        return {
            items: items.map((item) => this.toTransactionInterface(item)),
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    private toInterface(data: any): IAccountBalance {
        return {
            id: data.id,
            user_id: data.user_id,
            balance: Number(data.balance),
            total_deposited: Number(data.total_deposited),
            total_spent: Number(data.total_spent),
            total_refunded: Number(data.total_refunded),
            is_active: data.is_active,
            created_at: data.created_at,
            updated_at: data.updated_at,
            is_deleted: data.is_deleted,
            deleted_at: data.deleted_at,
            user: data.user,
        };
    }

    private toTransactionInterface(data: any): IBalanceTransaction {
        return {
            id: data.id,
            account_balance_id: data.account_balance_id,
            user_id: data.user_id,
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
        };
    }
}
