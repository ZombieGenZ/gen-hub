import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WarehouseOpsAnalyticsService } from './warehouse-ops-analytics.service';

@ApiTags('Warehouse Ops Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouse-manager/ops-analytics')
export class WarehouseOpsAnalyticsController {
  constructor(private readonly service: WarehouseOpsAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Tổng quan hoạt động kho trong ngày (xe, dock, GPS)' })
  @ApiQuery({ name: 'warehouse_template_id', required: true })
  getOverview(@Query('warehouse_template_id') warehouseTemplateId: string) {
    return this.service.getOverview(warehouseTemplateId);
  }

  @Get('vehicle-trend')
  @ApiOperation({ summary: 'Xu hướng xe ra vào theo ngày' })
  @ApiQuery({ name: 'warehouse_template_id', required: true })
  @ApiQuery({ name: 'days', required: false, description: 'Số ngày nhìn lại, mặc định 7' })
  getVehicleTrend(
    @Query('warehouse_template_id') warehouseTemplateId: string,
    @Query('days') days?: string,
  ) {
    return this.service.getVehicleTrend(warehouseTemplateId, Number(days) || 7);
  }

  @Get('dock-stats')
  @ApiOperation({ summary: 'Thống kê theo từng dock trong ngày' })
  @ApiQuery({ name: 'warehouse_template_id', required: true })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD, mặc định hôm nay' })
  getDockStats(
    @Query('warehouse_template_id') warehouseTemplateId: string,
    @Query('date') date?: string,
  ) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    return this.service.getDockStats(warehouseTemplateId, targetDate);
  }
}
