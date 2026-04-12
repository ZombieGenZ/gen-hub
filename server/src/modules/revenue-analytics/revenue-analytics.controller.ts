import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RevenueAnalyticsService } from './revenue-analytics.service';
import {
  ChartGranularity,
  DatePreset,
  QueryRevenueChartDto,
  QueryRevenueDto,
  QueryRevenueTableDto,
  RevenueTableTab,
  ExportRevenueDto,
} from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
  RequirePermission,
} from '../../common/decorators';
import { GetResponse, ResponseCode } from '../../common/responses';

@ApiTags('Revenue Analytics')
@Controller('admin/revenue-analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RevenueAnalyticsController {
  constructor(private readonly service: RevenueAnalyticsService) {}

  @Get('kpis')
  @RequirePermission('revenue.analytics.view')
  @ApiOperation({
    summary: 'Lấy dữ liệu KPI doanh thu',
    description:
      'Trả về 4 thẻ KPI doanh thu gồm doanh thu thuần, khoản chờ thanh toán, tiền phạt trả chậm và tổng hoàn trả. API hỗ trợ lọc theo preset thời gian hoặc khoảng ngày tùy chỉnh, đồng thời kèm sparkline để hiển thị xu hướng gần nhất. Yêu cầu quyền `revenue.analytics.view`.',
  })
  @ApiQuery({
    name: 'preset',
    required: false,
    enum: DatePreset,
    description: 'Preset khoảng thời gian cần thống kê.',
    example: DatePreset.THIS_MONTH,
  })
  @ApiQuery({
    name: 'from_date',
    required: false,
    type: String,
    description: 'Ngày bắt đầu theo ISO 8601, dùng khi `preset=CUSTOM`.',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'to_date',
    required: false,
    type: String,
    description: 'Ngày kết thúc theo ISO 8601, dùng khi `preset=CUSTOM`.',
    example: '2026-01-31',
  })
  @ApiQuery({
    name: 'province_id',
    required: false,
    type: String,
    description: 'Lọc theo tỉnh/thành.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiQuery({
    name: 'warehouse_template_id',
    required: false,
    type: String,
    description: 'Lọc theo kho hoặc warehouse template cụ thể.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy KPI doanh thu thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'revenue_analytics.kpi_success' },
        message: { type: 'string', example: 'Lấy KPI doanh thu thành công' },
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
      example: {
        code: 'revenue_analytics.kpi_success',
        message: 'Lấy KPI doanh thu thành công',
        success: true,
        data: {
          netRevenue: {
            value: 2400000000,
            count: 150,
            previousValue: 2100000000,
          },
          pending: { value: 350000000, count: 12, previousValue: 200000000 },
          overdue: { value: 50000000, count: 3, previousValue: 30000000 },
          refunded: { value: 80000000, count: 5, previousValue: 60000000 },
          sparkline: [
            { day: '2026-02-01', total: 150000000 },
            { day: '2026-02-02', total: 178000000 },
          ],
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async getKpis(@Query() dto: QueryRevenueDto, @I18nLang() lang: string) {
    const data = await this.service.getKpis(dto);
    return new GetResponse(
      ResponseCode.REVENUE_ANALYTICS_KPI_SUCCESS,
      data,
      lang === 'vi'
        ? 'Lấy KPI doanh thu thành công'
        : 'Revenue KPIs retrieved successfully',
    );
  }

  @Get('charts')
  @RequirePermission('revenue.analytics.view')
  @ApiOperation({
    summary: 'Lấy dữ liệu biểu đồ doanh thu',
    description:
      'Trả về dữ liệu biểu đồ dòng tiền theo thời gian, cơ cấu doanh thu addon hoặc bảo hiểm, breakdown phương thức thanh toán và tùy chọn hiển thị coupon discount. API phù hợp cho stacked bar chart, doughnut chart và các dashboard tổng hợp doanh thu. Yêu cầu quyền `revenue.analytics.view`.',
  })
  @ApiQuery({
    name: 'preset',
    required: false,
    enum: DatePreset,
    description: 'Preset khoảng thời gian cần thống kê.',
    example: DatePreset.THIS_MONTH,
  })
  @ApiQuery({
    name: 'from_date',
    required: false,
    type: String,
    description: 'Ngày bắt đầu theo ISO 8601, dùng khi `preset=CUSTOM`.',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'to_date',
    required: false,
    type: String,
    description: 'Ngày kết thúc theo ISO 8601, dùng khi `preset=CUSTOM`.',
    example: '2026-01-31',
  })
  @ApiQuery({
    name: 'province_id',
    required: false,
    type: String,
    description: 'Lọc theo tỉnh/thành.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiQuery({
    name: 'warehouse_template_id',
    required: false,
    type: String,
    description: 'Lọc theo kho hoặc warehouse template cụ thể.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiQuery({
    name: 'granularity',
    required: false,
    enum: ChartGranularity,
    description: 'Độ chi tiết của trục thời gian trên biểu đồ.',
    example: ChartGranularity.MONTH,
  })
  @ApiQuery({
    name: 'include_coupon_discount',
    required: false,
    type: Boolean,
    description:
      'Bao gồm dữ liệu giảm giá coupon dưới dạng cột âm trong biểu đồ.',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy dữ liệu biểu đồ thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'revenue_analytics.chart_success' },
        message: {
          type: 'string',
          example: 'Lấy biểu đồ doanh thu thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            timeSeries: {
              type: 'array',
              description:
                'Chuỗi thời gian doanh thu theo từng loại thanh toán',
              items: {
                type: 'object',
                properties: {
                  period: { type: 'string', example: '2026-01-01' },
                  type: { type: 'string', example: 'RENTAL' },
                  total: { type: 'number', example: 820000000 },
                },
              },
            },
            addonSeries: {
              type: 'array',
              description: 'Chuỗi thời gian doanh thu addon và bảo hiểm',
              items: {
                type: 'object',
                properties: {
                  period: { type: 'string', example: '2026-01-01' },
                  addon_total: { type: 'number', example: 120000000 },
                  insurance_total: { type: 'number', example: 45000000 },
                },
              },
            },
            paymentMethodBreakdown: {
              type: 'array',
              description: 'Phân bổ doanh thu theo phương thức thanh toán',
              items: {
                type: 'object',
                properties: {
                  payment_method: { type: 'string', example: 'BANK_TRANSFER' },
                  contract_count: { type: 'number', example: 10 },
                  total_amount: { type: 'number', example: 650000000 },
                },
              },
            },
            couponDiscount: {
              nullable: true,
              type: 'array',
              description:
                'Chuỗi thời gian giảm giá coupon (null nếu include_coupon_discount=false)',
              items: {
                type: 'object',
                properties: {
                  period: { type: 'string', example: '2026-01-01' },
                  total_discount: { type: 'number', example: 15000000 },
                },
              },
            },
          },
        },
      },
      example: {
        code: 'revenue_analytics.chart_success',
        message: 'Lấy biểu đồ doanh thu thành công',
        success: true,
        data: {
          timeSeries: [
            { period: '2026-01-01', type: 'RENTAL', total: 820000000 },
            { period: '2026-01-01', type: 'ADDON', total: 120000000 },
          ],
          addonSeries: [
            {
              period: '2026-01-01',
              addon_total: 120000000,
              insurance_total: 45000000,
            },
          ],
          paymentMethodBreakdown: [
            {
              payment_method: 'BANK_TRANSFER',
              contract_count: 10,
              total_amount: 650000000,
            },
            {
              payment_method: 'BALANCE',
              contract_count: 4,
              total_amount: 247000000,
            },
          ],
          couponDiscount: null,
        },
      },
    },
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
      lang === 'vi'
        ? 'Lấy biểu đồ doanh thu thành công'
        : 'Revenue charts retrieved successfully',
    );
  }

  @Get('tables')
  @RequirePermission('revenue.analytics.view')
  @ApiOperation({
    summary: 'Lấy dữ liệu bảng phân tích chi tiết',
    description:
      'Trả về dữ liệu dạng bảng cho từng tab phân tích gồm top tổ chức, top kho hoặc giao dịch gần đây. API hỗ trợ phân trang, lọc theo thời gian và kho để phục vụ các bảng dashboard quản trị doanh thu. Yêu cầu quyền `revenue.analytics.view`.',
  })
  @ApiQuery({
    name: 'preset',
    required: false,
    enum: DatePreset,
    description: 'Preset khoảng thời gian cần thống kê.',
    example: DatePreset.THIS_MONTH,
  })
  @ApiQuery({
    name: 'from_date',
    required: false,
    type: String,
    description: 'Ngày bắt đầu theo ISO 8601, dùng khi `preset=CUSTOM`.',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'to_date',
    required: false,
    type: String,
    description: 'Ngày kết thúc theo ISO 8601, dùng khi `preset=CUSTOM`.',
    example: '2026-01-31',
  })
  @ApiQuery({
    name: 'province_id',
    required: false,
    type: String,
    description: 'Lọc theo tỉnh/thành.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiQuery({
    name: 'warehouse_template_id',
    required: false,
    type: String,
    description: 'Lọc theo kho hoặc warehouse template cụ thể.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiQuery({
    name: 'tab',
    required: false,
    enum: RevenueTableTab,
    description: 'Tab dữ liệu cần hiển thị.',
    example: RevenueTableTab.TOP_ORGANIZATIONS,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số bản ghi trên mỗi trang.',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu của phân trang.',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy dữ liệu bảng thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'revenue_analytics.table_success' },
        message: { type: 'string', example: 'Lấy dữ liệu bảng thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            tab: { type: 'string', example: 'TOP_ORGANIZATIONS' },
            items: {
              type: 'array',
              description: 'Danh sách item theo tab được chọn',
              items: {
                type: 'object',
                description:
                  'TOP_ORGANIZATIONS: { id, name, tax_code, total_revenue, outstanding_debt, contract_count } | TOP_WAREHOUSES: { id, name, price_per_month, address_detail, total_revenue, contract_count } | RECENT_TRANSACTIONS: Payment object',
                properties: {
                  id: {
                    type: 'string',
                    example: '550e8400-e29b-41d4-a716-446655440100',
                  },
                  name: { type: 'string', example: 'Công ty ABC Logistics' },
                  tax_code: {
                    type: 'string',
                    nullable: true,
                    example: '0123456789',
                  },
                  total_revenue: { type: 'number', example: 980000000 },
                  outstanding_debt: { type: 'number', example: 50000000 },
                  contract_count: { type: 'number', example: 18 },
                },
              },
            },
            total: { type: 'number', example: 35 },
            limit: { type: 'number', example: 20 },
            offset: { type: 'number', example: 0 },
          },
        },
      },
      example: {
        code: 'revenue_analytics.table_success',
        message: 'Lấy dữ liệu bảng thành công',
        success: true,
        data: {
          tab: 'TOP_ORGANIZATIONS',
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440100',
              name: 'Công ty ABC Logistics',
              tax_code: '0123456789',
              total_revenue: 980000000,
              outstanding_debt: 50000000,
              contract_count: 18,
            },
          ],
          total: 35,
          limit: 20,
          offset: 0,
        },
      },
    },
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
      lang === 'vi'
        ? 'Lấy dữ liệu bảng thành công'
        : 'Revenue table data retrieved successfully',
    );
  }

  @Get('export')
  @RequirePermission('revenue.analytics.view')
  @ApiOperation({
    summary: 'Xuất báo cáo doanh thu ra Excel',
    description:
      'Tải về file Excel chứa báo cáo doanh thu theo bộ lọc. Yêu cầu quyền `revenue.analytics.view`.',
  })
  async export(@Query() dto: ExportRevenueDto, @Res() res: any) {
    const buffer = await this.service.exportReport(dto);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=revenue-report-${Date.now()}.xlsx`,
    );
    res.send(buffer);
  }
}
