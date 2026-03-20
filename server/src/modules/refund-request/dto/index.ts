import { IsOptional, IsString, IsInt, Min, IsUUID, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
 * DTO duyệt yêu cầu hoàn tiền
 */
export class AcceptRefundRequestDto {
    @ApiProperty({ description: 'Phần trăm phí phạt/xử lý cuối cùng', example: 10 })
    @IsNotEmpty()
    fee_percent: number;

    @ApiProperty({ description: 'Số tiền phí phạt/xử lý cuối cùng', example: 1000000 })
    @IsNotEmpty()
    fee_amount: number;

    @ApiProperty({ description: 'Số tiền thực nhận cuối cùng', example: 9000000 })
    @IsNotEmpty()
    final_refund_amount: number;

    @ApiPropertyOptional({ description: 'Ghi chú xử lý', example: 'Đã duyệt và chuyển tiền về tài khoản' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('refund-request.validation.process_notes_string') })
    @MaxLength(1000, { message: i18nValidationMessage('refund-request.validation.process_notes_max_length') })
    process_notes?: string;
}

/**
 * DTO từ chối yêu cầu hoàn tiền
 */
export class RejectRefundRequestDto {
    @ApiProperty({ description: 'Lý do từ chối', example: 'Không đủ điều kiện hoàn tiền theo chính sách' })
    @IsNotEmpty({ message: i18nValidationMessage('refund-request.validation.reject_reason_required') })
    @IsString({ message: i18nValidationMessage('refund-request.validation.reject_reason_string') })
    @MaxLength(1000, { message: i18nValidationMessage('refund-request.validation.reject_reason_max_length') })
    reject_reason: string;

    @ApiPropertyOptional({ description: 'Ghi chú xử lý', example: 'Đã liên hệ khách hàng giải thích' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('refund-request.validation.process_notes_string') })
    @MaxLength(1000, { message: i18nValidationMessage('refund-request.validation.process_notes_max_length') })
    process_notes?: string;
}

/**
 * DTO thay đổi trạng thái yêu cầu hoàn tiền (sau khi đã accept/reject)
 */
export class ChangeRefundStatusDto {
    @ApiProperty({ description: 'Trạng thái mới', enum: RefundStatus, example: 'APPROVED' })
    @IsNotEmpty({ message: i18nValidationMessage('refund-request.validation.new_status_required') })
    @IsEnum(RefundStatus, { message: i18nValidationMessage('refund-request.validation.new_status_invalid') })
    new_status: RefundStatus;

    @ApiPropertyOptional({ description: 'Lý do thay đổi', example: 'Xem xét lại và quyết định duyệt' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('refund-request.validation.change_reason_string') })
    @MaxLength(1000, { message: i18nValidationMessage('refund-request.validation.change_reason_max_length') })
    change_reason?: string;

    @ApiPropertyOptional({ description: 'Ghi chú xử lý', example: 'Đã xem xét lại hồ sơ' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('refund-request.validation.process_notes_string') })
    @MaxLength(1000, { message: i18nValidationMessage('refund-request.validation.process_notes_max_length') })
    process_notes?: string;
}
