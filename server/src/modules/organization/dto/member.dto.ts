import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsArray,
  IsEmail,
  ArrayMinSize,
  IsString,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO mời thành viên vào Organization
 * Hỗ trợ mời nhiều thành viên cùng lúc
 */
export class InviteMemberDto {
  @ApiProperty({
    description: 'Danh sách email của người dùng được mời',
    example: ['user1@example.com', 'user2@example.com'],
    type: [String],
  })
  @IsNotEmpty({
    message: i18nValidationMessage('organization.validation.emails_required'),
  })
  @IsArray({
    message: i18nValidationMessage('organization.validation.emails_array'),
  })
  @ArrayMinSize(1, {
    message: i18nValidationMessage('organization.validation.emails_min_one'),
  })
  @IsEmail(
    {},
    {
      each: true,
      message: i18nValidationMessage('organization.validation.email_invalid'),
    },
  )
  emails: string[];
}

/**
 * DTO gán role cho thành viên
 */
export class AssignMemberRolesDto {
  @ApiProperty({ description: 'Danh sách ID vai trò', type: [String] })
  @IsArray({
    message: i18nValidationMessage('organization.validation.role_ids_array'),
  })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage('organization.validation.role_id_uuid'),
  })
  role_ids: string[];
}

/**
 * DTO gán permission cho thành viên
 */
export class AssignMemberPermissionsDto {
  @ApiProperty({ description: 'Danh sách ID quyền', type: [String] })
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
  permission_ids: string[];
}

/**
 * DTO cập nhật display name của thành viên
 */
export class UpdateMemberDisplayNameDto {
  @ApiProperty({
    description: 'Tên hiển thị trong tổ chức',
    example: 'Nguyễn Văn A',
    maxLength: 100,
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'organization.validation.display_name_required',
    ),
  })
  @IsString({
    message: i18nValidationMessage(
      'organization.validation.display_name_string',
    ),
  })
  @MaxLength(100, {
    message: i18nValidationMessage(
      'organization.validation.display_name_max_length',
    ),
  })
  display_name: string;
}
