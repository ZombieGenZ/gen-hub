import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsUUID,
    Min,
    MaxLength,
    IsArray,
    ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Type } from 'class-transformer';

/**
 * DTO cho discount config khi tạo row
 */
export class CreateRowDiscountConfigDto {
    @ApiProperty({ description: 'ID của mốc thời gian thuê' })
    @IsNotEmpty({
        message: i18nValidationMessage('row-template.validation.duration_tier_id_required'),
    })
    @IsUUID('4', {
        message: i18nValidationMessage('row-template.validation.duration_tier_id_uuid'),
    })
    duration_tier_id: string;

    @ApiProperty({ description: 'Phần trăm giảm giá', example: 5, minimum: 0, maximum: 100 })
    @IsNumber({}, {
        message: i18nValidationMessage('row-template.validation.discount_percent_number'),
    })
    @Min(0, {
        message: i18nValidationMessage('row-template.validation.discount_percent_min'),
    })
    discount_percent: number;

    @ApiPropertyOptional({ description: 'Trạng thái active', default: true })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}

/**
 * DTO tạo mới RowTemplate
 */
export class CreateRowTemplateDto {
    @ApiProperty({ description: 'Tên dãy', example: 'Dãy A' })
    @IsNotEmpty({
        message: i18nValidationMessage('row-template.validation.name_required'),
    })
    @IsString({
        message: i18nValidationMessage('row-template.validation.name_string'),
    })
    @MaxLength(255, {
        message: i18nValidationMessage('row-template.validation.name_max_length'),
    })
    name: string;

    @ApiProperty({ description: 'Mã dãy', example: 'ROW-A' })
    @IsNotEmpty({
        message: i18nValidationMessage('row-template.validation.code_required'),
    })
    @IsString({
        message: i18nValidationMessage('row-template.validation.code_string'),
    })
    @MaxLength(50, {
        message: i18nValidationMessage('row-template.validation.code_max_length'),
    })
    code: string;

    @ApiPropertyOptional({ description: 'Mô tả' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('row-template.validation.description_string'),
    })
    description?: string;

    @ApiPropertyOptional({ description: 'Đã được thuê', default: false })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('row-template.validation.is_rented_boolean'),
    })
    is_rented?: boolean;

    @ApiProperty({ description: 'Giá thuê/tháng', example: 1000000 })
    @IsNumber({}, {
        message: i18nValidationMessage('row-template.validation.price_per_month_number'),
    })
    @Min(0, {
        message: i18nValidationMessage('row-template.validation.price_per_month_min'),
    })
    price_per_month: number;

    @ApiPropertyOptional({ description: 'Địa chỉ' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ description: 'Vĩ độ' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    latitude?: number;

    @ApiPropertyOptional({ description: 'Kinh độ' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    longitude?: number;

    @ApiPropertyOptional({ description: 'Vị trí X' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    position_x?: number;

    @ApiPropertyOptional({ description: 'Vị trí Y' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    position_y?: number;

    @ApiPropertyOptional({ description: 'Góc xoay' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    position_rotation?: number;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('row-template.validation.is_active_boolean'),
    })
    is_active?: boolean;

    @ApiPropertyOptional({
        description: 'Danh sách config giảm giá theo mốc thời gian',
        type: [CreateRowDiscountConfigDto],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('row-template.validation.discount_configs_array'),
    })
    @ValidateNested({ each: true })
    @Type(() => CreateRowDiscountConfigDto)
    discount_configs?: CreateRowDiscountConfigDto[];
}
