import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CreateCacheDto } from './create-cache.dto';

export class BulkCacheDto {
  @ApiProperty({
    description: 'Danh sách các cache entry cần thao tác',
    type: [CreateCacheDto],
  })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ValidateNested({ each: true })
  @Type(() => CreateCacheDto)
  items: CreateCacheDto[];
}
