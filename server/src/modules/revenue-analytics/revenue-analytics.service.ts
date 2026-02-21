import { Injectable, Logger } from '@nestjs/common';
import { RevenueAnalyticsRepository } from './revenue-analytics.repository';
import { RedisService } from '../redis/redis.service';
import {
    QueryRevenueDto,
    DatePreset,
    QueryRevenueChartDto,
    ChartGranularity,
    QueryRevenueTableDto,
    RevenueTableTab,
} from './dto';

@Injectable()
export class RevenueAnalyticsService {
    private readonly logger = new Logger(RevenueAnalyticsService.name);

    private readonly KPI_CACHE_TTL = 60; // 60 giây
    private readonly CHART_CACHE_TTL = 120; // 120 giây
    private readonly TABLE_CACHE_TTL = 30; // 30 giây

    constructor(
        private readonly repository: RevenueAnalyticsRepository,
        private readonly redisService: RedisService,
    ) { }

    /**
     * Resolve DatePreset hoặc custom date range thành { from, to }
     */
    private resolveDateRange(dto: QueryRevenueDto): { from: Date; to: Date } {
        if (dto.preset === DatePreset.CUSTOM && dto.from_date && dto.to_date) {
            return {
                from: new Date(dto.from_date + 'T00:00:00+07:00'),
                to: new Date(dto.to_date + 'T23:59:59+07:00'),
            };
        }

        const now = new Date();
        // Chuyển về timezone VN để tính
        const vnNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));

        switch (dto.preset) {
            case DatePreset.TODAY: {
                const start = new Date(vnNow);
                start.setHours(0, 0, 0, 0);
                const end = new Date(vnNow);
                end.setHours(23, 59, 59, 999);
                return { from: start, to: end };
            }
            case DatePreset.THIS_WEEK: {
                const start = new Date(vnNow);
                const day = start.getDay();
                const diff = day === 0 ? 6 : day - 1; // Monday = start of week
                start.setDate(start.getDate() - diff);
                start.setHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setDate(end.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                return { from: start, to: end };
            }
            case DatePreset.THIS_QUARTER: {
                const quarter = Math.floor(vnNow.getMonth() / 3);
                const start = new Date(vnNow.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
                const end = new Date(vnNow.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
                return { from: start, to: end };
            }
            case DatePreset.THIS_MONTH:
            default: {
                const start = new Date(vnNow.getFullYear(), vnNow.getMonth(), 1, 0, 0, 0, 0);
                const end = new Date(vnNow.getFullYear(), vnNow.getMonth() + 1, 0, 23, 59, 59, 999);
                return { from: start, to: end };
            }
        }
    }

    /**
     * Tạo cache key từ prefix + DTO params
     */
    private getCacheKey(prefix: string, params: Record<string, unknown>): string {
        const sorted = Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('&');
        return `revenue:${prefix}:${sorted}`;
    }

    /**
     * Resolve province_id → warehouse_template_ids
     */
    private async resolveWarehouseFilter(dto: QueryRevenueDto): Promise<string[] | undefined> {
        if (dto.warehouse_template_id) {
            return [dto.warehouse_template_id];
        }
        if (dto.province_id) {
            return this.repository.getWarehouseTemplateIdsByProvinceId(dto.province_id);
        }
        return undefined;
    }

    /**
     * Lấy dữ liệu 4 KPI cards + sparkline
     */
    async getKpis(dto: QueryRevenueDto) {
        const cacheKey = this.getCacheKey('kpis', dto as any);
        const cached = await this.redisService.getJson<any>(cacheKey);
        if (cached) return cached;

        const { from, to } = this.resolveDateRange(dto);
        const warehouseTemplateIds = await this.resolveWarehouseFilter(dto);

        const [netRevenue, pending, overdue, refunded, sparkline] = await Promise.all([
            this.repository.getNetRevenue(from, to, warehouseTemplateIds),
            this.repository.getPendingReceivables(from, to, warehouseTemplateIds),
            this.repository.getOverduePenalties(from, to),
            this.repository.getTotalRefunded(from, to),
            this.repository.getSparklineData(14),
        ]);

        const result = { netRevenue, pending, overdue, refunded, sparkline };
        await this.redisService.setJson(cacheKey, result, this.KPI_CACHE_TTL);

        return result;
    }

    /**
     * Lấy dữ liệu biểu đồ (time series + payment method breakdown)
     */
    async getChartData(dto: QueryRevenueChartDto) {
        const cacheKey = this.getCacheKey('charts', dto as any);
        const cached = await this.redisService.getJson<any>(cacheKey);
        if (cached) return cached;

        const { from, to } = this.resolveDateRange(dto);
        const granularity = dto.granularity || ChartGranularity.MONTH;

        const queries: Promise<any>[] = [
            this.repository.getRevenueTimeSeries(from, to, granularity),
            this.repository.getAddonInsuranceTimeSeries(from, to, granularity),
            this.repository.getPaymentMethodBreakdown(from, to),
        ];

        if (dto.include_coupon_discount) {
            queries.push(this.repository.getCouponDiscountTimeSeries(from, to, granularity));
        }

        const results = await Promise.all(queries);

        const result = {
            timeSeries: results[0],
            addonSeries: results[1],
            paymentMethodBreakdown: results[2],
            couponDiscount: dto.include_coupon_discount ? results[3] : null,
        };

        await this.redisService.setJson(cacheKey, result, this.CHART_CACHE_TTL);
        return result;
    }

    /**
     * Lấy dữ liệu bảng theo tab
     */
    async getTableData(dto: QueryRevenueTableDto) {
        const cacheKey = this.getCacheKey('tables', dto as any);
        const cached = await this.redisService.getJson<any>(cacheKey);
        if (cached) return cached;

        const { from, to } = this.resolveDateRange(dto);
        const limit = dto.limit || 20;
        const offset = dto.offset || 0;
        const tab = dto.tab || RevenueTableTab.TOP_ORGANIZATIONS;

        let result: any;

        switch (tab) {
            case RevenueTableTab.TOP_ORGANIZATIONS:
                result = await this.repository.getTopOrganizations(from, to, limit, offset);
                break;
            case RevenueTableTab.TOP_WAREHOUSES:
                result = await this.repository.getTopWarehouses(from, to, limit, offset);
                break;
            case RevenueTableTab.RECENT_TRANSACTIONS:
                result = await this.repository.getRecentTransactions(from, to, limit, offset);
                break;
        }

        result = { ...result, limit, offset, tab };
        await this.redisService.setJson(cacheKey, result, this.TABLE_CACHE_TTL);
        return result;
    }
}
