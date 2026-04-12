import { IsOptional, IsInt, Min, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO cho query params của Warehouse Manager View APIs
 */
export class QueryWarehouseManagerViewDto {
  @ApiPropertyOptional({
    description: 'Số lượng record mỗi trang',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Vị trí bắt đầu (offset)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo từ khóa (tên, mã, mô tả)',
    example: 'Kho A',
  })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hoạt động',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_active?: boolean;
}
