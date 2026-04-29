import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO query danh sách phiếu kiểm kê
 */
export class QueryStockTakeDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID kho',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái',
    enum: ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ADJUSTED', 'CANCELLED'],
  })
  @IsOptional()
  @IsIn(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ADJUSTED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo mã phiếu', example: 'KK-2026' })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({ description: 'Số bản ghi mỗi trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
