import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueryRevenueDto } from './query-revenue.dto';

export enum RevenueTableTab {
  TOP_ORGANIZATIONS = 'TOP_ORGANIZATIONS',
  TOP_WAREHOUSES = 'TOP_WAREHOUSES',
  RECENT_TRANSACTIONS = 'RECENT_TRANSACTIONS',
}

export class QueryRevenueTableDto extends QueryRevenueDto {
  @ApiPropertyOptional({
    enum: RevenueTableTab,
    default: RevenueTableTab.TOP_ORGANIZATIONS,
    description: 'Tab dữ liệu cần hiển thị',
  })
  @IsOptional()
  @IsEnum(RevenueTableTab)
  tab?: RevenueTableTab;

  @ApiPropertyOptional({ default: 20, description: 'Số bản ghi mỗi trang' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0, description: 'Vị trí bắt đầu' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  offset?: number;
}
