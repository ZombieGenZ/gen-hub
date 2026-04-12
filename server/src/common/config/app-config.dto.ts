import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsHexColor,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

class UpdateAppColorsDto {
  @ApiPropertyOptional({ description: 'Primary color', example: '#0F766E' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  primary?: string;

  @ApiPropertyOptional({
    description: 'Primary light color',
    example: '#14B8A6',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  primaryLight?: string;

  @ApiPropertyOptional({
    description: 'Primary dark color',
    example: '#0D5A52',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  primaryDark?: string;

  @ApiPropertyOptional({ description: 'Gray 900 color', example: '#1E293B' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  gray900?: string;

  @ApiPropertyOptional({ description: 'Gray 700 color', example: '#334155' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  gray700?: string;

  @ApiPropertyOptional({ description: 'Gray 500 color', example: '#64748B' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  gray500?: string;

  @ApiPropertyOptional({ description: 'Gray 300 color', example: '#CBD5E1' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  gray300?: string;

  @ApiPropertyOptional({ description: 'Gray 100 color', example: '#F1F5F9' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  gray100?: string;

  @ApiPropertyOptional({ description: 'Background color', example: '#F8FAFC' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  background?: string;

  @ApiPropertyOptional({
    description: 'Card/Surface color',
    example: '#FFFFFF',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  cardSurface?: string;

  @ApiPropertyOptional({
    description: 'Sidebar background color',
    example: '#F1F5F9',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  sidebarBg?: string;

  @ApiPropertyOptional({ description: 'Success color', example: '#10B981' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  success?: string;

  @ApiPropertyOptional({ description: 'Warning color', example: '#F59E0B' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  warning?: string;

  @ApiPropertyOptional({ description: 'Error color', example: '#EF4444' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  error?: string;

  @ApiPropertyOptional({ description: 'Info color', example: '#0EA5E9' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  info?: string;

  @ApiPropertyOptional({ description: 'Border color', example: '#E2E8F0' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  @IsHexColor({ message: i18nValidationMessage('config.validation.color_hex') })
  border?: string;

  @ApiPropertyOptional({
    description: 'Shadow color',
    example: 'rgba(0, 0, 0, 0.04)',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.color_string'),
  })
  shadow?: string;
}

class UpdatePaginationConfigDto {
  @ApiPropertyOptional({ description: 'Default records per page', example: 10 })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('config.validation.default_limit_number'),
    },
  )
  @Min(1, {
    message: i18nValidationMessage('config.validation.default_limit_min'),
  })
  @Max(1000, {
    message: i18nValidationMessage('config.validation.default_limit_max'),
  })
  defaultLimit?: number;

  @ApiPropertyOptional({ description: 'Default starting offset', example: 0 })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('config.validation.default_offset_number'),
    },
  )
  @Min(0, {
    message: i18nValidationMessage('config.validation.default_offset_min'),
  })
  defaultOffset?: number;

  @ApiPropertyOptional({
    description: 'Maximum records per page',
    example: 100,
  })
  @IsOptional()
  @IsNumber(
    {},
    { message: i18nValidationMessage('config.validation.max_limit_number') },
  )
  @Min(1, { message: i18nValidationMessage('config.validation.max_limit_min') })
  @Max(1000, {
    message: i18nValidationMessage('config.validation.max_limit_max'),
  })
  maxLimit?: number;

  @ApiPropertyOptional({ description: 'Minimum records per page', example: 1 })
  @IsOptional()
  @IsNumber(
    {},
    { message: i18nValidationMessage('config.validation.min_limit_number') },
  )
  @Min(1, { message: i18nValidationMessage('config.validation.min_limit_min') })
  minLimit?: number;
}

export class UpdateAppConfigDto {
  @ApiPropertyOptional({
    description: 'Brand name',
    example: 'GEN-HUB',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.brand_name_string'),
  })
  @MaxLength(100, {
    message: i18nValidationMessage('config.validation.brand_name_max_length'),
  })
  brandName?: string;

  @ApiPropertyOptional({
    description: 'Support email',
    example: 'support@gen-hub.dev',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.support_email_string'),
  })
  @MaxLength(255, {
    message: i18nValidationMessage(
      'config.validation.support_email_max_length',
    ),
  })
  supportEmail?: string;

  @ApiPropertyOptional({
    description: 'Support phone',
    example: '0783 504 540',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('config.validation.support_phone_string'),
  })
  @MaxLength(20, {
    message: i18nValidationMessage(
      'config.validation.support_phone_max_length',
    ),
  })
  supportPhone?: string;

  @ApiPropertyOptional({
    description: 'Theme colors',
    type: UpdateAppColorsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAppColorsDto)
  colors?: UpdateAppColorsDto;

  @ApiPropertyOptional({
    description: 'Pagination configuration',
    type: UpdatePaginationConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePaginationConfigDto)
  pagination?: UpdatePaginationConfigDto;

  @ApiPropertyOptional({
    description: 'Enable AI auto reply for contacts (default value)',
    example: false,
  })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'config.validation.enable_ai_auto_reply_boolean',
    ),
  })
  enableAiAutoReply?: boolean;
}
