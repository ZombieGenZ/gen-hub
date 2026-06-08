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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VehicleLogService } from './warehouse-vehicle-log.service';
import { CreateVehicleLogDto } from './dto/create-vehicle-log.dto';
import { QueryVehicleLogDto } from './dto/query-vehicle-log.dto';

@ApiTags('Vehicle Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouse-manager/vehicle-log')
export class VehicleLogController {
  constructor(private readonly service: VehicleLogService) {}

  @Post()
  @ApiOperation({ summary: 'Ghi nhận xe vào kho' })
  create(
    @Body() dto: CreateVehicleLogDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách xe ra vào' })
  list(@Query() query: QueryVehicleLogDto) {
    return this.service.list(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Danh sách xe đang trong kho' })
  @ApiQuery({ name: 'warehouse_template_id', required: false })
  listActive(@Query('warehouse_template_id') warehouseTemplateId?: string) {
    return this.service.listActive(warehouseTemplateId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê xe trong kho hôm nay' })
  @ApiQuery({ name: 'warehouse_template_id', required: false })
  getStats(@Query('warehouse_template_id') warehouseTemplateId?: string) {
    return this.service.getDashboardStats(warehouseTemplateId);
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Tìm thông tin xe theo biển số' })
  @ApiQuery({ name: 'license_plate', required: true })
  @ApiQuery({ name: 'warehouse_template_id', required: true })
  lookup(
    @Query('license_plate') licensePlate: string,
    @Query('warehouse_template_id') warehouseTemplateId: string,
  ) {
    return this.service.lookup(licensePlate, warehouseTemplateId);
  }

  @Post('ocr-plate')
  @ApiOperation({ summary: 'OCR biển số xe từ ảnh camera' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  ocrPlate(@UploadedFile() file: Express.Multer.File) {
    return this.service.ocrPlate(file);
  }

  @Post('ocr-plate/quick')
  @ApiOperation({
    summary: 'OCR nhanh biển số (không upload ảnh, dùng cho auto-scan)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  ocrPlateQuick(@UploadedFile() file: Express.Multer.File) {
    return this.service.ocrPlateQuick(file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nhật ký xe' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/exit')
  @ApiOperation({ summary: 'Ghi nhận xe ra khỏi kho' })
  recordExit(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.recordExit(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nhật ký xe' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.delete(id, req.user.id);
  }
}
