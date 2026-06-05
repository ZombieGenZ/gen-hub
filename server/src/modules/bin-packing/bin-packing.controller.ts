import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BinPackingService } from './bin-packing.service';

class ComputePackingDto {
  @ApiProperty()
  @IsUUID()
  export_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  fleet_vehicle_id?: string;
}

class ComputeVehicleDto {
  @ApiProperty()
  @IsUUID()
  fleet_vehicle_id: string;

  @ApiProperty({ type: [String], description: 'Danh sách export_id cần gộp vào 1 xe' })
  @IsArray()
  @IsUUID('4', { each: true })
  export_ids: string[];
}

@ApiTags('Bin Packing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouse-manager/bin-packing')
export class BinPackingController {
  constructor(private readonly service: BinPackingService) {}

  @Post('compute')
  @ApiOperation({ summary: 'Tính toán xếp hàng 3D cho 1 phiếu xuất' })
  compute(@Body() dto: ComputePackingDto) {
    return this.service.compute(dto.export_id, dto.fleet_vehicle_id);
  }

  @Post('compute-vehicle')
  @ApiOperation({ summary: 'Tính xếp hàng tổng hợp nhiều phiếu xuất vào 1 xe' })
  computeVehicle(@Body() dto: ComputeVehicleDto) {
    return this.service.computeVehicle(dto.fleet_vehicle_id, dto.export_ids);
  }

  // Static routes trước param routes
  @Get('vehicle/:vehicle_id')
  @ApiOperation({ summary: 'Lấy kết quả xếp hàng tổng hợp của xe' })
  getByVehicleId(@Param('vehicle_id', ParseUUIDPipe) vehicleId: string) {
    return this.service.getByVehicleId(vehicleId);
  }

  @Get(':export_id')
  @ApiOperation({ summary: 'Lấy kết quả xếp hàng của 1 phiếu xuất' })
  getByExportId(@Param('export_id', ParseUUIDPipe) exportId: string) {
    return this.service.getByExportId(exportId);
  }

  @Post(':export_id/apply')
  @ApiOperation({ summary: 'Xác nhận áp dụng phương án xếp hàng' })
  apply(@Param('export_id', ParseUUIDPipe) exportId: string) {
    return this.service.apply(exportId);
  }
}
