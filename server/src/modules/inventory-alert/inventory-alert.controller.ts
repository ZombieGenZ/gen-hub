import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InventoryAlertService } from './inventory-alert.service';
import { CreateAlertConfigDto } from './dto/create-alert-config.dto';
import { QueryAlertDto, QueryAlertConfigDto } from './dto/query-alert.dto';

@ApiTags('Inventory Alert')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/inventory-alert')
export class InventoryAlertController {
  constructor(private readonly service: InventoryAlertService) {}

  // ── Config endpoints ────────────────────────────────────────────────────

  @Post('configs')
  @ApiOperation({ summary: 'Tạo hoặc cập nhật cấu hình cảnh báo tồn kho' })
  upsertConfig(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateAlertConfigDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.upsertConfig(orgId, dto, req.user.id);
  }

  @Get('configs')
  @ApiOperation({ summary: 'Danh sách cấu hình cảnh báo' })
  listConfigs(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: QueryAlertConfigDto,
  ) {
    return this.service.listConfigs(orgId, query);
  }

  @Delete('configs/:configId')
  @ApiOperation({ summary: 'Xóa cấu hình cảnh báo' })
  deleteConfig(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('configId', ParseUUIDPipe) configId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.deleteConfig(orgId, configId, req.user.id);
  }

  // ── Alert endpoints ─────────────────────────────────────────────────────

  @Get('alerts')
  @ApiOperation({ summary: 'Danh sách cảnh báo tồn kho' })
  listAlerts(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: QueryAlertDto,
  ) {
    return this.service.listAlerts(orgId, query);
  }

  @Get('alerts/stats')
  @ApiOperation({ summary: 'Thống kê cảnh báo chưa xử lý' })
  getStats(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.service.getAlertStats(orgId);
  }

  @Patch('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Đánh dấu cảnh báo đã xử lý' })
  resolveAlert(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('alertId', ParseUUIDPipe) alertId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.resolveAlert(orgId, alertId, req.user.id);
  }
}
