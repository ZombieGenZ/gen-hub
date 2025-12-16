import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsBoolean,
    IsUUID,
    IsInt,
    Min,
    Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO query danh sách API Keys cho Admin
 */
export class QueryAdminApiKeyDto {
    @ApiPropertyOptional({ description: 'Số lượng bản ghi trả về', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({
        message: i18nValidationMessage('common.validation.limit_int'),
    })
    @Min(1, {
        message: i18nValidationMessage('common.validation.limit_min'),
    })
    @Max(1000, {
        message: i18nValidationMessage('common.validation.limit_max'),
    })
    limit?: number;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({
        message: i18nValidationMessage('common.validation.offset_int'),
    })
    @Min(0, {
        message: i18nValidationMessage('common.validation.offset_min'),
    })
    offset?: number;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (tên, mô tả)' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('common.validation.keywords_string'),
    })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean({
        message: i18nValidationMessage('common.validation.is_active_boolean'),
    })
    is_active?: boolean;

    @ApiPropertyOptional({ description: 'Lọc theo ID tổ chức' })
    @IsOptional()
    @IsUUID('4', {
        message: i18nValidationMessage('organization.validation.org_id_uuid'),
    })
    organization_id?: string;
}

/**
 * DTO cập nhật API Key từ Admin
 */
export class UpdateAdminApiKeyDto {
    @ApiPropertyOptional({ description: 'Tên API key' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('organization.validation.apikey_name_string'),
    })
    name?: string;

    @ApiPropertyOptional({ description: 'Mô tả API key' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('organization.validation.apikey_description_string'),
    })
    description?: string;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('organization.validation.is_active_boolean'),
    })
    is_active?: boolean;

    @ApiPropertyOptional({
        description: 'TTL cho rate limit (giây)',
        example: 60,
        minimum: 1,
    })
    @IsOptional()
    @IsInt({
        message: i18nValidationMessage('organization.validation.rate_limit_ttl_int'),
    })
    @Min(1, {
        message: i18nValidationMessage('organization.validation.rate_limit_ttl_min'),
    })
    rate_limit_ttl?: number;

    @ApiPropertyOptional({
        description: 'Số request tối đa trong TTL',
        example: 100,
        minimum: 1,
    })
    @IsOptional()
    @IsInt({
        message: i18nValidationMessage('organization.validation.rate_limit_max_int'),
    })
    @Min(1, {
        message: i18nValidationMessage('organization.validation.rate_limit_max_min'),
    })
    rate_limit_max?: number;
}
