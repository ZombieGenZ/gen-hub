import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateCacheDto {
  @ApiProperty({
    description: 'Giá trị mới của cache',
    example: 'updated_cache_value',
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  value: string;

  @ApiPropertyOptional({
    description: 'Thời gian sống mới của cache (giây)',
    example: 3600,
  })
  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  ttl?: number;
}
