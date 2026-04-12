import { PartialType } from '@nestjs/mapped-types';
import { CreateWarnPenaltyDto } from './create-warn-penalty.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateWarnPenaltyDto extends PartialType(CreateWarnPenaltyDto) {
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'warn-penalty.validation.is_active_must_be_boolean',
    ),
  })
  is_active?: boolean;
}
