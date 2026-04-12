import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateRankDto {
  @ApiProperty({ description: 'Tên hạng', example: 'Thành viên' })
  @IsNotEmpty({
    message: i18nValidationMessage('rank.validation.name_required'),
  })
  @IsString({ message: i18nValidationMessage('rank.validation.name_string') })
  @MaxLength(255, {
    message: i18nValidationMessage('rank.validation.name_max_length'),
  })
  name: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('rank.validation.description_string'),
  })
  description?: string;

  @ApiPropertyOptional({ description: 'Đặt làm mặc định', default: false })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('rank.validation.is_default_boolean'),
  })
  is_default?: boolean;

  @ApiPropertyOptional({
    description: 'Mốc điểm tích lũy tối thiểu',
    default: 0,
  })
  @IsOptional()
  @IsInt({
    message: i18nValidationMessage('rank.validation.min_loyalty_points_number'),
  })
  @Min(0, {
    message: i18nValidationMessage('rank.validation.min_loyalty_points_min'),
  })
  min_loyalty_points?: number;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('rank.validation.is_active_boolean'),
  })
  is_active?: boolean;
}
