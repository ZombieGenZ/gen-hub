import { Injectable } from '@nestjs/common';
import { Prisma, ContractStatus, ContractCancelType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryRentalContractDto } from './dto';
import { IRentalContractWithRelations, IPaginatedResponse } from './interfaces';

type CreateRentalContractDetailData = Omit<Prisma.RentalContractDetailCreateManyInput, 'rental_contract_id'> & {
    rowTemplateIds?: string[];
};

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
                warehouse_template: {
                    select: {
                        id: true,
                        name: true,
                        images: {
                            where: { is_deleted: false },
                            select: { id: true, url: true, thumbnail_url: true, order: true },
                            orderBy: { order: 'asc' as const },
                        },
                    },
                },
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
                detail_rows: {
                    include: {
                        row_template: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
            },
        },
    };

    // Include với owner info để gửi email
    private readonly fullIncludeWithOwner = {
        organization: {
            select: {
                id: true,
                name: true,
                owner: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        },
        details: {
            where: { is_deleted: false },
            include: {
                warehouse_template: {
                    select: {
                        id: true,
                        name: true,
                        images: {
                            where: { is_deleted: false },
                            select: { id: true, url: true, thumbnail_url: true, order: true },
                            orderBy: { order: 'asc' as const },
                        },
                    },
                },
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
                detail_rows: {
                    include: {
                        row_template: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
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
        details: {
            where: { is_deleted: false },
            include: {
                warehouse_template: {
                    select: {
                        id: true,
                        name: true,
                        images: {
                            where: { is_deleted: false },
                            select: { id: true, url: true, thumbnail_url: true, order: true },
                            orderBy: { order: 'asc' as const },
                            take: 1,
                        },
                    },
                },
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
        detailsData: CreateRentalContractDetailData[],
    ): Promise<IRentalContractWithRelations> {
        return this.prisma.$transaction(async (tx) => {
            const contract = await tx.rentalContract.create({
                data: contractData,
            });

            for (const detail of detailsData) {
                const { rowTemplateIds = [], ...detailData } = detail;
                const uniqueRowTemplateIds = [...new Set(rowTemplateIds)];
                await tx.rentalContractDetail.create({
                    data: {
                        ...detailData,
                        rental_contract_id: contract.id,
                        ...(uniqueRowTemplateIds.length > 0 && {
                            detail_rows: {
                                createMany: {
                                    data: uniqueRowTemplateIds.map((rowTemplateId) => ({
                                        row_template_id: rowTemplateId,
                                        created_by: detail.created_by,
                                    })),
                                    skipDuplicates: true,
                                },
                            },
                        }),
                    },
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

    /**
     * Lấy contract kèm thông tin owner (để gửi email)
     */
    async findByIdWithOrganization(id: string): Promise<IRentalContractWithRelations | null> {
        return this.prisma.rentalContract.findFirst({
            where: { id, is_deleted: false },
            include: this.fullIncludeWithOwner,
        }) as unknown as IRentalContractWithRelations | null;
    }

    async findByCode(code: string): Promise<IRentalContractWithRelations | null> {
        return this.prisma.rentalContract.findFirst({
            where: { code, is_deleted: false },
            include: this.fullInclude,
        }) as unknown as IRentalContractWithRelations | null;
    }

    async findMany(
        query: QueryRentalContractDto & { organization_ids?: string[] },
    ): Promise<IPaginatedResponse<IRentalContractWithRelations>> {
        const limit = this.paginationConfig.getLimit(query.limit);
        const offset = this.paginationConfig.getOffset(query.offset);
        const { keywords, status, organization_id, organization_ids } = query;

        const where: Prisma.RentalContractWhereInput = {
            is_deleted: false,
            ...(status && { status }),
            ...(organization_id && { organization_id }),
            // Nếu có organization_ids, lọc theo danh sách này (dùng khi không có quyền list.all)
            ...(organization_ids && organization_ids.length > 0 && !organization_id && {
                organization_id: { in: organization_ids },
            }),
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

    async findByIds(ids: string[]): Promise<IRentalContractWithRelations[]> {
        return this.prisma.rentalContract.findMany({
            where: { id: { in: ids }, is_deleted: false },
            include: this.fullInclude,
        }) as unknown as IRentalContractWithRelations[];
    }

    async softDeleteMany(ids: string[], deletedBy: string): Promise<void> {
        await this.prisma.rentalContract.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
                status: ContractStatus.CANCELLED,
            },
        });
    }

    /**
     * Hủy hợp đồng với actual_ended_at, cancel_type và cancel_reason
     */
    async cancelContract(
        id: string,
        deletedBy: string,
        cancelType: ContractCancelType,
        cancelReason: string,
    ): Promise<IRentalContractWithRelations> {
        return this.prisma.rentalContract.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
                status: ContractStatus.CANCELLED,
                actual_ended_at: new Date(),
                cancel_type: cancelType,
                cancel_reason: cancelReason,
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

    /**
     * Lấy danh sách payments của contract
     */
    async findPaymentsByContract(contractId: string) {
        return this.prisma.payment.findMany({
            where: {
                rental_contract_id: contractId,
                is_deleted: false,
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Tìm các contracts PENDING khác có xung đột về template hoặc row
     * Dùng để hủy khi có contract được thanh toán thành công
     */
    async findConflictingPendingContracts(
        templateIds: string[],
        rowTemplateIds: string[],
        excludeContractId: string,
    ): Promise<IRentalContractWithRelations[]> {
        // Tìm contracts PENDING khác có chứa cùng template hoặc row
        const contracts = await this.prisma.rentalContract.findMany({
            where: {
                id: { not: excludeContractId },
                status: ContractStatus.PENDING,
                is_deleted: false,
                details: {
                    some: {
                        is_deleted: false,
                        OR: [
                            // Xung đột: thuê cả kho (template) trùng với template đang thuê
                            {
                                is_whole_warehouse: true,
                                warehouse_template_id: { in: templateIds },
                            },
                            // Xung đột: thuê row trùng với row đang thuê
                            {
                                is_whole_warehouse: false,
                                detail_rows: {
                                    some: {
                                        row_template_id: { in: rowTemplateIds },
                                    },
                                },
                            } as Prisma.RentalContractDetailWhereInput,
                            // Xung đột: thuê cả kho nhưng có row của kho đó đang được thuê
                            {
                                is_whole_warehouse: true,
                                warehouse_template: {
                                    rows: {
                                        some: {
                                            id: { in: rowTemplateIds },
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            },
            include: this.fullInclude,
        });

        return contracts as unknown as IRentalContractWithRelations[];
    }

    async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }

    /**
     * Thêm addon vào hợp đồng
     */
    async addAddon(data: {
        rental_contract_id: string;
        addon_id: string;
        price_at_purchase: number;
        is_gift: boolean;
        created_by: string;
    }) {
        return this.prisma.rentalContractAddon.create({
            data: {
                rental_contract_id: data.rental_contract_id,
                addon_id: data.addon_id,
                price_at_purchase: data.price_at_purchase,
                is_gift: data.is_gift,
                created_by: data.created_by,
            },
            include: {
                addon: true,
            },
        });
    }

    /**
     * Lấy danh sách addons của hợp đồng
     */
    async findContractAddons(contractId: string) {
        return this.prisma.rentalContractAddon.findMany({
            where: {
                rental_contract_id: contractId,
                is_deleted: false,
            },
            include: {
                addon: true,
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Lấy danh sách insurances của hợp đồng
     */
    async findContractInsurances(contractId: string) {
        return this.prisma.rentalContractInsurance.findMany({
            where: {
                rental_contract_id: contractId,
                is_deleted: false,
            },
            include: {
                insurance: true,
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Tìm addon trong hợp đồng theo ID
     */
    async findContractAddonById(id: string) {
        return this.prisma.rentalContractAddon.findFirst({
            where: { id, is_deleted: false },
            include: {
                addon: true,
                rental_contract: true,
            },
        });
    }

    /**
     * Kiểm tra addon đã được thêm vào hợp đồng chưa
     */
    async isAddonAlreadyAdded(contractId: string, addonId: string): Promise<boolean> {
        const existing = await this.prisma.rentalContractAddon.findFirst({
            where: {
                rental_contract_id: contractId,
                addon_id: addonId,
                is_deleted: false,
                is_cancelled: false,
            },
        });
        return !!existing;
    }

    /**
     * Hủy addon trong hợp đồng
     */
    async cancelAddon(id: string, cancelReason: string, userId: string) {
        return this.prisma.rentalContractAddon.update({
            where: { id },
            data: {
                is_cancelled: true,
                cancelled_at: new Date(),
                cancel_reason: cancelReason,
                updated_by: userId,
            },
            include: {
                addon: true,
            },
        });
    }

    /**
     * Ghi log thay đổi hợp đồng
     */
    async createLog(data: {
        rental_contract_id: string;
        action: 'CREATED' | 'RENEWED' | 'ADDON_ADDED' | 'ADDON_CANCELLED' | 'COUPON_APPLIED' | 'STATUS_CHANGED' | 'CANCELLED' | 'COMPLETED';
        description: string;
        metadata?: Record<string, any>;
        created_by: string;
    }) {
        return this.prisma.rentalContractLog.create({
            data: {
                rental_contract_id: data.rental_contract_id,
                action: data.action,
                description: data.description,
                metadata: data.metadata,
                created_by: data.created_by,
            },
        });
    }

    /**
     * Lấy log của hợp đồng
     */
    async findContractLogs(contractId: string) {
        return this.prisma.rentalContractLog.findMany({
            where: { rental_contract_id: contractId },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Thêm coupon vào hợp đồng
     */
    async addCoupon(data: {
        rental_contract_id: string;
        coupon_id: string;
        discount_value: number;
        discount_amount: number;
        created_by: string;
    }) {
        return this.prisma.rentalContractCoupon.create({
            data: {
                rental_contract_id: data.rental_contract_id,
                coupon_id: data.coupon_id,
                discount_value: data.discount_value,
                discount_amount: data.discount_amount,
                created_by: data.created_by,
            },
            include: {
                coupon: true,
            },
        });
    }

    /**
     * Lấy danh sách coupons của hợp đồng
     */
    async findContractCoupons(contractId: string) {
        return this.prisma.rentalContractCoupon.findMany({
            where: { rental_contract_id: contractId },
            include: {
                coupon: true,
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Kiểm tra coupon đã được áp dụng cho hợp đồng chưa
     */
    async isCouponAlreadyApplied(contractId: string, couponId: string): Promise<boolean> {
        const existing = await this.prisma.rentalContractCoupon.findFirst({
            where: {
                rental_contract_id: contractId,
                coupon_id: couponId,
            },
        });
        return !!existing;
    }

    /**
     * Đếm số coupons đã áp dụng cho hợp đồng
     */
    async countAppliedCoupons(contractId: string): Promise<number> {
        return this.prisma.rentalContractCoupon.count({
            where: { rental_contract_id: contractId },
        });
    }

    /**
     * Lấy thông tin hợp đồng đầy đủ với addons, logs, coupons
     */
    async findByIdWithFullDetails(id: string) {
        return this.prisma.rentalContract.findFirst({
            where: { id, is_deleted: false },
            include: {
                ...this.fullInclude,
                addons: {
                    where: { is_deleted: false },
                    include: { addon: true },
                },
                coupons: {
                    include: { coupon: true },
                },
                logs: {
                    orderBy: { created_at: 'desc' },
                    take: 20, // Giới hạn 20 logs gần nhất
                },
            },
        });
    }
}
