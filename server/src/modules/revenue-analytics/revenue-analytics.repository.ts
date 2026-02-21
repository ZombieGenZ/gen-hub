import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface AggregateResult {
    value: number;
    count: number;
    previousValue?: number;
}

interface TimeSeriesRow {
    period: Date;
    type: string;
    total: bigint | Prisma.Decimal;
}

interface AddonTimeSeriesRow {
    period: Date;
    addon_total: Prisma.Decimal;
    insurance_total: Prisma.Decimal;
}

interface PaymentMethodRow {
    payment_method: string;
    contract_count: bigint;
    total_amount: bigint | Prisma.Decimal;
}

interface TopOrganizationRow {
    id: string;
    name: string;
    tax_code: string | null;
    total_revenue: bigint | Prisma.Decimal;
    outstanding_debt: bigint | Prisma.Decimal;
    contract_count: bigint;
}

interface TopWarehouseRow {
    id: string;
    name: string;
    price_per_month: Prisma.Decimal;
    address_detail: string | null;
    total_revenue: Prisma.Decimal;
    contract_count: bigint;
}

interface CouponDiscountRow {
    period: Date;
    total_discount: Prisma.Decimal;
}

interface SparklineRow {
    day: Date;
    total: bigint | Prisma.Decimal;
}

@Injectable()
export class RevenueAnalyticsRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * KPI 1: Doanh thu thuần (Net Revenue)
     * Sum Payment.amount where status=PAID trong khoảng thời gian
     * + Kỳ trước để tính % thay đổi
     */
    async getNetRevenue(
        from: Date,
        to: Date,
        warehouseTemplateIds?: string[],
    ): Promise<AggregateResult> {
        const whereClause: Prisma.PaymentWhereInput = {
            status: 'PAID',
            is_deleted: false,
            paid_at: { gte: from, lte: to },
        };

        if (warehouseTemplateIds?.length) {
            whereClause.rental_contract = {
                details: {
                    some: { warehouse_template_id: { in: warehouseTemplateIds } },
                },
            };
        }

        const current = await this.prisma.payment.aggregate({
            where: whereClause,
            _sum: { amount: true },
            _count: { id: true },
        });

        // Kỳ trước (cùng khoảng thời gian, dịch lùi)
        const duration = to.getTime() - from.getTime();
        const prevFrom = new Date(from.getTime() - duration);
        const prevTo = new Date(from.getTime() - 1);

        const prevWhere: Prisma.PaymentWhereInput = {
            ...whereClause,
            paid_at: { gte: prevFrom, lte: prevTo },
        };

        const previous = await this.prisma.payment.aggregate({
            where: prevWhere,
            _sum: { amount: true },
        });

        return {
            value: current._sum.amount ?? 0,
            count: current._count.id,
            previousValue: previous._sum.amount ?? 0,
        };
    }

    /**
     * KPI 2: Chờ thanh toán (Pending Receivables)
     * Hợp đồng ACTIVE nhưng Payment PENDING
     */
    async getPendingReceivables(
        from: Date,
        to: Date,
        warehouseTemplateIds?: string[],
    ): Promise<AggregateResult> {
        const whereClause: Prisma.PaymentWhereInput = {
            status: 'PENDING',
            is_deleted: false,
            created_at: { gte: from, lte: to },
            rental_contract: {
                status: {
                    in: ['ACTIVE', 'OVERDUE_LEVEL_1', 'OVERDUE_LEVEL_2', 'OVERDUE_LEVEL_3'],
                },
                is_deleted: false,
            },
        };

        if (warehouseTemplateIds?.length) {
            (whereClause.rental_contract as Prisma.RentalContractWhereInput).details = {
                some: { warehouse_template_id: { in: warehouseTemplateIds } },
            };
        }

        const current = await this.prisma.payment.aggregate({
            where: whereClause,
            _sum: { amount: true },
            _count: { id: true },
        });

        // Kỳ trước
        const duration = to.getTime() - from.getTime();
        const prevFrom = new Date(from.getTime() - duration);
        const prevTo = new Date(from.getTime() - 1);

        const prevWhere: Prisma.PaymentWhereInput = {
            ...whereClause,
            created_at: { gte: prevFrom, lte: prevTo },
        };

        const previous = await this.prisma.payment.aggregate({
            where: prevWhere,
            _sum: { amount: true },
        });

        return {
            value: current._sum.amount ?? 0,
            count: current._count.id,
            previousValue: previous._sum.amount ?? 0,
        };
    }

    /**
     * KPI 3: Tiền phạt trả chậm (Overdue Penalties)
     */
    async getOverduePenalties(
        from: Date,
        to: Date,
    ): Promise<AggregateResult> {
        const current = await this.prisma.rentalContract.aggregate({
            where: {
                status: { in: ['OVERDUE_LEVEL_1', 'OVERDUE_LEVEL_2', 'OVERDUE_LEVEL_3'] },
                is_deleted: false,
                updated_at: { gte: from, lte: to },
            },
            _sum: { overdue_penalty: true },
            _count: { id: true },
        });

        // Kỳ trước
        const duration = to.getTime() - from.getTime();
        const prevFrom = new Date(from.getTime() - duration);
        const prevTo = new Date(from.getTime() - 1);

        const previous = await this.prisma.rentalContract.aggregate({
            where: {
                status: { in: ['OVERDUE_LEVEL_1', 'OVERDUE_LEVEL_2', 'OVERDUE_LEVEL_3'] },
                is_deleted: false,
                updated_at: { gte: prevFrom, lte: prevTo },
            },
            _sum: { overdue_penalty: true },
        });

        return {
            value: Number(current._sum.overdue_penalty ?? 0),
            count: current._count.id,
            previousValue: Number(previous._sum.overdue_penalty ?? 0),
        };
    }

    /**
     * KPI 4: Tổng tiền hoàn trả (Total Refunded)
     */
    async getTotalRefunded(
        from: Date,
        to: Date,
    ): Promise<AggregateResult> {
        const current = await this.prisma.refundRequest.aggregate({
            where: {
                status: 'COMPLETED',
                is_deleted: false,
                created_at: { gte: from, lte: to },
            },
            _sum: { final_refund_amount: true },
            _count: { id: true },
        });

        // Kỳ trước
        const duration = to.getTime() - from.getTime();
        const prevFrom = new Date(from.getTime() - duration);
        const prevTo = new Date(from.getTime() - 1);

        const previous = await this.prisma.refundRequest.aggregate({
            where: {
                status: 'COMPLETED',
                is_deleted: false,
                created_at: { gte: prevFrom, lte: prevTo },
            },
            _sum: { final_refund_amount: true },
        });

        return {
            value: Number(current._sum.final_refund_amount ?? 0),
            count: current._count.id,
            previousValue: Number(previous._sum.final_refund_amount ?? 0),
        };
    }

    /**
     * Sparkline: 14 ngày gần nhất doanh thu
     */
    async getSparklineData(days: number = 14): Promise<{ day: string; total: number }[]> {
        const rows = await this.prisma.$queryRaw<SparklineRow[]>`
            SELECT
                date_trunc('day', paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as day,
                COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE status = 'PAID' AND is_deleted = false
                AND paid_at >= NOW() - INTERVAL '${Prisma.raw(String(days))} days'
            GROUP BY day
            ORDER BY day ASC
        `;

        return rows.map(r => ({
            day: new Date(r.day).toISOString().split('T')[0],
            total: Number(r.total),
        }));
    }

    /**
     * Chart: Dòng tiền theo thời gian (Stacked Bar)
     * Phân tách theo Payment.type: NEW_CONTRACT, RENEWAL, ACCOUNT_DEPOSIT
     */
    async getRevenueTimeSeries(
        from: Date,
        to: Date,
        granularity: string,
    ): Promise<{ period: string; type: string; total: number }[]> {
        const truncFn = granularity === 'DAY' ? 'day' : granularity === 'WEEK' ? 'week' : 'month';

        const rows = await this.prisma.$queryRaw<TimeSeriesRow[]>`
            SELECT
                date_trunc(${Prisma.raw(`'${truncFn}'`)}, p.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as period,
                p.type,
                COALESCE(SUM(p.amount), 0) as total
            FROM payments p
            WHERE p.status = 'PAID'
                AND p.is_deleted = false
                AND p.paid_at >= ${from}
                AND p.paid_at <= ${to}
            GROUP BY period, p.type
            ORDER BY period ASC
        `;

        return rows.map(r => ({
            period: new Date(r.period).toISOString().split('T')[0],
            type: r.type,
            total: Number(r.total),
        }));
    }

    /**
     * Chart: Addon + Insurance revenue theo thời gian
     */
    async getAddonInsuranceTimeSeries(
        from: Date,
        to: Date,
        granularity: string,
    ): Promise<{ period: string; addon_total: number; insurance_total: number }[]> {
        const truncFn = granularity === 'DAY' ? 'day' : granularity === 'WEEK' ? 'week' : 'month';

        const rows = await this.prisma.$queryRaw<AddonTimeSeriesRow[]>`
            SELECT
                date_trunc(${Prisma.raw(`'${truncFn}'`)}, rc.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as period,
                COALESCE(SUM(rca.price_at_purchase), 0) as addon_total,
                COALESCE(SUM(rci.price_at_purchase), 0) as insurance_total
            FROM rental_contracts rc
            LEFT JOIN rental_contract_addons rca ON rca.rental_contract_id = rc.id AND rca.is_cancelled = false AND rca.is_deleted = false
            LEFT JOIN rental_contract_insurances rci ON rci.rental_contract_id = rc.id AND rci.is_cancelled = false AND rci.is_deleted = false
            WHERE rc.is_deleted = false
                AND rc.status NOT IN ('CANCELLED', 'PENDING')
                AND rc.created_at >= ${from}
                AND rc.created_at <= ${to}
            GROUP BY period
            ORDER BY period ASC
        `;

        return rows.map(r => ({
            period: new Date(r.period).toISOString().split('T')[0],
            addon_total: Number(r.addon_total),
            insurance_total: Number(r.insurance_total),
        }));
    }

    /**
     * Chart: Phân bổ theo phương thức thanh toán (Doughnut)
     */
    async getPaymentMethodBreakdown(
        from: Date,
        to: Date,
    ): Promise<{ payment_method: string; contract_count: number; total_amount: number }[]> {
        const rows = await this.prisma.$queryRaw<PaymentMethodRow[]>`
            SELECT
                rc.payment_method,
                COUNT(DISTINCT rc.id) as contract_count,
                COALESCE(SUM(p.amount), 0) as total_amount
            FROM rental_contracts rc
            INNER JOIN payments p ON p.rental_contract_id = rc.id
            WHERE p.status = 'PAID'
                AND p.is_deleted = false
                AND p.paid_at >= ${from}
                AND p.paid_at <= ${to}
            GROUP BY rc.payment_method
        `;

        return rows.map(r => ({
            payment_method: r.payment_method,
            contract_count: Number(r.contract_count),
            total_amount: Number(r.total_amount),
        }));
    }

    /**
     * Table Tab 1: Top Organizations (theo doanh thu)
     */
    async getTopOrganizations(
        from: Date,
        to: Date,
        limit: number,
        offset: number,
    ): Promise<{ items: any[]; total: number }> {
        const rows = await this.prisma.$queryRaw<TopOrganizationRow[]>`
            SELECT
                o.id,
                o.name,
                o.tax_code,
                COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN p.status = 'PENDING' THEN p.amount ELSE 0 END), 0) as outstanding_debt,
                COUNT(DISTINCT rc.id) as contract_count
            FROM organizations o
            LEFT JOIN payments p ON p.organization_id = o.id
                AND p.is_deleted = false
                AND p.created_at >= ${from}
                AND p.created_at <= ${to}
            LEFT JOIN rental_contracts rc ON rc.organization_id = o.id
                AND rc.is_deleted = false
            WHERE o.is_deleted = false
            GROUP BY o.id, o.name, o.tax_code
            HAVING COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) > 0
                OR COALESCE(SUM(CASE WHEN p.status = 'PENDING' THEN p.amount ELSE 0 END), 0) > 0
            ORDER BY total_revenue DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const total = await this.prisma.organization.count({
            where: { is_deleted: false },
        });

        return {
            items: rows.map(r => ({
                id: r.id,
                name: r.name,
                tax_code: r.tax_code,
                total_revenue: Number(r.total_revenue),
                outstanding_debt: Number(r.outstanding_debt),
                contract_count: Number(r.contract_count),
            })),
            total,
        };
    }

    /**
     * Table Tab 2: Top Warehouses (theo doanh thu)
     */
    async getTopWarehouses(
        from: Date,
        to: Date,
        limit: number,
        offset: number,
    ): Promise<{ items: any[]; total: number }> {
        const rows = await this.prisma.$queryRaw<TopWarehouseRow[]>`
            SELECT
                wt.id,
                wt.name,
                wt.price_per_month,
                wt.address_detail,
                COALESCE(SUM(rcd.subtotal), 0) as total_revenue,
                COUNT(DISTINCT rcd.rental_contract_id) as contract_count
            FROM warehouse_templates wt
            LEFT JOIN rental_contract_details rcd ON rcd.warehouse_template_id = wt.id
                AND rcd.is_deleted = false
            LEFT JOIN rental_contracts rc ON rc.id = rcd.rental_contract_id
                AND rc.is_deleted = false
                AND rc.status NOT IN ('CANCELLED', 'PENDING')
                AND rc.created_at >= ${from}
                AND rc.created_at <= ${to}
            WHERE wt.is_deleted = false
            GROUP BY wt.id, wt.name, wt.price_per_month, wt.address_detail
            ORDER BY total_revenue DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const total = await this.prisma.warehouseTemplate.count({
            where: { is_deleted: false },
        });

        return {
            items: rows.map(r => ({
                id: r.id,
                name: r.name,
                price_per_month: Number(r.price_per_month),
                address_detail: r.address_detail,
                total_revenue: Number(r.total_revenue),
                contract_count: Number(r.contract_count),
            })),
            total,
        };
    }

    /**
     * Table Tab 3: Giao dịch gần nhất
     */
    async getRecentTransactions(
        from: Date,
        to: Date,
        limit: number,
        offset: number,
    ): Promise<{ items: any[]; total: number }> {
        const [items, total] = await Promise.all([
            this.prisma.payment.findMany({
                where: {
                    is_deleted: false,
                    created_at: { gte: from, lte: to },
                },
                include: {
                    organization: { select: { id: true, name: true } },
                    rental_contract: { select: { id: true, code: true, name: true } },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.payment.count({
                where: {
                    is_deleted: false,
                    created_at: { gte: from, lte: to },
                },
            }),
        ]);

        return { items, total };
    }

    /**
     * Coupon Discount Time Series (Negative Bars)
     */
    async getCouponDiscountTimeSeries(
        from: Date,
        to: Date,
        granularity: string,
    ): Promise<{ period: string; total_discount: number }[]> {
        const truncFn = granularity === 'DAY' ? 'day' : granularity === 'WEEK' ? 'week' : 'month';

        const rows = await this.prisma.$queryRaw<CouponDiscountRow[]>`
            SELECT
                date_trunc(${Prisma.raw(`'${truncFn}'`)}, rc.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as period,
                COALESCE(SUM(rcc.discount_amount), 0) as total_discount
            FROM rental_contract_coupons rcc
            INNER JOIN rental_contracts rc ON rc.id = rcc.rental_contract_id
            WHERE rc.is_deleted = false
                AND rc.created_at >= ${from}
                AND rc.created_at <= ${to}
            GROUP BY period
            ORDER BY period ASC
        `;

        return rows.map(r => ({
            period: new Date(r.period).toISOString().split('T')[0],
            total_discount: Number(r.total_discount),
        }));
    }

    /**
     * Lấy danh sách warehouse_template_id theo province_id
     * Ward.province_id → WarehouseTemplate.ward_id
     */
    async getWarehouseTemplateIdsByProvinceId(provinceId: string): Promise<string[]> {
        const warehouses = await this.prisma.warehouseTemplate.findMany({
            where: {
                is_deleted: false,
                ward: {
                    province_id: provinceId,
                },
            },
            select: { id: true },
        });

        return warehouses.map(w => w.id);
    }
}
