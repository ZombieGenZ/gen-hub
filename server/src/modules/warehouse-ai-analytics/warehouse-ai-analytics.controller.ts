import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WarehouseAiAnalyticsService } from './warehouse-ai-analytics.service';

@ApiTags('Warehouse AI Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/warehouse-ai-analytics')
export class WarehouseAiAnalyticsController {
  constructor(private readonly service: WarehouseAiAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'KPI tổng quan AI impression cho kho' })
  @ApiQuery({ name: 'warehouse_template_id', required: true })
  getOverview(@Query('warehouse_template_id') id: string) {
    return this.service.getOverview(id);
  }

  @Get('funnel')
  @ApiOperation({
    summary: 'Phễu chuyển đổi: Impression → Visit → Consultation → Contract',
  })
  @ApiQuery({ name: 'warehouse_template_id', required: true })
  getFunnel(@Query('warehouse_template_id') id: string) {
    return this.service.getFunnel(id);
  }

  @Get('price-position')
  @ApiOperation({ summary: 'Vị trí giá của kho so với khu vực (tỉnh/thành)' })
  @ApiQuery({ name: 'warehouse_template_id', required: true })
  getPricePosition(@Query('warehouse_template_id') id: string) {
    return this.service.getPricePosition(id);
  }

  @Get('recent-queries')
  @ApiOperation({ summary: '20 query AI gần nhất đã hiển thị kho này' })
  @ApiQuery({ name: 'warehouse_template_id', required: true })
  getRecentQueries(@Query('warehouse_template_id') id: string) {
    return this.service.getRecentQueries(id);
  }
}
