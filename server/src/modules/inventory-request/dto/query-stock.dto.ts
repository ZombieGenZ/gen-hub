import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho query danh sách tồn kho theo kho
 */
export class QueryStockDto {
  @ApiPropertyOptional({
    description: 'ID kho cần lọc tồn kho',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tên hoặc mã sản phẩm',
    example: 'Táo Envy',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'inventory-request.validation.keywords_string',
    ),
  })
  keywords?: string;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi trên trang',
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, {
    message: i18nValidationMessage(
      'inventory-request.validation.limit_positive',
    ),
  })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Vị trí bắt đầu (offset)',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
