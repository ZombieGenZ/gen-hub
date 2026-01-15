import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsEnum,
    MaxLength,
    IsEmail,
    Matches,
    ValidateIf,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ContactListType, ContactListMatchType } from '@prisma/client';

/**
 * DTO tạo mới ContactListEntry
 */
export class CreateContactListDto {
    @ApiProperty({ enum: ContactListType, description: 'Loại danh sách (BLACKLIST/WHITELIST)' })
    @IsNotEmpty({
        message: i18nValidationMessage('contactList.validation.list_type_required'),
    })
    @IsEnum(ContactListType, {
        message: i18nValidationMessage('contactList.validation.list_type_invalid'),
    })
    list_type: ContactListType;

    @ApiProperty({ enum: ContactListMatchType, description: 'Loại match (EMAIL, EMAIL_DOMAIN, IP_V4, IP_V6, REGION_COUNTRY, REGION_CITY)' })
    @IsNotEmpty({
        message: i18nValidationMessage('contactList.validation.match_type_required'),
    })
    @IsEnum(ContactListMatchType, {
        message: i18nValidationMessage('contactList.validation.match_type_invalid'),
    })
    match_type: ContactListMatchType;

    @ApiProperty({ description: 'Giá trị (email, domain, IP, country code, city code)', example: 'spam@example.com' })
    @IsNotEmpty({
        message: i18nValidationMessage('contactList.validation.value_required'),
    })
    @IsString({
        message: i18nValidationMessage('contactList.validation.value_string'),
    })
    @MaxLength(255, {
        message: i18nValidationMessage('contactList.validation.value_max'),
    })
    value: string;

    @ApiPropertyOptional({ description: 'Mã quốc gia (ISO 3166-1 alpha-2)', example: 'VN' })
    @ValidateIf((o) => o.match_type === 'REGION_COUNTRY' || o.match_type === 'REGION_CITY')
    @IsNotEmpty({
        message: i18nValidationMessage('contactList.validation.country_code_required'),
    })
    @IsString()
    @MaxLength(2)
    country_code?: string;

    @ApiPropertyOptional({ description: 'Mã tỉnh/thành phố', example: 'HN' })
    @ValidateIf((o) => o.match_type === 'REGION_CITY')
    @IsNotEmpty({
        message: i18nValidationMessage('contactList.validation.city_code_required'),
    })
    @IsString()
    @MaxLength(10)
    city_code?: string;

    @ApiPropertyOptional({ description: 'Lý do thêm vào danh sách', example: 'Spam liên tục' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    reason?: string;

    @ApiPropertyOptional({ description: 'Ghi chú thêm' })
    @IsOptional()
    @IsString()
    notes?: string;
}
