import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsBoolean,
    MaxLength,
    IsEmail,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO tạo mới Organization
 */
export class CreateOrganizationDto {
    @ApiProperty({ description: 'Tên tổ chức', example: 'Công ty ABC' })
    @IsNotEmpty({
        message: i18nValidationMessage('organization.validation.name_required'),
    })
    @IsString({
        message: i18nValidationMessage('organization.validation.name_string'),
    })
    @MaxLength(255, {
        message: i18nValidationMessage('organization.validation.name_max_length'),
    })
    name: string;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('organization.validation.is_active_boolean'),
    })
    is_active?: boolean;

    @ApiPropertyOptional({ description: 'Sử dụng Google Email', default: false })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('organization.validation.is_using_google_email_boolean'),
    })
    is_using_google_email?: boolean;

    @ApiPropertyOptional({ description: 'Google OAuth Client ID' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('organization.validation.google_client_id_string'),
    })
    google_client_id?: string;

    @ApiPropertyOptional({ description: 'Google OAuth Client Secret' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('organization.validation.google_client_secret_string'),
    })
    google_client_secret?: string;

    @ApiPropertyOptional({ description: 'Google OAuth Refresh Token' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('organization.validation.google_refresh_token_string'),
    })
    google_refresh_token?: string;

    @ApiPropertyOptional({ description: 'Địa chỉ email chính của tổ chức', example: 'contact@company.com' })
    @IsOptional()
    @IsEmail(
        {},
        {
            message: i18nValidationMessage('organization.validation.email_primary_invalid'),
        },
    )
    @MaxLength(255, {
        message: i18nValidationMessage('organization.validation.email_primary_max_length'),
    })
    email_primary_address?: string;
}
