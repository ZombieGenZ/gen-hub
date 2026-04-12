import { IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DatePreset {
  TODAY = 'TODAY',
  THIS_WEEK = 'THIS_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  THIS_QUARTER = 'THIS_QUARTER',
  CUSTOM = 'CUSTOM',
}

export class QueryRevenueDto {
  @ApiPropertyOptional({
    enum: DatePreset,
    default: DatePreset.THIS_MONTH,
    description: 'Preset khoảng thời gian',
  })
  @IsOptional()
  @IsEnum(DatePreset)
  preset?: DatePreset;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu (ISO 8601), dùng khi preset=CUSTOM',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc (ISO 8601), dùng khi preset=CUSTOM',
    example: '2026-01-31',
  })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiPropertyOptional({ description: 'Lọc theo tỉnh/thành (UUID)' })
  @IsOptional()
  @IsUUID('4')
  province_id?: string;

  @ApiPropertyOptional({ description: 'Lọc theo kho cụ thể (UUID)' })
  @IsOptional()
  @IsUUID('4')
  warehouse_template_id?: string;
}
