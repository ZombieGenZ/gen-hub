import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { OrgAnalyticsCacheKeys } from './cache-keys.helper';
import { ReceiptStatus, ExportStatus, ContractStatus } from '@prisma/client';

@Injectable()
export class OrgAnalyticsService {
    private readonly logger = new Logger(OrgAnalyticsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
        private readonly cacheKeys: OrgAnalyticsCacheKeys,
    ) { }

    /**
     * Lấy Overview KPIs: Tổng tồn kho, Đơn xuất, Đơn nhập, Hợp đồng
     */
    async getOverview(orgId: string) {
        const cacheKey = this.cacheKeys.overview(orgId);
        const cached = await this.redisService.getJson<any>(cacheKey);
        if (cached) return cached;

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // 1. Total Stock
        const currentStockAggregate = await this.prisma.inventory.aggregate({
            where: { organization_id: orgId, is_deleted: false },
            _sum: { quantity: true },
        });
        const currentTotalStock = currentStockAggregate._sum.quantity?.toNumber() || 0;

        // Note: Tracking stock trend perfectly requires daily snapshots. 
        // Here we estimate by looking at recent inflows/outflows
        const recentInflows = await this.prisma.receiptDetail.aggregate({
            where: {
                receipt: { organization_id: orgId, status: ReceiptStatus.COMPLETED, updated_at: { gte: sevenDaysAgo } },
                is_deleted: false,
            },
            _sum: { actual_qty: true }
        });
        const recentOutflows = await this.prisma.exportDetail.aggregate({
            where: {
                export: { organization_id: orgId, status: ExportStatus.SHIPPED, updated_at: { gte: sevenDaysAgo } },
                is_deleted: false,
            },
            _sum: { quantity: true }
        });

        const inflow = recentInflows._sum?.actual_qty?.toNumber() || 0;
        const outflow = recentOutflows._sum?.quantity?.toNumber() || 0;

        const totalStockTrendValue = currentTotalStock > 0 ? ((inflow - outflow) / currentTotalStock * 100).toFixed(1) : "0";

        // 2. Outbound Orders (Đơn xuất hàng)
        const currentOutbounds = await this.prisma.export.count({
            where: { organization_id: orgId, created_at: { gte: sevenDaysAgo }, is_deleted: false },
        });
        const previousOutbounds = await this.prisma.export.count({
            where: { organization_id: orgId, created_at: { gte: fourteenDaysAgo, lt: sevenDaysAgo }, is_deleted: false },
        });

        const outboundTrend = previousOutbounds > 0
            ? (((currentOutbounds - previousOutbounds) / previousOutbounds) * 100).toFixed(1)
            : (currentOutbounds > 0 ? "100" : "0");

        // 3. Inbound Shipments (Đơn nhập hàng)
        const currentInbounds = await this.prisma.receipt.count({
            where: { organization_id: orgId, created_at: { gte: sevenDaysAgo }, is_deleted: false },
        });
        const previousInbounds = await this.prisma.receipt.count({
            where: { organization_id: orgId, created_at: { gte: fourteenDaysAgo, lt: sevenDaysAgo }, is_deleted: false },
        });

        const inboundTrend = previousInbounds > 0
            ? (((currentInbounds - previousInbounds) / previousInbounds) * 100).toFixed(1)
            : (currentInbounds > 0 ? "100" : "0");

        // 4. Contracts
        const activeContracts = await this.prisma.rentalContract.count({
            where: {
                organization_id: orgId,
                status: {
                    in: [
                        ContractStatus.ACTIVE,
                        ContractStatus.OVERDUE_LEVEL_1,
                        ContractStatus.OVERDUE_LEVEL_2,
                        ContractStatus.OVERDUE_LEVEL_3
                    ]
                },
                is_deleted: false,
            },
        });

        const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiringContracts = await this.prisma.rentalContract.count({
            where: {
                organization_id: orgId,
                status: ContractStatus.ACTIVE,
                expired_at: { lte: next30Days },
                is_deleted: false,
            },
        });

        const result = {
            totalStock: currentTotalStock,
            totalStockTrend: {
                value: `${Number(totalStockTrendValue) >= 0 ? '+' : ''}${totalStockTrendValue}%`,
                direction: Number(totalStockTrendValue) >= 0 ? 'up' : 'down',
                label: 'so với tuần trước'
            },
            outboundOrders: await this.prisma.export.count({ where: { organization_id: orgId, is_deleted: false } }),
            outboundOrdersTrend: {
                value: `${Number(outboundTrend) >= 0 ? '+' : ''}${outboundTrend}%`,
                direction: Number(outboundTrend) >= 0 ? 'up' : 'down',
                label: 'so với tuần trước'
            },
            inboundShipments: await this.prisma.receipt.count({ where: { organization_id: orgId, is_deleted: false } }),
            inboundShipmentsTrend: {
                value: `${Number(inboundTrend) >= 0 ? '+' : ''}${inboundTrend}%`,
                direction: Number(inboundTrend) >= 0 ? 'up' : 'down',
                label: 'so với tuần trước'
            },
            activeContracts,
            expiringContracts,
            efficiency: 0, // Placeholder
        };

        await this.redisService.setJson(cacheKey, result, 300); // 5 mins
        return result;
    }

    /**
     * Biểu đồ dòng hàng (Stock Flow) theo tuần qua
     */
    async getStockFlow(orgId: string, days: number = 7) {
        const cacheKey = this.cacheKeys.flow(orgId, days);
        const cached = await this.redisService.getJson<any[]>(cacheKey);
        if (cached) return cached;

        const result: { day: string, fullDate: string, inbound: number, outbound: number }[] = [];
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        // Grouping by Date using Prisma is tricky, we will fetch recent receipts/exports and map in JS for simplicity
        const startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);

        const receipts = await this.prisma.receipt.findMany({
            where: {
                organization_id: orgId,
                created_at: { gte: startDate, lte: now },
                is_deleted: false,
            },
            include: { details: { select: { actual_qty: true, expected_qty: true } } }
        });

        const exports = await this.prisma.export.findMany({
            where: {
                organization_id: orgId,
                created_at: { gte: startDate, lte: now },
                is_deleted: false,
            },
            include: { details: { select: { quantity: true } } }
        });

        const flowMap = new Map<string, { inbound: number, outbound: number }>();
        const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const dayLabel = weekdays[date.getDay()];
            flowMap.set(dateStr, { inbound: 0, outbound: 0 });
            // Cần gán label thêm vào hoặc lưu để map sau
        }

        receipts.forEach(r => {
            const dateStr = r.created_at.toISOString().split('T')[0];
            if (flowMap.has(dateStr)) {
                const totalQty = r.details.reduce((sum, d) => sum + Number(d.actual_qty || d.expected_qty || 0), 0);
                flowMap.get(dateStr)!.inbound += Number(totalQty);
            }
        });

        exports.forEach(e => {
            const dateStr = e.created_at.toISOString().split('T')[0];
            if (flowMap.has(dateStr)) {
                const totalQty = e.details.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
                flowMap.get(dateStr)!.outbound += totalQty;
            }
        });

        for (const [dateStr, data] of flowMap.entries()) {
            const date = new Date(dateStr);
            result.push({
                day: weekdays[date.getDay()],
                fullDate: dateStr,
                inbound: data.inbound,
                outbound: data.outbound
            });
        }

        await this.redisService.setJson(cacheKey, result, 300);
        return result;
    }

    /**
     * Top sản phẩm trong kho (Theo số lượng)
     */
    async getTopProducts(orgId: string, limit: number = 5) {
        const cacheKey = this.cacheKeys.topProducts(orgId);
        const cached = await this.redisService.getJson<any[]>(cacheKey);
        if (cached) return cached;

        const inventorySummary = await this.prisma.inventory.groupBy({
            by: ['product_id'],
            where: {
                organization_id: orgId,
                is_deleted: false,
                quantity: { gt: 0 }
            },
            _sum: {
                quantity: true
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
            take: limit
        });

        const productIds = inventorySummary.map(i => i.product_id);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            include: { base_unit: true }
        });

        const result = inventorySummary.map(summary => {
            const product = products.find(p => p.id === summary.product_id);
            return {
                id: summary.product_id,
                name: product?.name || 'Unknown',
                count: summary._sum.quantity?.toNumber() || 0,
                unit: product?.base_unit?.name || 'Đơn vị',
                trend: 'up', // Giả định
                data: [0, 0, 0, 0, 0, summary._sum.quantity?.toNumber() || 0], // Sparkline giả định
            };
        });

        await this.redisService.setJson(cacheKey, result, 300);
        return result;
    }

    /**
     * Cảnh báo tồn kho (Sắp hết hàng & Sắp hết hạn)
     */
    async getStockAlerts(orgId: string) {
        const cacheKey = this.cacheKeys.alerts(orgId);
        const cached = await this.redisService.getJson<any>(cacheKey);
        if (cached) return cached;

        // 1. Sắp hết hàng (low_stock) - Cần có min_stock_level, tạm dùng giả định < 50
        const lowStockItems = await this.prisma.inventory.findMany({
            where: {
                organization_id: orgId,
                is_deleted: false,
                quantity: { gt: 0, lt: 50 } // Thay đổi logic min level tuỳ yêu cầu
            },
            include: { product: { include: { base_unit: true } } },
            take: 20
        });

        const mappedLowStock = lowStockItems.map(item => ({
            name: item.product.name,
            left: item.quantity.toNumber(),
            min: 100, // Hoặc lấy từ item.product.min_stock_level nếu có
            unit: item.product.base_unit?.name || 'Đơn vị',
        }));

        // 2. Sắp hết hạn (expired) - Batch < 30 ngày
        const next30Days = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiringItems = await this.prisma.inventory.findMany({
            where: {
                organization_id: orgId,
                is_deleted: false,
                quantity: { gt: 0 },
                batch: { expiry_date: { lte: next30Days } }
            },
            include: { product: { include: { base_unit: true } }, batch: true },
            take: 20
        });

        const mappedExpiring = expiringItems.map(item => {
            const expDate = item.batch?.expiry_date;
            return {
                name: item.product.name,
                left: item.quantity.toNumber(),
                unit: item.product.base_unit?.name || 'Đơn vị',
                expiry: expDate ? `${expDate.getDate()}/${expDate.getMonth() + 1}/${expDate.getFullYear()}` : 'N/A'
            };
        });

        const result = {
            lowStock: mappedLowStock,
            expired: mappedExpiring
        };

        await this.redisService.setJson(cacheKey, result, 300);
        return result;
    }

    /**
     * Tiến độ vận đơn (Nhập / Xuất mới nhất)
     */
    async getRecentShipments(orgId: string, limit: number = 5) {
        const cacheKey = this.cacheKeys.shipments(orgId);
        const cached = await this.redisService.getJson<any[]>(cacheKey);
        if (cached) return cached;

        const receipts = await this.prisma.receipt.findMany({
            where: { organization_id: orgId, is_deleted: false },
            include: { partner: true },
            orderBy: { created_at: 'desc' },
            take: limit
        });

        const exportsList = await this.prisma.export.findMany({
            where: { organization_id: orgId, is_deleted: false },
            include: { partner: true },
            orderBy: { created_at: 'desc' },
            take: limit
        });

        const combined = [
            ...receipts.map(r => ({
                id: r.code,
                type: 'Nhập',
                partner: r.partner?.name || 'Khách lẻ',
                date: `${r.created_at.getDate().toString().padStart(2, '0')}/${(r.created_at.getMonth() + 1).toString().padStart(2, '0')}/${r.created_at.getFullYear()}`,
                status: this.mapReceiptStatus(r.status),
                timestamp: r.created_at.getTime()
            })),
            ...exportsList.map(e => ({
                id: e.code,
                type: 'Xuất',
                partner: e.partner?.name || 'Khách lẻ',
                date: `${e.created_at.getDate().toString().padStart(2, '0')}/${(e.created_at.getMonth() + 1).toString().padStart(2, '0')}/${e.created_at.getFullYear()}`,
                status: this.mapExportStatus(e.status),
                timestamp: e.created_at.getTime()
            }))
        ];

        combined.sort((a, b) => b.timestamp - a.timestamp);
        const result = combined.slice(0, limit);

        await this.redisService.setJson(cacheKey, result, 300);
        return result;
    }

    private mapReceiptStatus(status: ReceiptStatus): string {
        switch (status) {
            case ReceiptStatus.PENDING: return 'Đang xử lý';
            case ReceiptStatus.APPROVED: return 'Đã duyệt';
            case ReceiptStatus.RECEIVING: return 'Đang nhập';
            case ReceiptStatus.PROCESSING: return 'Đang xử lý chi tiết';
            case ReceiptStatus.PUTAWAY: return 'Đang cất lên kệ';
            case ReceiptStatus.COMPLETED: return 'Hoàn tất';
            case ReceiptStatus.CANCELLED: return 'Đã hủy';
            default: return 'Khác';
        }
    }

    private mapExportStatus(status: ExportStatus): string {
        switch (status) {
            case ExportStatus.PENDING: return 'Đang xử lý';
            case ExportStatus.PICKING: return 'Đang lấy';
            case ExportStatus.CHECKING: return 'Đang kiểm tra';
            case ExportStatus.PACKED: return 'Đang đóng';
            case ExportStatus.SHIPPED: return 'Đang giao / Hoàn tất';
            case ExportStatus.CANCELLED: return 'Đã hủy';
            default: return 'Khác';
        }
    }
}
