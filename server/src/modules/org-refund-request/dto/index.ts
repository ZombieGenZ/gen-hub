import { IsOptional, IsString, IsInt, Min, IsUUID, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RefundStatus } from '@prisma/client';

/**
 * DTO query params cho danh sách yêu cầu hoàn tiền
 */
export class QueryRefundRequestDto {
    @ApiPropertyOptional({ description: 'Số lượng kết quả tối đa', example: 10, minimum: 1 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1, { message: i18nValidationMessage('refund-request.validation.limit_positive') })
    limit?: number;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu (phân trang)', example: 0, minimum: 0 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(0, { message: i18nValidationMessage('refund-request.validation.offset_min') })
    offset?: number;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (mã hợp đồng, ghi chú)', example: 'GENHUB' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('refund-request.validation.keywords_string') })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Trạng thái yêu cầu hoàn tiền', enum: RefundStatus, example: 'PENDING' })
    @IsOptional()
    @IsEnum(RefundStatus, { message: i18nValidationMessage('refund-request.validation.status_invalid') })
    status?: RefundStatus;

    @ApiPropertyOptional({ description: 'Lọc theo ID tổ chức', example: '550e8400-e29b-41d4-a716-446655440001' })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('refund-request.validation.organization_id_uuid') })
    organization_id?: string;
}
