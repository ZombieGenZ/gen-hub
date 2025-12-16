import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CreateOrganizationDto } from './create-organization.dto';

/**
 * DTO cập nhật Organization
 * Bao gồm các trường Google OAuth cho cấu hình email
 */
export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
    @ApiPropertyOptional({ description: 'Google OAuth Client ID' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('organization.validation.google_client_id_string') })
    google_client_id?: string;

    @ApiPropertyOptional({ description: 'Google OAuth Client Secret' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('organization.validation.google_client_secret_string') })
    google_client_secret?: string;

    @ApiPropertyOptional({ description: 'Google OAuth Refresh Token' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('organization.validation.google_refresh_token_string') })
    google_refresh_token?: string;

    @ApiPropertyOptional({ description: 'Địa chỉ email chính của tổ chức', example: 'contact@company.com' })
    @IsOptional()
    @IsEmail({}, { message: i18nValidationMessage('organization.validation.email_primary_invalid') })
    @MaxLength(255, { message: i18nValidationMessage('organization.validation.email_primary_max_length') })
    email_primary_address?: string;
}
