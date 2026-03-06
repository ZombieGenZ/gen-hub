import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateAvatarImageDto {
  @ApiProperty({ description: 'Tên ?nh avatar', example: 'Default Avatar' })
  @IsNotEmpty({ message: i18nValidationMessage('avatar-image.validation.name_required') })
  @IsString({ message: i18nValidationMessage('avatar-image.validation.name_string') })
  @MaxLength(255, { message: i18nValidationMessage('avatar-image.validation.name_max_length') })
  name: string;

  @ApiPropertyOptional({ description: 'Mô t?' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('avatar-image.validation.description_string') })
  description?: string;

  @ApiProperty({ description: 'URL ?nh', example: 'https://example.com/avatar.png' })
  @IsNotEmpty({ message: i18nValidationMessage('avatar-image.validation.image_url_required') })
  @IsString({ message: i18nValidationMessage('avatar-image.validation.image_url_string') })
  @IsUrl({}, { message: i18nValidationMessage('avatar-image.validation.image_url_url') })
  image_url: string;

  @ApiPropertyOptional({ description: 'Ð?t làm m?c ð?nh', default: false })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('avatar-image.validation.is_default_boolean') })
  is_default?: boolean;

  @ApiPropertyOptional({ description: 'Tr?ng thái ho?t ð?ng', default: true })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('avatar-image.validation.is_active_boolean') })
  is_active?: boolean;
}
