import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO query danh sách Insurance - Bảo hiểm
 */
export class QueryInsuranceDto {
  @ApiPropertyOptional({
    description: 'Số lượng bản ghi mỗi trang / Number of records per page',
    default: 10,
    minimum: 1,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: i18nValidationMessage('insurance.validation.limit_positive'),
  })
  @Min(1, {
    message: i18nValidationMessage('insurance.validation.limit_positive'),
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Vị trí bắt đầu / Starting position (offset)',
    default: 0,
    minimum: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: i18nValidationMessage('insurance.validation.offset_min'),
  })
  @Min(0, {
    message: i18nValidationMessage('insurance.validation.offset_min'),
  })
  offset?: number;

  @ApiPropertyOptional({
    description:
      'Từ khóa tìm kiếm theo tên hoặc mô tả / Search keywords by name or description',
    example: 'cao cấp',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('insurance.validation.keywords_string'),
  })
  keywords?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hoạt động / Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({
    message: i18nValidationMessage('insurance.validation.is_active_boolean'),
  })
  is_active?: boolean;
}
