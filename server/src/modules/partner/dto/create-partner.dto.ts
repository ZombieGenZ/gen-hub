import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  MaxLength,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export enum PartnerType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
}

export class CreatePartnerDto {
  @ApiProperty({ description: 'Tên đối tác', example: 'Công ty TNHH ABC' })
  @IsNotEmpty({
    message: i18nValidationMessage('partner.validation.name_required'),
  })
  @IsString({
    message: i18nValidationMessage('partner.validation.name_string'),
  })
  @MaxLength(255, {
    message: i18nValidationMessage('partner.validation.name_max_length'),
  })
  name: string;

  @ApiProperty({ description: 'Mã đối tác', example: 'ABC001' })
  @IsNotEmpty({
    message: i18nValidationMessage('partner.validation.code_required'),
  })
  @IsString({
    message: i18nValidationMessage('partner.validation.code_string'),
  })
  @MaxLength(50, {
    message: i18nValidationMessage('partner.validation.code_max_length'),
  })
  code: string;

  @ApiProperty({
    description: 'Loại đối tác',
    enum: PartnerType,
    example: 'CUSTOMER',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('partner.validation.type_required'),
  })
  @IsEnum(PartnerType, {
    message: i18nValidationMessage('partner.validation.type_invalid'),
  })
  type: PartnerType;

  @ApiPropertyOptional({ description: 'Số điện thoại', example: '0901234567' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('partner.validation.phone_string'),
  })
  @MaxLength(20, {
    message: i18nValidationMessage('partner.validation.phone_max_length'),
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'contact@abc.com' })
  @IsOptional()
  @IsEmail(
    {},
    { message: i18nValidationMessage('partner.validation.email_invalid') },
  )
  @MaxLength(255, {
    message: i18nValidationMessage('partner.validation.email_max_length'),
  })
  email?: string;

  @ApiPropertyOptional({ description: 'Mã số thuế', example: '0123456789' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('partner.validation.tax_code_string'),
  })
  @MaxLength(20, {
    message: i18nValidationMessage('partner.validation.tax_code_max_length'),
  })
  tax_code?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ chi tiết' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('partner.validation.address_string'),
  })
  address_detail?: string;

  @ApiPropertyOptional({ description: 'ID phường/xã' })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage('partner.validation.ward_id_uuid'),
  })
  ward_id?: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('partner.validation.is_active_boolean'),
  })
  is_active?: boolean;
}
