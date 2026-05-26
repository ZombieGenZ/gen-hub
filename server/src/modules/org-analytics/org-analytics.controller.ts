import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { OrgAnalyticsService } from './services/org-analytics.service';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import { GetResponse } from '../../common/responses';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';
import { OrgPermissionGuard } from '../../common/guards/org-permission.guard';
import { RequireOrgPermission } from '../../common/decorators/require-org-permission.decorator';

const ORG_ID = '550e8400-e29b-41d4-a716-446655440099';

const successSchema = (
  code: string,
  message: string,
  dataSchema: Record<string, unknown>,
) => ({
  type: 'object',
  properties: {
    code: { type: 'string', example: code },
    message: { type: 'string', example: message },
    success: { type: 'boolean', example: true },
    data: dataSchema,
  },
});

@ApiTags('Organization Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
@Controller('organizations/:orgId/analytics')
export class OrgAnalyticsController {
  constructor(private readonly analyticsService: OrgAnalyticsService) {}

  @Get('overview')
  @RequireOrgPermission('org.analytics.view', 'org.analytics.view.all')
  @ApiOperation({
    summary: 'Lấy dữ liệu tổng quan KPI',
    description:
      'Trả về bộ chỉ số tổng quan của tổ chức như tổng tồn kho, số lượng đơn xuất, đơn nhập, hợp đồng đang hoạt động và xu hướng tăng giảm gần đây. ' +
      'Dữ liệu phù hợp để hiển thị khu vực overview của dashboard.',
  })
  @ApiParam({
    name: 'orgId',
    required: true,
    type: String,
    description: 'ID của tổ chức cần lấy dữ liệu analytics',
    example: ORG_ID,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy dữ liệu tổng quan KPI thành công',
    schema: successSchema(
      'org_analytics.overview_success',
      'Lấy dữ liệu tổng quan KPI thành công',
      {
        type: 'object',
        properties: {
          totalStock: {
            type: 'number',
            description: 'Tổng số lượng tồn kho hiện tại',
            example: 2480,
          },
          totalStockTrend: {
            type: 'object',
            properties: {
              value: { type: 'string', example: '+12.5%' },
              direction: { type: 'string', example: 'up' },
              label: { type: 'string', example: 'so với tuần trước' },
            },
          },
          outboundOrders: {
            type: 'number',
            description: 'Tổng số phiếu xuất kho',
            example: 156,
          },
          outboundOrdersTrend: {
            type: 'object',
            properties: {
              value: { type: 'string', example: '+8.2%' },
              direction: { type: 'string', example: 'up' },
              label: { type: 'string', example: 'so với tuần trước' },
            },
          },
          inboundShipments: {
            type: 'number',
            description: 'Tổng số phiếu nhập kho',
            example: 74,
          },
          inboundShipmentsTrend: {
            type: 'object',
            properties: {
              value: { type: 'string', example: '-3.1%' },
              direction: { type: 'string', example: 'down' },
              label: { type: 'string', example: 'so với tuần trước' },
            },
          },
          activeContracts: {
            type: 'number',
            description: 'Số hợp đồng còn hiệu lực',
            example: 18,
          },
          expiringContracts: {
            type: 'number',
            description: 'Số hợp đồng sắp hết hạn trong 30 ngày tới',
            example: 4,
          },
          efficiency: {
            type: 'number',
            description: 'Chỉ số hiệu quả tổng hợp',
            example: 0,
          },
        },
        example: {
          totalStock: 2480,
          totalStockTrend: {
            value: '+12.5%',
            direction: 'up',
            label: 'so với tuần trước',
          },
          outboundOrders: 156,
          outboundOrdersTrend: {
            value: '+8.2%',
            direction: 'up',
            label: 'so với tuần trước',
          },
          inboundShipments: 74,
          inboundShipmentsTrend: {
            value: '-3.1%',
            direction: 'down',
            label: 'so với tuần trước',
          },
          activeContracts: 18,
          expiringContracts: 4,
          efficiency: 0,
        },
      },
    ),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async getOverview(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @I18nLang() lang: string,
  ) {
    const data = await this.analyticsService.getOverview(orgId);
    return new GetResponse(
      'org_analytics.overview_success',
      data,
      'Lấy dữ liệu tổng quan KPI thành công',
    );
  }

  @Get('stock-flow')
  @RequireOrgPermission('org.analytics.view', 'org.analytics.view.all')
  @ApiOperation({
    summary: 'Lấy biểu đồ dòng hàng',
    description:
      'Lấy dữ liệu inbound và outbound theo từng ngày trong khoảng thời gian yêu cầu để hiển thị biểu đồ biến động nhập xuất kho.',
  })
  @ApiParam({
    name: 'orgId',
    required: true,
    type: String,
    description: 'ID của tổ chức cần thống kê dòng hàng',
    example: ORG_ID,
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Số ngày thống kê gần nhất, mặc định là 7',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy dữ liệu biểu đồ dòng hàng thành công',
    schema: successSchema(
      'org_analytics.stock_flow_success',
      'Lấy dữ liệu biểu đồ dòng hàng thành công',
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            day: { type: 'string', example: 'T2' },
            fullDate: { type: 'string', example: '2026-03-25' },
            inbound: { type: 'number', example: 120 },
            outbound: { type: 'number', example: 95 },
          },
        },
        example: [
          { day: 'T2', fullDate: '2026-03-25', inbound: 120, outbound: 95 },
          { day: 'T3', fullDate: '2026-03-26', inbound: 80, outbound: 130 },
        ],
      },
    ),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async getStockFlow(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('days') days: number = 7,
    @I18nLang() lang: string,
  ) {
    const parsedDays = Number(days) || 7;
    const data = await this.analyticsService.getStockFlow(orgId, parsedDays);
    return new GetResponse(
      'org_analytics.stock_flow_success',
      data,
      'Lấy dữ liệu biểu đồ dòng hàng thành công',
    );
  }

  @Get('top-products')
  @RequireOrgPermission('org.analytics.view', 'org.analytics.view.all')
  @ApiOperation({
    summary: 'Lấy top sản phẩm',
    description:
      'Lấy danh sách các sản phẩm có tồn kho cao nhất trong tổ chức để phục vụ dashboard phân tích hàng hóa nổi bật.',
  })
  @ApiParam({
    name: 'orgId',
    required: true,
    type: String,
    description: 'ID của tổ chức cần lấy top sản phẩm',
    example: ORG_ID,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng sản phẩm cần lấy, mặc định là 5',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy top sản phẩm thành công',
    schema: successSchema(
      'org_analytics.top_products_success',
      'Lấy top sản phẩm thành công',
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'product-01' },
            name: { type: 'string', example: 'Kệ thép 3 tầng' },
            count: { type: 'number', example: 420 },
            unit: { type: 'string', example: 'Bộ' },
            trend: { type: 'string', example: 'up' },
            data: {
              type: 'array',
              items: { type: 'number' },
              example: [120, 180, 210, 250, 320, 420],
            },
          },
        },
        example: [
          {
            id: 'product-01',
            name: 'Kệ thép 3 tầng',
            count: 420,
            unit: 'Bộ',
            trend: 'up',
            data: [120, 180, 210, 250, 320, 420],
          },
        ],
      },
    ),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async getTopProducts(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('limit') limit: number = 5,
    @I18nLang() lang: string,
  ) {
    const parsedLimit = Number(limit) || 5;
    const data = await this.analyticsService.getTopProducts(orgId, parsedLimit);
    return new GetResponse(
      'org_analytics.top_products_success',
      data,
      'Lấy top sản phẩm thành công',
    );
  }

  @Get('stock-alerts')
  @RequireOrgPermission('org.analytics.view', 'org.analytics.view.all')
  @ApiOperation({
    summary: 'Lấy danh sách cảnh báo tồn kho',
    description:
      'Lấy danh sách sản phẩm sắp hết hàng và các lô hàng sắp hết hạn để hiển thị cảnh báo vận hành kho.',
  })
  @ApiParam({
    name: 'orgId',
    required: true,
    type: String,
    description: 'ID của tổ chức cần lấy cảnh báo tồn kho',
    example: ORG_ID,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách cảnh báo tồn kho thành công',
    schema: successSchema(
      'org_analytics.stock_alerts_success',
      'Lấy danh sách cảnh báo tồn kho thành công',
      {
        type: 'object',
        properties: {
          lowStock: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Thùng carton A1' },
                left: { type: 'number', example: 12 },
                min: { type: 'number', example: 100 },
                unit: { type: 'string', example: 'Thùng' },
              },
            },
          },
          expired: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Màng bọc PE' },
                left: { type: 'number', example: 40 },
                unit: { type: 'string', example: 'Cuộn' },
                expiry: { type: 'string', example: '15/04/2026' },
              },
            },
          },
        },
        example: {
          lowStock: [
            { name: 'Thùng carton A1', left: 12, min: 100, unit: 'Thùng' },
          ],
          expired: [
            {
              name: 'Màng bọc PE',
              left: 40,
              unit: 'Cuộn',
              expiry: '15/04/2026',
            },
          ],
        },
      },
    ),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async getStockAlerts(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @I18nLang() lang: string,
  ) {
    const data = await this.analyticsService.getStockAlerts(orgId);
    return new GetResponse(
      'org_analytics.stock_alerts_success',
      data,
      'Lấy danh sách cảnh báo tồn kho thành công',
    );
  }

  @Get('dock-overview')
  @RequireOrgPermission('org.analytics.view', 'org.analytics.view.all')
  @ApiOperation({ summary: 'Tổng quan lịch dock của tổ chức' })
  @ApiParam({ name: 'orgId', required: true, type: String })
  @ApiAuthResponses()
  async getDockOverview(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @I18nLang() _lang: string,
  ) {
    const data = await this.analyticsService.getDockOverview(orgId);
    return new GetResponse('org_analytics.dock_overview_success', data, 'Lấy tổng quan lịch dock thành công');
  }

  @Get('dock-trend')
  @RequireOrgPermission('org.analytics.view', 'org.analytics.view.all')
  @ApiOperation({ summary: 'Xu hướng lịch dock theo ngày của tổ chức' })
  @ApiParam({ name: 'orgId', required: true, type: String })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiAuthResponses()
  async getDockTrend(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('days') days: number = 7,
    @I18nLang() _lang: string,
  ) {
    const data = await this.analyticsService.getDockTrend(orgId, Number(days) || 7);
    return new GetResponse('org_analytics.dock_trend_success', data, 'Lấy xu hướng lịch dock thành công');
  }

  @Get('recent-shipments')
  @RequireOrgPermission('org.analytics.view', 'org.analytics.view.all')
  @ApiOperation({
    summary: 'Lấy tiến độ vận đơn gần đây',
    description:
      'Lấy danh sách các phiếu nhập và xuất mới nhất của tổ chức, sắp xếp theo thời gian giảm dần để hiển thị timeline hoạt động.',
  })
  @ApiParam({
    name: 'orgId',
    required: true,
    type: String,
    description: 'ID của tổ chức cần lấy vận đơn gần đây',
    example: ORG_ID,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng vận đơn gần đây cần lấy, mặc định là 5',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy tiến độ vận đơn gần đây thành công',
    schema: successSchema(
      'org_analytics.recent_shipments_success',
      'Lấy tiến độ vận đơn gần đây thành công',
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'PX-2026-0001' },
            type: { type: 'string', example: 'Xuất' },
            partner: { type: 'string', example: 'Công ty ABC' },
            date: { type: 'string', example: '31/03/2026' },
            status: { type: 'string', example: 'Đang giao / Hoàn tất' },
            timestamp: { type: 'number', example: 1774915200000 },
          },
        },
        example: [
          {
            id: 'PX-2026-0001',
            type: 'Xuất',
            partner: 'Công ty ABC',
            date: '31/03/2026',
            status: 'Đang giao / Hoàn tất',
            timestamp: 1774915200000,
          },
        ],
      },
    ),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async getRecentShipments(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('limit') limit: number = 5,
    @I18nLang() lang: string,
  ) {
    const parsedLimit = Number(limit) || 5;
    const data = await this.analyticsService.getRecentShipments(
      orgId,
      parsedLimit,
    );
    return new GetResponse(
      'org_analytics.recent_shipments_success',
      data,
      'Lấy tiến độ vận đơn gần đây thành công',
    );
  }
}
