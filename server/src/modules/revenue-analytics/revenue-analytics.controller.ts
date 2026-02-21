import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RevenueAnalyticsService } from './revenue-analytics.service';
import { QueryRevenueDto, QueryRevenueChartDto, QueryRevenueTableDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import { GetResponse, ResponseCode } from '../../common/responses';

/**
 * Revenue Analytics Controller
 * API endpoints cho báo cáo doanh thu & dòng tiền (Admin)
 */
@ApiTags('Revenue Analytics')
@Controller('admin/revenue-analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RevenueAnalyticsController {
    constructor(private readonly service: RevenueAnalyticsService) { }

    /**
     * Lấy dữ liệu 4 KPI cards + sparkline
     */
    @Get('kpis')
    @RequirePermission('revenue.analytics.view')
    @ApiOperation({
        summary: 'Lấy dữ liệu KPI doanh thu',
        description: 'Trả về 4 thẻ KPI: Doanh thu thuần, Chờ thanh toán, Tiền phạt trả chậm, Tổng hoàn trả. Kèm sparkline 14 ngày gần nhất và % thay đổi so với kỳ trước.',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy KPI doanh thu thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'revenue_analytics.kpi_success' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        netRevenue: {
                            type: 'object',
                            properties: {
                                value: { type: 'number', example: 2400000000 },
                                count: { type: 'number', example: 150 },
                                previousValue: { type: 'number', example: 2100000000 },
                            },
                        },
                        pending: {
                            type: 'object',
                            properties: {
                                value: { type: 'number', example: 350000000 },
                                count: { type: 'number', example: 12 },
                                previousValue: { type: 'number', example: 200000000 },
                            },
                        },
                        overdue: {
                            type: 'object',
                            properties: {
                                value: { type: 'number', example: 50000000 },
                                count: { type: 'number', example: 3 },
                                previousValue: { type: 'number', example: 30000000 },
                            },
                        },
                        refunded: {
                            type: 'object',
                            properties: {
                                value: { type: 'number', example: 80000000 },
                                count: { type: 'number', example: 5 },
                                previousValue: { type: 'number', example: 60000000 },
                            },
                        },
                        sparkline: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    day: { type: 'string', example: '2026-02-01' },
                                    total: { type: 'number', example: 150000000 },
                                },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async getKpis(
        @Query() dto: QueryRevenueDto,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.getKpis(dto);
        return new GetResponse(
            ResponseCode.REVENUE_ANALYTICS_KPI_SUCCESS,
            data,
            lang === 'vi' ? 'Lấy KPI doanh thu thành công' : 'Revenue KPIs retrieved successfully',
        );
    }

    /**
     * Lấy dữ liệu biểu đồ (time series + payment method breakdown)
     */
    @Get('charts')
    @RequirePermission('revenue.analytics.view')
    @ApiOperation({
        summary: 'Lấy dữ liệu biểu đồ doanh thu',
        description: 'Trả về dữ liệu biểu đồ dòng tiền theo thời gian (stacked bar), addon/insurance, payment method breakdown (doughnut), và coupon discount (tùy chọn).',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy dữ liệu biểu đồ thành công',
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async getCharts(
        @Query() dto: QueryRevenueChartDto,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.getChartData(dto);
        return new GetResponse(
            ResponseCode.REVENUE_ANALYTICS_CHART_SUCCESS,
            data,
            lang === 'vi' ? 'Lấy biểu đồ doanh thu thành công' : 'Revenue charts retrieved successfully',
        );
    }

    /**
     * Lấy dữ liệu bảng theo tab (Top Orgs / Top Warehouses / Recent Transactions)
     */
    @Get('tables')
    @RequirePermission('revenue.analytics.view')
    @ApiOperation({
        summary: 'Lấy dữ liệu bảng phân tích chi tiết',
        description: 'Trả về dữ liệu bảng theo tab: Top Organizations, Top Warehouses, hoặc Recent Transactions. Hỗ trợ phân trang.',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy dữ liệu bảng thành công',
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async getTables(
        @Query() dto: QueryRevenueTableDto,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.getTableData(dto);
        return new GetResponse(
            ResponseCode.REVENUE_ANALYTICS_TABLE_SUCCESS,
            data,
            lang === 'vi' ? 'Lấy dữ liệu bảng thành công' : 'Revenue table data retrieved successfully',
        );
    }
}
