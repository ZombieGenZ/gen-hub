import { IsArray, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO để gán roles và permissions cho user
 * Cho phép gán đồng thời cả roles và permissions trực tiếp
 */
export class AssignUserRolesPermissionsDto {
    @ApiProperty({
        description: 'Danh sách role IDs để gán cho user',
        type: [String],
        required: false,
        example: ['uuid-1', 'uuid-2'],
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('common.validation.is_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('common.validation.is_uuid') })
    role_ids?: string[];

    @ApiProperty({
        description: 'Danh sách permission IDs để gán trực tiếp cho user',
        type: [String],
        required: false,
        example: ['uuid-1', 'uuid-2'],
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('common.validation.is_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('common.validation.is_uuid') })
    permission_ids?: string[];
}
