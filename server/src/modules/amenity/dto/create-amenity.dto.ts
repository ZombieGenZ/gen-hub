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
 * DTO tạo mới Amenity (Tiện ích & Hạ tầng)
 */
export class CreateAmenityDto {
    @ApiProperty({ description: 'Tên tiện ích', example: 'WiFi' })
    @IsNotEmpty({
        message: i18nValidationMessage('amenity.validation.name_required'),
    })
    @IsString({
        message: i18nValidationMessage('amenity.validation.name_string'),
    })
    @MaxLength(255, {
        message: i18nValidationMessage('amenity.validation.name_max_length'),
    })
    name: string;

    @ApiPropertyOptional({ description: 'Mô tả', example: 'Internet tốc độ cao' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('amenity.validation.description_string'),
    })
    description?: string;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('amenity.validation.is_active_boolean'),
    })
    is_active?: boolean;
}
