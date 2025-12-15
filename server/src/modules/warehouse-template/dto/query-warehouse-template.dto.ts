import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsNumber, Min, IsEnum, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Type, Transform } from 'class-transformer';
// import { TemplateRentalStatus } from '@prisma/client'; // Skipped due to generation issue

export class QueryWarehouseTemplateDto {
    @ApiPropertyOptional({ description: 'Số lượng record', example: 10 })
    @IsOptional()
    @IsNumber({}, {
        message: i18nValidationMessage('warehouse-template.validation.limit_positive'),
    })
    @Min(1, {
        message: i18nValidationMessage('warehouse-template.validation.limit_positive'),
    })
    @Type(() => Number)
    limit?: number;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', example: 0 })
    @IsOptional()
    @IsNumber({}, {
        message: i18nValidationMessage('warehouse-template.validation.offset_min'),
    })
    @Min(0, {
        message: i18nValidationMessage('warehouse-template.validation.offset_min'),
    })
    @Type(() => Number)
    offset?: number;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm', example: 'kho A' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('warehouse-template.validation.keywords_string'),
    })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động', example: true })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean({
        message: i18nValidationMessage('warehouse-template.validation.is_active_boolean'),
    })
    is_active?: boolean;

    @ApiPropertyOptional({
        description: 'Lọc theo trạng thái cho thuê',
        example: 'AVAILABLE'
    })
    @IsOptional()
    // Using string union instead of Enum to bypass missing binding
    rental_status?: 'AVAILABLE' | 'LOCKED' | 'RENTED';

    @ApiPropertyOptional({ description: 'ID Tỉnh/Thành phố', example: 'uuid' })
    @IsOptional()
    @IsUUID('4', {
        message: i18nValidationMessage('warehouse-template.validation.province_id_uuid'),
    })
    province_id?: string;
}
