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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DockScheduleService } from './dock-schedule.service';
import { CreateDockScheduleDto } from './dto/create-dock-schedule.dto';
import { QueryDockScheduleDto } from './dto/query-dock-schedule.dto';
import { CancelDockScheduleDto } from './dto/cancel-dock-schedule.dto';

@ApiTags('Dock Schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouse-manager/dock-schedule')
export class DockScheduleController {
  constructor(private readonly service: DockScheduleService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo lịch đặt dock' })
  create(
    @Body() dto: CreateDockScheduleDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách lịch dock (staff xem tất cả)' })
  list(@Query() query: QueryDockScheduleDto) {
    return this.service.list(query);
  }

  @Get('slots')
  @ApiOperation({ summary: 'Xem availability từng dock trong ngày' })
  @ApiQuery({ name: 'warehouse_template_id', required: true })
  @ApiQuery({ name: 'date', required: true, example: '2026-06-01' })
  getSlots(
    @Query('warehouse_template_id') warehouseTemplateId: string,
    @Query('date') date: string,
  ) {
    return this.service.getSlots(warehouseTemplateId, date);
  }

  @Get('my')
  @ApiOperation({ summary: 'Lịch dock của tổ chức hiện tại' })
  @ApiQuery({ name: 'organization_id', required: true })
  listMy(
    @Query('organization_id') organizationId: string,
    @Query() query: QueryDockScheduleDto,
  ) {
    return this.service.list({ ...query, organization_id: organizationId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết lịch dock' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Staff xác nhận lịch dock' })
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.confirm(id, req.user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Huỷ lịch dock' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelDockScheduleDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.cancel(id, req.user.id, dto);
  }

  @Patch(':id/arrive')
  @ApiOperation({ summary: 'Ghi nhận xe đến dock — tự tạo VehicleLog và link lại' })
  markArrived(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.markArrived(id, req.user.id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Hoàn thành lịch dock — ghi nhận xe ra' })
  markCompleted(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.markCompleted(id, req.user.id);
  }

  @Patch(':id/no-show')
  @ApiOperation({ summary: 'Đánh dấu xe không đến (no-show)' })
  markNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.markNoShow(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá lịch dock' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.delete(id, req.user.id);
  }
}
