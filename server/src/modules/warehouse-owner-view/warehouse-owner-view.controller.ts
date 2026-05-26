import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { WarehouseOwnerViewService } from './warehouse-owner-view.service';

@ApiTags('Warehouse Owner View (Landlord)')
@ApiBearerAuth()
@Controller('organizations/:orgId/warehouse-owner')
export class WarehouseOwnerViewController {
  constructor(private readonly service: WarehouseOwnerViewService) {}

  @Get('warehouses')
  @ApiParam({ name: 'orgId', type: String })
  @ApiOperation({ summary: 'Danh sách kho bãi của chủ kho (có thống kê tenant & doanh thu)' })
  getMyWarehouses(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.service.getMyWarehouses(orgId);
  }

  @Get('warehouses/:templateId/overview')
  @ApiParam({ name: 'orgId', type: String })
  @ApiParam({ name: 'templateId', type: String })
  @ApiOperation({ summary: 'Tổng quan chi tiết 1 kho — KPI & thống kê nhanh' })
  getWarehouseOverview(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.service.getWarehouseOverview(orgId, templateId);
  }

  @Get('warehouses/:templateId/tenants')
  @ApiParam({ name: 'orgId', type: String })
  @ApiParam({ name: 'templateId', type: String })
  @ApiOperation({ summary: 'Danh sách khách thuê đang hoạt động — thông tin tổ chức & hợp đồng' })
  getWarehouseTenants(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.service.getWarehouseTenants(orgId, templateId);
  }

  @Get('warehouses/:templateId/contracts')
  @ApiParam({ name: 'orgId', type: String })
  @ApiParam({ name: 'templateId', type: String })
  @ApiOperation({ summary: 'Lịch sử toàn bộ hợp đồng của kho — có pagination & filter' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getWarehouseContracts(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getWarehouseContracts(orgId, templateId, {
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('warehouses/:templateId/revenue')
  @ApiParam({ name: 'orgId', type: String })
  @ApiParam({ name: 'templateId', type: String })
  @ApiOperation({ summary: 'Doanh thu: hợp đồng vs thực thu — breakdown 6 tháng' })
  getWarehouseRevenue(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.service.getWarehouseRevenue(orgId, templateId);
  }
}
