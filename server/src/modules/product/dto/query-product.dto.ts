import { IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class QueryProductDto {
  @ApiPropertyOptional({ description: 'Số lượng bản ghi tối đa', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('product.validation.limit_int') })
  @Min(1, { message: i18nValidationMessage('product.validation.limit_min') })
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('product.validation.offset_int') })
  @Min(0, { message: i18nValidationMessage('product.validation.offset_min') })
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (tên, SKU, barcode)' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('product.validation.keywords_string'),
  })
  keywords?: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({
    message: i18nValidationMessage('product.validation.is_active_boolean'),
  })
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'ID kho — khi có sẽ trả thêm quantity_available theo kho này',
  })
  @IsOptional()
  @IsString()
  warehouse_id?: string;
}
