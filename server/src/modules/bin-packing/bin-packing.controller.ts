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
import { IsOptional, IsUUID } from 'class-validator';
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

@ApiTags('Bin Packing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouse-manager/bin-packing')
export class BinPackingController {
  constructor(private readonly service: BinPackingService) {}

  @Post('compute')
  @ApiOperation({ summary: 'Tính toán xếp hàng 3D cho phiếu xuất' })
  compute(@Body() dto: ComputePackingDto) {
    return this.service.compute(dto.export_id, dto.fleet_vehicle_id);
  }

  @Get(':export_id')
  @ApiOperation({ summary: 'Lấy kết quả xếp hàng của phiếu xuất' })
  getByExportId(@Param('export_id', ParseUUIDPipe) exportId: string) {
    return this.service.getByExportId(exportId);
  }

  @Post(':export_id/apply')
  @ApiOperation({ summary: 'Xác nhận áp dụng phương án xếp hàng' })
  apply(@Param('export_id', ParseUUIDPipe) exportId: string) {
    return this.service.apply(exportId);
  }
}
