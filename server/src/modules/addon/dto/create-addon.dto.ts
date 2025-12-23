import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsEnum,
    MaxLength,
    Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { DiscountType } from '@prisma/client';

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

    @ApiPropertyOptional({ description: 'Giá trị giảm giá', example: 10 })
    @IsOptional()
    @IsNumber({}, {
        message: i18nValidationMessage('addon.validation.discount_value_number'),
    })
    @Min(0, {
        message: i18nValidationMessage('addon.validation.discount_value_min'),
    })
    discount_value?: number;

    @ApiPropertyOptional({ description: 'Loại giảm giá', enum: DiscountType })
    @IsOptional()
    @IsEnum(DiscountType, {
        message: i18nValidationMessage('addon.validation.discount_type_enum'),
    })
    discount_type?: DiscountType;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('addon.validation.is_active_boolean'),
    })
    is_active?: boolean;
}
