import { IsOptional, IsString, IsInt, Min, IsUUID, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
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

/**
 * DTO tạo yêu cầu hoàn tiền từ phía khách hàng
 */
export class CreateRefundRequestDto {
    @ApiProperty({ description: 'ID của hợp đồng thuê', example: '550e8400-e29b-41d4-a716-xxxxxxxxxxxx' })
    @IsNotEmpty({ message: i18nValidationMessage('refund-request.validation.rental_contract_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('refund-request.validation.rental_contract_id_uuid') })
    rental_contract_id: string;

    @ApiProperty({ description: 'Số tiền gốc của hợp đồng', example: 10000000 })
    @IsNotEmpty()
    original_amount: number;

    @ApiProperty({ description: 'Phần trăm phí dự kiến', example: 10 })
    @IsNotEmpty()
    fee_percent: number;

    @ApiProperty({ description: 'Số tiền phí dự kiến', example: 1000000 })
    @IsNotEmpty()
    fee_amount: number;

    @ApiProperty({ description: 'Số tiền thực nhận dự kiến', example: 9000000 })
    @IsNotEmpty()
    final_refund_amount: number;

    @ApiPropertyOptional({ description: 'Lý do yêu cầu hoàn tiền', example: 'Chuyển văn phòng nên không còn nhu cầu sử dụng' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('refund-request.validation.reason_string') })
    @MaxLength(1000, { message: i18nValidationMessage('refund-request.validation.reason_max_length') })
    reason?: string;
}
