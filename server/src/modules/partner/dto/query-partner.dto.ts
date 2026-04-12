import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PartnerType } from './create-partner.dto';

export class QueryPartnerDto {
  @ApiPropertyOptional({ description: 'Số lượng bản ghi tối đa', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('partner.validation.limit_int') })
  @Min(1, { message: i18nValidationMessage('partner.validation.limit_min') })
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('partner.validation.offset_int') })
  @Min(0, { message: i18nValidationMessage('partner.validation.offset_min') })
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm (tên, mã, email, phone)',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('partner.validation.keywords_string'),
  })
  keywords?: string;

  @ApiPropertyOptional({ description: 'Loại đối tác', enum: PartnerType })
  @IsOptional()
  @IsEnum(PartnerType, {
    message: i18nValidationMessage('partner.validation.type_invalid'),
  })
  type?: PartnerType;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({
    message: i18nValidationMessage('partner.validation.is_active_boolean'),
  })
  is_active?: boolean;
}
