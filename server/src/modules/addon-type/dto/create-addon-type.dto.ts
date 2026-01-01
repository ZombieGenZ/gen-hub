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
 * DTO tạo mới AddonType
 */
export class CreateAddonTypeDto {
    @ApiProperty({ description: 'Tên loại addon', example: 'Bảo mật' })
    @IsNotEmpty({
        message: i18nValidationMessage('addon-type.validation.name_required'),
    })
    @IsString({
        message: i18nValidationMessage('addon-type.validation.name_string'),
    })
    @MaxLength(255, {
        message: i18nValidationMessage('addon-type.validation.name_max_length'),
    })
    name: string;

    @ApiPropertyOptional({ description: 'Mô tả', example: 'Các addon liên quan đến bảo mật' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('addon-type.validation.description_string'),
    })
    description?: string;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('addon-type.validation.is_active_boolean'),
    })
    is_active?: boolean;
}
