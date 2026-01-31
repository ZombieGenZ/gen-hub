import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO để tạo yêu cầu nạp tiền
 */
export class CreateDepositDto {
    @ApiProperty({ description: 'Số tiền nạp (VND)', example: 100000 })
    @IsInt({ message: i18nValidationMessage('organization-balance.AMOUNT_MUST_BE_INTEGER') })
    @Min(10000, { message: i18nValidationMessage('organization-balance.AMOUNT_MIN') })
    @Max(100000000, { message: i18nValidationMessage('organization-balance.AMOUNT_MAX') })
    @Transform(({ value }) => parseInt(value, 10))
    amount: number;

    @ApiPropertyOptional({ description: 'Ghi chú', example: 'Nạp tiền cho tài khoản' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
    notes?: string;
}
