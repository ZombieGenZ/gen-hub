import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    MaxLength,
    Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO tạo mới Addon
 */
export class CreateAddonDto {
    @ApiProperty({ description: 'Tên addon', example: 'Bảo hiểm kho hàng' })
    @IsNotEmpty({
        message: i18nValidationMessage('addon.validation.name_required'),
    })
    @IsString({
        message: i18nValidationMessage('addon.validation.name_string'),
    })
    @MaxLength(255, {
        message: i18nValidationMessage('addon.validation.name_max_length'),
    })
    name: string;

    @ApiPropertyOptional({ description: 'Mô tả', example: 'Dịch vụ bảo hiểm hàng hóa trong kho' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('addon.validation.description_string'),
    })
    description?: string;

    @ApiProperty({ description: 'Giá tiền', example: 500000 })
    @IsNotEmpty({
        message: i18nValidationMessage('addon.validation.price_required'),
    })
    @IsNumber({}, {
        message: i18nValidationMessage('addon.validation.price_number'),
    })
    @Min(0, {
        message: i18nValidationMessage('addon.validation.price_min'),
    })
    price: number;

    @ApiPropertyOptional({ description: 'Trả phí hàng tháng', default: false })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('addon.validation.is_monthly_payment_boolean'),
    })
    is_monthly_payment?: boolean;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('addon.validation.is_active_boolean'),
    })
    is_active?: boolean;
}
