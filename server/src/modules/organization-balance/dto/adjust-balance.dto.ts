import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BalanceTransactionType } from '@prisma/client';

/**
 * DTO để admin điều chỉnh số dư (thưởng/phạt)
 */
export class AdjustBalanceDto {
  @ApiProperty({ description: 'Số tiền điều chỉnh (VND)', example: 50000 })
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  amount: number;

  @ApiProperty({
    description: 'Loại điều chỉnh',
    enum: ['ADJUSTMENT', 'BONUS', 'REFUND'],
    example: 'BONUS',
  })
  @IsEnum(['ADJUSTMENT', 'BONUS', 'REFUND'], {
    message: i18nValidationMessage(
      'organization-balance.INVALID_ADJUSTMENT_TYPE',
    ),
  })
  type: 'ADJUSTMENT' | 'BONUS' | 'REFUND';

  @ApiProperty({
    description: 'Lý do điều chỉnh',
    example: 'Thưởng khách hàng VIP',
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  description: string;

  @ApiPropertyOptional({ description: 'Ghi chú nội bộ' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  notes?: string;
}
