import { IsInt, IsOptional, Min, Max, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BalanceTransactionType } from '@prisma/client';

/**
 * DTO để query danh sách giao dịch
 */
export class QueryBalanceTransactionDto {
    @ApiPropertyOptional({ description: 'Số lượng items trả về', default: 20 })
    @IsOptional()
    @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
    @Min(1, { message: i18nValidationMessage('validation.MIN') })
    @Max(100, { message: i18nValidationMessage('validation.MAX') })
    @Transform(({ value }) => parseInt(value, 10))
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
    @IsOptional()
    @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
    @Min(0, { message: i18nValidationMessage('validation.MIN') })
    @Transform(({ value }) => parseInt(value, 10))
    offset?: number = 0;

    @ApiPropertyOptional({ description: 'Loại giao dịch', enum: BalanceTransactionType })
    @IsOptional()
    @IsEnum(BalanceTransactionType, { message: i18nValidationMessage('validation.IS_ENUM') })
    type?: BalanceTransactionType;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm trong mô tả' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
    keywords?: string;
}
