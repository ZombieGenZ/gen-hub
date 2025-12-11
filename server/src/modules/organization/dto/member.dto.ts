import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsOptional, IsArray } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO mời thành viên vào Organization
 */
export class InviteMemberDto {
    @ApiProperty({ description: 'ID của người dùng được mời', example: 'uuid-here' })
    @IsNotEmpty({
        message: i18nValidationMessage('organization.validation.user_id_required'),
    })
    @IsUUID('4', {
        message: i18nValidationMessage('organization.validation.user_id_uuid'),
    })
    user_id: string;

    @ApiProperty({ description: 'Danh sách ID vai trò gán cho thành viên', type: [String], required: false })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('organization.validation.role_ids_array'),
    })
    @IsUUID('4', {
        each: true,
        message: i18nValidationMessage('organization.validation.role_id_uuid'),
    })
    role_ids?: string[];
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
        message: i18nValidationMessage('organization.validation.permission_ids_array'),
    })
    @IsUUID('4', {
        each: true,
        message: i18nValidationMessage('organization.validation.permission_id_uuid'),
    })
    permission_ids: string[];
}
