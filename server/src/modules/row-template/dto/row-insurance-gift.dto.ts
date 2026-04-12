import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsUUID,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { DurationUnit } from '@prisma/client';

export class RowInsuranceGiftDto {
  @ApiPropertyOptional({ description: 'ID của config (nếu update)' })
  @IsOptional()
  @IsUUID('4', { message: i18nValidationMessage('validation.isUUID') })
  id?: string;

  @ApiPropertyOptional({ description: 'ID của insurance được tặng' })
  @IsUUID('4', { message: i18nValidationMessage('validation.isUUID') })
  insurance_id: string;

  @ApiPropertyOptional({ description: 'Tặng đến khi kết thúc dịch vụ chính' })
  @IsOptional()
  @IsBoolean()
  is_until_service_end?: boolean;

  @ApiPropertyOptional({
    description: 'Giá trị thời gian tặng (nếu không phải until service end)',
  })
  @ValidateIf((o) => o.is_until_service_end === false)
  @IsNumber()
  @Min(1)
  gift_duration_value?: number;

  @ApiPropertyOptional({
    description: 'Đơn vị thời gian tặng',
    enum: DurationUnit,
  })
  @ValidateIf((o) => o.is_until_service_end === false)
  @IsEnum(DurationUnit)
  gift_duration_unit?: DurationUnit;

  @ApiPropertyOptional({ description: 'Trạng thái active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
