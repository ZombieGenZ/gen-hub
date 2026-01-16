import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Transform } from 'class-transformer';

/**
 * DTO để tạo role mới
 */
export class CreateRoleDto {
    @ApiProperty({
        description: 'Tên của role',
        example: 'Manager',
    })
    @IsNotEmpty({ message: i18nValidationMessage('common.validation.is_not_empty') })
    @IsString({ message: i18nValidationMessage('common.validation.is_string') })
    name: string;

    @ApiProperty({
        description: 'Mô tả của role',
        required: false,
        example: 'Quản lý hệ thống',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('common.validation.is_string') })
    description?: string;

    @ApiProperty({
        description: 'Role mặc định cho user mới',
        required: false,
        default: false,
    })
    @IsOptional()
    @IsBoolean({ message: i18nValidationMessage('common.validation.is_boolean') })
    @Transform(({ value }) => value === 'true' || value === true)
    is_default?: boolean;

    @ApiProperty({
        description: 'Danh sách permission IDs để gán cho role',
        required: false,
        type: [String],
        example: ['uuid-1', 'uuid-2'],
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('common.validation.is_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('common.validation.is_uuid') })
    permission_ids?: string[];
}
