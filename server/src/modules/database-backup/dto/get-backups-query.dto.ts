import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO cho query lấy danh sách backups
 */
export class GetBackupsQueryDto {
  @ApiProperty({
    description: 'Secret key để xác thực',
    example: 'your_backup_secret_key',
  })
  @IsString({
    message: i18nValidationMessage('common.validation.key_string'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.key_required'),
  })
  key: string;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi tối đa',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: i18nValidationMessage('common.validation.limit_integer'),
  })
  @Min(1, {
    message: i18nValidationMessage('common.validation.limit_min'),
  })
  @Max(100, {
    message: i18nValidationMessage('common.validation.limit_max'),
  })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Số bản ghi bỏ qua',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: i18nValidationMessage('common.validation.offset_integer'),
  })
  @Min(0, {
    message: i18nValidationMessage('common.validation.offset_min'),
  })
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm (theo tên file)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  keywords?: string;
}
