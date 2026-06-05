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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FleetVehicleStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FleetService } from './fleet.service';
import { CreateFleetVehicleDto } from './dto/create-fleet-vehicle.dto';
import { UpdateFleetVehicleDto } from './dto/update-fleet-vehicle.dto';
import { UpdateFleetStatusDto } from './dto/update-fleet-status.dto';

@ApiTags('Fleet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouse-manager/fleet')
export class FleetController {
  constructor(private readonly service: FleetService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm xe đội vận chuyển' })
  create(
    @Body() dto: CreateFleetVehicleDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách xe đội vận chuyển' })
  @ApiQuery({ name: 'warehouse_id', required: false })
  @ApiQuery({ name: 'status', required: false, enum: FleetVehicleStatus })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  list(
    @Query('warehouse_id') warehouseId?: string,
    @Query('status') status?: FleetVehicleStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.list({
      warehouse_id: warehouseId,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('available')
  @ApiOperation({ summary: 'Danh sách xe sẵn sàng (AVAILABLE)' })
  @ApiQuery({ name: 'warehouse_id', required: true })
  listAvailable(@Query('warehouse_id') warehouseId: string) {
    return this.service.findAvailable(warehouseId);
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'Danh sách tất cả kho trong hệ thống (dùng cho admin)' })
  listAllWarehouses() {
    return this.service.listAllWarehouses();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết xe' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin xe' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFleetVehicleDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.update(id, dto, req.user.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái xe' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFleetStatusDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.updateStatus(id, dto.status, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa xe (soft delete)' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.delete(id, req.user.id);
  }
}
