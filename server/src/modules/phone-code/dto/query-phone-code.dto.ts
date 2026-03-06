import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class QueryPhoneCodeDto {
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('phone-code.validation.limit_positive') })
  @Min(1, { message: i18nValidationMessage('phone-code.validation.limit_positive') })
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('phone-code.validation.offset_min') })
  @Min(0, { message: i18nValidationMessage('phone-code.validation.offset_min') })
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('phone-code.validation.keywords_string') })
  keywords?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: i18nValidationMessage('phone-code.validation.is_active_boolean') })
  is_active?: boolean;
}

