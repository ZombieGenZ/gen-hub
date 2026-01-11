import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO Quick Action cho Email
 */
export class EmailQuickActionDto {
    @ApiProperty({ description: 'Địa chỉ email', example: 'spam@example.com' })
    @IsNotEmpty({
        message: i18nValidationMessage('contactList.validation.email_required'),
    })
    @IsString()
    @MaxLength(255)
    email: string;

    @ApiPropertyOptional({ description: 'Lý do' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    reason?: string;
}

/**
 * DTO Quick Action cho Domain
 */
export class DomainQuickActionDto {
    @ApiProperty({ description: 'Domain email (bao gồm @)', example: '@spam.com' })
    @IsNotEmpty({
        message: i18nValidationMessage('contactList.validation.domain_required'),
    })
    @IsString()
    @MaxLength(255)
    domain: string;

    @ApiPropertyOptional({ description: 'Lý do' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    reason?: string;
}

/**
 * DTO Quick Action cho IP
 */
export class IpQuickActionDto {
    @ApiProperty({ description: 'Địa chỉ IP (IPv4 hoặc IPv6)', example: '192.168.1.1' })
    @IsNotEmpty({
        message: i18nValidationMessage('contactList.validation.ip_required'),
    })
    @IsString()
    @MaxLength(50)
    ip: string;

    @ApiPropertyOptional({ description: 'Lý do' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    reason?: string;
}

/**
 * DTO Quick Action cho Region Country
 */
export class RegionCountryQuickActionDto {
    @ApiProperty({ description: 'Mã quốc gia (ISO 3166-1 alpha-2)', example: 'CN' })
    @IsNotEmpty({
        message: i18nValidationMessage('contactList.validation.country_code_required'),
    })
    @IsString()
    @MaxLength(2)
    country_code: string;

    @ApiPropertyOptional({ description: 'Lý do' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    reason?: string;
}

/**
 * DTO Quick Action cho Region City
 */
export class RegionCityQuickActionDto {
    @ApiProperty({ description: 'Mã quốc gia (ISO 3166-1 alpha-2)', example: 'VN' })
    @IsNotEmpty({
        message: i18nValidationMessage('contactList.validation.country_code_required'),
    })
    @IsString()
    @MaxLength(2)
    country_code: string;

    @ApiProperty({ description: 'Mã tỉnh/thành phố', example: 'HN' })
    @IsNotEmpty({
        message: i18nValidationMessage('contactList.validation.city_code_required'),
    })
    @IsString()
    @MaxLength(10)
    city_code: string;

    @ApiPropertyOptional({ description: 'Lý do' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    reason?: string;
}

/**
 * DTO xóa theo value
 */
export class DeleteByValueDto {
    @ApiProperty({ description: 'Giá trị cần xóa' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    value: string;
}
