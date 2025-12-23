import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsBoolean,
    IsInt,
    IsEnum,
    IsArray,
    ValidateNested,
    Min,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { DurationUnit } from '@prisma/client';
import { TierAddonGiftDto } from './tier-addon-gift.dto';

/**
 * DTO tạo mới mốc thời gian thuê
 */
export class CreateRentalDurationTierDto {
    @ApiProperty({ description: 'Tên mốc thời gian', example: '1 Tháng' })
    @IsNotEmpty({
        message: i18nValidationMessage('rental-duration-tier.validation.name_required'),
    })
    @IsString({
        message: i18nValidationMessage('rental-duration-tier.validation.name_string'),
    })
    @MaxLength(255, {
        message: i18nValidationMessage('rental-duration-tier.validation.name_max_length'),
    })
    name: string;

    @ApiProperty({ description: 'Giá trị thời gian', example: 1 })
    @IsNotEmpty({
        message: i18nValidationMessage('rental-duration-tier.validation.duration_value_required'),
    })
    @IsInt({
        message: i18nValidationMessage('rental-duration-tier.validation.duration_value_int'),
    })
    @Min(1, {
        message: i18nValidationMessage('rental-duration-tier.validation.duration_value_min'),
    })
    duration_value: number;

    @ApiPropertyOptional({
        description: 'Đơn vị thời gian',
        enum: DurationUnit,
        default: DurationUnit.MONTH
    })
    @IsOptional()
    @IsEnum(DurationUnit, {
        message: i18nValidationMessage('rental-duration-tier.validation.duration_unit_enum'),
    })
    duration_unit?: DurationUnit;

    @ApiPropertyOptional({ description: 'Mô tả', example: 'Thuê trong 1 tháng' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('rental-duration-tier.validation.description_string'),
    })
    description?: string;

    @ApiPropertyOptional({ description: 'Thứ tự hiển thị', default: 0 })
    @IsOptional()
    @IsInt({
        message: i18nValidationMessage('rental-duration-tier.validation.order_int'),
    })
    @Min(0)
    order?: number;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('rental-duration-tier.validation.is_active_boolean'),
    })
    is_active?: boolean;

    @ApiPropertyOptional({ description: 'Danh sách addon tặng kèm', type: [TierAddonGiftDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TierAddonGiftDto)
    addon_gifts?: TierAddonGiftDto[];
}
