import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsBoolean,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ArticleStatus, ArticleType } from '@prisma/client';

/**
 * DTO query danh sách Article
 */
export class QueryArticleDto {
  @ApiPropertyOptional({ description: 'Số lượng bản ghi', default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({
    message: i18nValidationMessage('article.validation.limit_integer'),
  })
  @Min(1, {
    message: i18nValidationMessage('article.validation.limit_min'),
  })
  limit?: number;

  @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({
    message: i18nValidationMessage('article.validation.offset_integer'),
  })
  @Min(0, {
    message: i18nValidationMessage('article.validation.offset_min'),
  })
  offset?: number;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('article.validation.keywords_string'),
  })
  keywords?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái',
    enum: ArticleStatus,
  })
  @IsOptional()
  @IsEnum(ArticleStatus, {
    message: i18nValidationMessage('article.validation.status_enum'),
  })
  status?: ArticleStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo loại',
    enum: ArticleType,
  })
  @IsOptional()
  @IsEnum(ArticleType, {
    message: i18nValidationMessage('article.validation.type_enum'),
  })
  type?: ArticleType;

  @ApiPropertyOptional({ description: 'Lọc theo is_active' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({
    message: i18nValidationMessage('article.validation.is_active_boolean'),
  })
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Lọc theo is_featured' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({
    message: i18nValidationMessage('article.validation.is_featured_boolean'),
  })
  is_featured?: boolean;

  @ApiPropertyOptional({ description: 'Lọc theo category_id' })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage('article.validation.category_id_uuid'),
  })
  category_id?: string;
}
