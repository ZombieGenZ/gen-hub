import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ManagementFeeType } from '@prisma/client';

/**
 * DTO tạo mới Insurance - Bảo hiểm
 */
export class CreateInsuranceDto {
  @ApiProperty({
    description: 'Tên bảo hiểm / Insurance name',
    example: 'Bảo hiểm hàng hóa cơ bản',
    maxLength: 255,
  })
  @IsNotEmpty({
    message: i18nValidationMessage('insurance.validation.name_required'),
  })
  @IsString({
    message: i18nValidationMessage('insurance.validation.name_string'),
  })
  @MaxLength(255, {
    message: i18nValidationMessage('insurance.validation.name_max_length'),
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả bảo hiểm / Insurance description',
    example: 'Bảo hiểm giá trị hàng hóa trong kho',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('insurance.validation.description_string'),
  })
  description?: string;

  @ApiProperty({
    description: 'Giá bảo hiểm (VNĐ) / Insurance price (VND)',
    example: 500000,
    minimum: 0,
  })
  @IsNotEmpty({
    message: i18nValidationMessage('insurance.validation.price_required'),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('insurance.validation.price_number'),
    },
  )
  @Min(0, {
    message: i18nValidationMessage('insurance.validation.price_min'),
  })
  price: number;

  @ApiPropertyOptional({
    description: 'Sử dụng phí quản lý / Use management fee',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'insurance.validation.use_management_fee_boolean',
    ),
  })
  use_management_fee?: boolean;

  @ApiPropertyOptional({
    description:
      'Loại phí quản lý (PERCENT: phần trăm, AMOUNT: số tiền cố định) / Management fee type',
    enum: ManagementFeeType,
    enumName: 'ManagementFeeType',
    example: 'PERCENT',
  })
  @ValidateIf((o) => o.use_management_fee === true)
  @IsNotEmpty({
    message: i18nValidationMessage(
      'insurance.validation.management_fee_type_required',
    ),
  })
  @IsEnum(ManagementFeeType, {
    message: i18nValidationMessage(
      'insurance.validation.management_fee_type_enum',
    ),
  })
  management_fee_type?: ManagementFeeType;

  @ApiPropertyOptional({
    description:
      'Giá trị phí quản lý (nếu PERCENT: 0-100%, nếu AMOUNT: số tiền VNĐ) / Management fee value',
    example: 10,
    minimum: 0,
  })
  @ValidateIf((o) => o.use_management_fee === true)
  @IsNotEmpty({
    message: i18nValidationMessage(
      'insurance.validation.management_fee_value_required',
    ),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'insurance.validation.management_fee_value_number',
      ),
    },
  )
  @Min(0, {
    message: i18nValidationMessage(
      'insurance.validation.management_fee_value_min',
    ),
  })
  @ValidateIf((o) => o.management_fee_type === 'PERCENT')
  @Max(100, {
    message: i18nValidationMessage(
      'insurance.validation.management_fee_value_max_percent',
    ),
  })
  management_fee_value?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động / Active status',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('insurance.validation.is_active_boolean'),
  })
  is_active?: boolean;
}
