import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO để gán roles cho user
 */
export class AssignUserRolesDto {
    @ApiProperty({
        description: 'Danh sách role IDs để gán cho user',
        type: [String],
        example: ['uuid-1', 'uuid-2'],
    })
    @IsArray({ message: i18nValidationMessage('common.validation.is_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('common.validation.is_uuid') })
    role_ids: string[];
}

/**
 * DTO để gán permissions trực tiếp cho user
 */
export class AssignUserPermissionsDto {
    @ApiProperty({
        description: 'Danh sách permission IDs để gán cho user',
        type: [String],
        example: ['uuid-1', 'uuid-2'],
    })
    @IsArray({ message: i18nValidationMessage('common.validation.is_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('common.validation.is_uuid') })
    permission_ids: string[];
}
