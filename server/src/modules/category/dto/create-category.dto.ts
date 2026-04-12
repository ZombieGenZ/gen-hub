import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsUUID,
  IsEnum,
  Matches,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CategoryStatus } from '@prisma/client';

/**
 * DTO tạo mới Category
 */
export class CreateCategoryDto {
  @ApiProperty({ description: 'Tên chủ đề', example: 'Tin tức công nghệ' })
  @IsNotEmpty({
    message: i18nValidationMessage('category.validation.name_required'),
  })
  @IsString({
    message: i18nValidationMessage('category.validation.name_string'),
  })
  name: string;

  @ApiProperty({ description: 'Slug URL', example: 'tin-tuc-cong-nghe' })
  @IsNotEmpty({
    message: i18nValidationMessage('category.validation.slug_required'),
  })
  @IsString({
    message: i18nValidationMessage('category.validation.slug_string'),
  })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: i18nValidationMessage('category.validation.slug_format'),
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Mô tả',
    example: 'Các tin tức về công nghệ mới nhất',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('category.validation.description_string'),
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon (emoji hoặc icon class)',
    example: '📰',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'URL hình ảnh đại diện' })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional({ description: 'Mã màu hex', example: '#3B82F6' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'ID chủ đề cha' })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage('category.validation.parent_id_uuid'),
  })
  parent_id?: string;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị', default: 0 })
  @IsOptional()
  @IsInt({
    message: i18nValidationMessage('category.validation.order_integer'),
  })
  @Min(0, {
    message: i18nValidationMessage('category.validation.order_min'),
  })
  order?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái',
    enum: CategoryStatus,
    default: CategoryStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(CategoryStatus, {
    message: i18nValidationMessage('category.validation.status_enum'),
  })
  status?: CategoryStatus;

  @ApiPropertyOptional({ description: 'Nổi bật', default: false })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('category.validation.is_featured_boolean'),
  })
  is_featured?: boolean;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('category.validation.is_active_boolean'),
  })
  is_active?: boolean;
}
