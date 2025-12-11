import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsBoolean,
    MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO tạo mới Organization
 */
export class CreateOrganizationDto {
    @ApiProperty({ description: 'Tên tổ chức', example: 'Công ty ABC' })
    @IsNotEmpty({
        message: i18nValidationMessage('organization.validation.name_required'),
    })
    @IsString({
        message: i18nValidationMessage('organization.validation.name_string'),
    })
    @MaxLength(255, {
        message: i18nValidationMessage('organization.validation.name_max_length'),
    })
    name: string;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('organization.validation.is_active_boolean'),
    })
    is_active?: boolean;
}
