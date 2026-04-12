import { IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class QueryBatchDto {
  @ApiPropertyOptional({ description: 'Số lượng bản ghi tối đa', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('batch.validation.limit_int') })
  @Min(1, { message: i18nValidationMessage('batch.validation.limit_min') })
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('batch.validation.offset_int') })
  @Min(0, { message: i18nValidationMessage('batch.validation.offset_min') })
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (mã lô)' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('batch.validation.keywords_string'),
  })
  keywords?: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({
    message: i18nValidationMessage('batch.validation.is_active_boolean'),
  })
  is_active?: boolean;
}
