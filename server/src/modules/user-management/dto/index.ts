import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsUUID,
    IsBoolean,
    IsDateString,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO query danh sách users
 */
export class QueryUsersDto {
    @ApiPropertyOptional({ description: 'Giới hạn số lượng', example: 10 })
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', example: 0 })
    @IsOptional()
    offset?: number;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm', example: 'user@email.com' })
    @IsOptional()
    keywords?: string;

    @ApiPropertyOptional({
        description: 'Lọc theo trạng thái',
        example: 'active',
        enum: ['active', 'banned', 'verified', 'unverified'],
    })
    @IsOptional()
    status?: string;
}

/**
 * DTO ban user
 */
export class BanUserDto {
    @ApiProperty({ description: 'Lý do ban', example: 'Vi phạm điều khoản sử dụng' })
    @IsString({ message: i18nValidationMessage('user-management.validation.reason_string') })
    @IsNotEmpty({ message: i18nValidationMessage('user-management.validation.reason_required') })
    reason: string;

    @ApiPropertyOptional({ description: 'Ban vĩnh viễn', example: false })
    @IsBoolean({ message: i18nValidationMessage('user-management.validation.is_permanent_boolean') })
    @IsOptional()
    is_permanent?: boolean;

    @ApiPropertyOptional({ description: 'Thời điểm hết ban (nếu không vĩnh viễn)', example: '2025-12-31T23:59:59.000Z' })
    @IsDateString({}, { message: i18nValidationMessage('user-management.validation.banned_end_date') })
    @IsOptional()
    banned_end?: string;
}

/**
 * DTO unban user
 */
export class UnbanUserDto {
    @ApiPropertyOptional({ description: 'Ghi chú khi unban', example: 'Xác nhận đã xử lý vi phạm' })
    @IsString({ message: i18nValidationMessage('user-management.validation.note_string') })
    @IsOptional()
    note?: string;
}

/**
 * DTO cảnh cáo user
 */
export class WarnUserDto {
    @ApiProperty({ description: 'ID danh mục cảnh báo', example: '550e8400-e29b-41d4-a716-446655440000' })
    @IsUUID('4', { message: i18nValidationMessage('user-management.validation.category_id_uuid') })
    @IsNotEmpty({ message: i18nValidationMessage('user-management.validation.category_id_required') })
    category_id: string;

    @ApiProperty({ description: 'Lý do cảnh báo chi tiết', example: 'Sử dụng ngôn ngữ không phù hợp' })
    @IsString({ message: i18nValidationMessage('user-management.validation.reason_string') })
    @IsNotEmpty({ message: i18nValidationMessage('user-management.validation.reason_required') })
    reason: string;

    @ApiPropertyOptional({ description: 'Cảnh báo vĩnh viễn', example: false })
    @IsBoolean({ message: i18nValidationMessage('user-management.validation.is_permanent_boolean') })
    @IsOptional()
    is_permanent?: boolean;

    @ApiPropertyOptional({ description: 'Thời điểm hết hiệu lực cảnh báo', example: '2025-12-31T23:59:59.000Z' })
    @IsDateString({}, { message: i18nValidationMessage('user-management.validation.expires_at_date') })
    @IsOptional()
    expires_at?: string;
}

/**
 * DTO gỡ cảnh báo
 */
export class UnwarnUserDto {
    @ApiPropertyOptional({ description: 'Ghi chú khi gỡ cảnh báo', example: 'Đã xem xét và gỡ bỏ cảnh báo' })
    @IsString({ message: i18nValidationMessage('user-management.validation.note_string') })
    @IsOptional()
    note?: string;
}

/**
 * DTO query danh sách warnings của user
 */
export class QueryUserWarningsDto {
    @ApiPropertyOptional({ description: 'Giới hạn số lượng', example: 10 })
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', example: 0 })
    @IsOptional()
    offset?: number;

    @ApiPropertyOptional({
        description: 'Lọc theo trạng thái',
        example: 'active',
        enum: ['active', 'removed', 'expired'],
    })
    @IsOptional()
    status?: string;
}

/**
 * DTO query sessions
 */
export class QuerySessionsDto {
    @ApiPropertyOptional({ description: 'Giới hạn số lượng', example: 10 })
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', example: 0 })
    @IsOptional()
    offset?: number;
}
