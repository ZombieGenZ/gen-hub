import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  IsUUID,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateBatchDto {
  @ApiProperty({ description: 'ID sản phẩm' })
  @IsNotEmpty({
    message: i18nValidationMessage('batch.validation.product_id_required'),
  })
  @IsUUID('4', {
    message: i18nValidationMessage('batch.validation.product_id_uuid'),
  })
  product_id: string;

  @ApiProperty({ description: 'Mã lô hàng', example: 'LOT-2024-001' })
  @IsNotEmpty({
    message: i18nValidationMessage('batch.validation.code_required'),
  })
  @IsString({ message: i18nValidationMessage('batch.validation.code_string') })
  @MaxLength(50, {
    message: i18nValidationMessage('batch.validation.code_max_length'),
  })
  code: string;

  @ApiPropertyOptional({ description: 'Ngày sản xuất', example: '2024-01-01' })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: i18nValidationMessage(
        'batch.validation.manufacturing_date_invalid',
      ),
    },
  )
  manufacturing_date?: string;

  @ApiPropertyOptional({ description: 'Ngày hết hạn', example: '2025-01-01' })
  @IsOptional()
  @IsDateString(
    {},
    { message: i18nValidationMessage('batch.validation.expiry_date_invalid') },
  )
  expiry_date?: string;

  @ApiPropertyOptional({ description: 'Giá nhập', default: 0 })
  @IsOptional()
  @IsNumber(
    {},
    { message: i18nValidationMessage('batch.validation.import_price_number') },
  )
  @Min(0, {
    message: i18nValidationMessage('batch.validation.import_price_min'),
  })
  import_price?: number;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('batch.validation.is_active_boolean'),
  })
  is_active?: boolean;
}
