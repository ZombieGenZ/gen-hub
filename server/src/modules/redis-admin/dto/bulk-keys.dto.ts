import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class BulkKeysDto {
  @ApiProperty({
    description: 'Danh sách các keys cần xóa',
    example: ['key1', 'key2'],
  })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @IsString({ each: true, message: i18nValidationMessage('validation.IS_STRING') })
  keys: string[];
}
