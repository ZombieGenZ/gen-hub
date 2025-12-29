import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsArray,
    IsUUID,
    IsIn,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

// Chỉ cho phép NEW_CONTRACT và RENEWAL cho coupon (không áp dụng cho ACCOUNT_DEPOSIT)
export type CouponApplicableType = 'NEW_CONTRACT' | 'RENEWAL';

/**
 * DTO kiểm tra coupon có thể áp dụng cho đơn hàng
 */
export class CheckApplicableCouponDto {
    @ApiPropertyOptional({
        description: 'Danh sách ID addon được chọn',
        type: [String],
        example: ['uuid-1', 'uuid-2'],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('coupon.validation.addon_ids_array'),
    })
    @IsUUID('4', {
        each: true,
        message: i18nValidationMessage('coupon.validation.addon_ids_uuid'),
    })
    addon_ids?: string[];

    @ApiPropertyOptional({
        description: 'Danh sách ID kho template được chọn',
        type: [String],
        example: ['uuid-1', 'uuid-2'],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('coupon.validation.warehouse_template_ids_array'),
    })
    @IsUUID('4', {
        each: true,
        message: i18nValidationMessage('coupon.validation.warehouse_template_ids_uuid'),
    })
    warehouse_template_ids?: string[];

    @ApiPropertyOptional({
        description: 'Danh sách ID row template được chọn',
        type: [String],
        example: ['uuid-1', 'uuid-2'],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('coupon.validation.row_template_ids_array'),
    })
    @IsUUID('4', {
        each: true,
        message: i18nValidationMessage('coupon.validation.row_template_ids_uuid'),
    })
    row_template_ids?: string[];

    @ApiProperty({
        description: 'ID của gói thời gian thuê (RentalDurationTier)',
        example: 'uuid-here',
    })
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.rental_duration_tier_id_required'),
    })
    @IsUUID('4', {
        message: i18nValidationMessage('coupon.validation.rental_duration_tier_id_uuid'),
    })
    rental_duration_tier_id: string;

    @ApiProperty({
        description: 'Loại giao dịch: NEW_CONTRACT hoặc RENEWAL',
        enum: ['NEW_CONTRACT', 'RENEWAL'],
        example: 'NEW_CONTRACT',
    })
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.type_required'),
    })
    @IsIn(['NEW_CONTRACT', 'RENEWAL'], {
        message: i18nValidationMessage('coupon.validation.type_enum'),
    })
    type: CouponApplicableType;
}

