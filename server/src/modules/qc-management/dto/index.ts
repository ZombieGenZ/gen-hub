import { IsNotEmpty, IsUUID, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO để gán user vào QC Warehouse
 */
export class AssignUserToWarehouseDto {
    @ApiProperty({ description: 'ID của user cần gán', example: '550e8400-e29b-41d4-a716-446655440001' })
    @IsNotEmpty({ message: i18nValidationMessage('qc-management.validation.user_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('qc-management.validation.user_id_uuid') })
    user_id: string;

    @ApiPropertyOptional({
        description: 'Danh sách ID permissions cần gán',
        type: [String],
        example: ['perm-uuid-1', 'perm-uuid-2']
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('qc-management.validation.permission_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('qc-management.validation.permission_id_uuid') })
    permission_ids?: string[] = [];
}

/**
 * DTO để gán user vào QC Row
 */
export class AssignUserToRowDto {
    @ApiProperty({ description: 'ID của user cần gán', example: '550e8400-e29b-41d4-a716-446655440001' })
    @IsNotEmpty({ message: i18nValidationMessage('qc-management.validation.user_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('qc-management.validation.user_id_uuid') })
    user_id: string;

    @ApiPropertyOptional({
        description: 'Danh sách ID permissions cần gán',
        type: [String],
        example: ['perm-uuid-1', 'perm-uuid-2']
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('qc-management.validation.permission_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('qc-management.validation.permission_id_uuid') })
    permission_ids?: string[] = [];
}
