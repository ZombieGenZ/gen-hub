import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO tạo mới Role trong Organization
 */
export class CreateOrganizationRoleDto {
  @ApiProperty({ description: 'Tên vai trò', example: 'Quản lý kho' })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'organization.validation.role_name_required',
    ),
  })
  @IsString({
    message: i18nValidationMessage('organization.validation.role_name_string'),
  })
  @MaxLength(100, {
    message: i18nValidationMessage(
      'organization.validation.role_name_max_length',
    ),
  })
  name: string;

  @ApiPropertyOptional({ description: 'Mô tả vai trò' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'organization.validation.role_description_string',
    ),
  })
  description?: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('organization.validation.is_active_boolean'),
  })
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Danh sách ID quyền gán cho vai trò',
    type: [String],
  })
  @IsOptional()
  @IsArray({
    message: i18nValidationMessage(
      'organization.validation.permission_ids_array',
    ),
  })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage(
      'organization.validation.permission_id_uuid',
    ),
  })
  permission_ids?: string[];
}

/**
 * DTO cập nhật Role trong Organization
 */
export class UpdateOrganizationRoleDto {
  @ApiPropertyOptional({ description: 'Tên vai trò' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('organization.validation.role_name_string'),
  })
  @MaxLength(100, {
    message: i18nValidationMessage(
      'organization.validation.role_name_max_length',
    ),
  })
  name?: string;

  @ApiPropertyOptional({ description: 'Mô tả vai trò' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'organization.validation.role_description_string',
    ),
  })
  description?: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('organization.validation.is_active_boolean'),
  })
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Danh sách ID quyền gán cho vai trò (thay thế toàn bộ)',
    type: [String],
  })
  @IsOptional()
  @IsArray({
    message: i18nValidationMessage(
      'organization.validation.permission_ids_array',
    ),
  })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage(
      'organization.validation.permission_id_uuid',
    ),
  })
  permission_ids?: string[];
}
