import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsBoolean,
    IsArray,
    IsUUID,
    IsDateString,
    MaxLength,
    Matches,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO tạo mới API Key
 */
export class CreateApiKeyDto {
    @ApiProperty({ description: 'Tên API key', example: 'Production API Key' })
    @IsNotEmpty({
        message: i18nValidationMessage('organization.validation.apikey_name_required'),
    })
    @IsString({
        message: i18nValidationMessage('organization.validation.apikey_name_string'),
    })
    @MaxLength(100, {
        message: i18nValidationMessage('organization.validation.apikey_name_max_length'),
    })
    name: string;

    @ApiPropertyOptional({ description: 'Mô tả API key' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('organization.validation.apikey_description_string'),
    })
    description?: string;

    @ApiPropertyOptional({ description: 'Ngày hết hạn (ISO 8601)', example: '2025-12-31T23:59:59Z' })
    @IsOptional()
    @IsDateString({}, {
        message: i18nValidationMessage('organization.validation.apikey_expires_at_date'),
    })
    expires_at?: string;

    @ApiPropertyOptional({
        description: 'Danh sách allowed origins cho CORS (URL, IPv4, IPv6)',
        example: ['https://example.com', 'http://192.168.1.100:3000', 'http://[::1]:3000'],
        type: [String],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('organization.validation.apikey_allowed_origins_array'),
    })
    @IsString({
        each: true,
        message: i18nValidationMessage('organization.validation.apikey_allowed_origins_string'),
    })
    @Matches(
        /^(https?:\/\/)?(\[?[\da-fA-F:.]+\]?|[\w.-]+)(:\d+)?(\/.*)?$/,
        {
            each: true,
            message: i18nValidationMessage('organization.validation.apikey_allowed_origins_format'),
        },
    )
    allowed_origins?: string[];

    @ApiPropertyOptional({ description: 'Danh sách ID vai trò gán cho API key', type: [String] })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('organization.validation.role_ids_array'),
    })
    @IsUUID('4', {
        each: true,
        message: i18nValidationMessage('organization.validation.role_id_uuid'),
    })
    role_ids?: string[];

    @ApiPropertyOptional({ description: 'Danh sách ID quyền gán cho API key', type: [String] })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('organization.validation.permission_ids_array'),
    })
    @IsUUID('4', {
        each: true,
        message: i18nValidationMessage('organization.validation.permission_id_uuid'),
    })
    permission_ids?: string[];
}

/**
 * DTO cập nhật API Key
 */
export class UpdateApiKeyDto {
    @ApiPropertyOptional({ description: 'Tên API key' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('organization.validation.apikey_name_string'),
    })
    @MaxLength(100, {
        message: i18nValidationMessage('organization.validation.apikey_name_max_length'),
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

    @ApiPropertyOptional({ description: 'Ngày hết hạn (ISO 8601)' })
    @IsOptional()
    @IsDateString({}, {
        message: i18nValidationMessage('organization.validation.apikey_expires_at_date'),
    })
    expires_at?: string;

    @ApiPropertyOptional({
        description: 'Danh sách allowed origins cho CORS (URL, IPv4, IPv6)',
        example: ['https://example.com', 'http://192.168.1.100:3000', 'http://[::1]:3000'],
        type: [String],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('organization.validation.apikey_allowed_origins_array'),
    })
    @IsString({
        each: true,
        message: i18nValidationMessage('organization.validation.apikey_allowed_origins_string'),
    })
    @Matches(
        /^(https?:\/\/)?(\[?[\da-fA-F:.]+\]?|[\w.-]+)(:\d+)?(\/.*)?$/,
        {
            each: true,
            message: i18nValidationMessage('organization.validation.apikey_allowed_origins_format'),
        },
    )
    allowed_origins?: string[];

    @ApiPropertyOptional({ description: 'Danh sách ID vai trò gán cho API key (thay thế toàn bộ)', type: [String] })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('organization.validation.role_ids_array'),
    })
    @IsUUID('4', {
        each: true,
        message: i18nValidationMessage('organization.validation.role_id_uuid'),
    })
    role_ids?: string[];

    @ApiPropertyOptional({ description: 'Danh sách ID quyền gán cho API key (thay thế toàn bộ)', type: [String] })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('organization.validation.permission_ids_array'),
    })
    @IsUUID('4', {
        each: true,
        message: i18nValidationMessage('organization.validation.permission_id_uuid'),
    })
    permission_ids?: string[];
}
