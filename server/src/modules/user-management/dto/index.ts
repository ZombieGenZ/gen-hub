import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enum loại thời hạn
 */
export enum DurationType {
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
}

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

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm',
    example: 'user@email.com',
  })
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
  @ApiProperty({
    description: 'Lý do ban',
    example: 'Vi phạm điều khoản sử dụng',
  })
  @IsString({
    message: i18nValidationMessage('user-management.validation.reason_string'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-management.validation.reason_required',
    ),
  })
  reason: string;

  @ApiPropertyOptional({ description: 'Ban vĩnh viễn', example: false })
  @IsBoolean({
    message: i18nValidationMessage(
      'user-management.validation.is_permanent_boolean',
    ),
  })
  @IsOptional()
  is_permanent?: boolean;

  @ApiPropertyOptional({
    description: 'Giá trị thời hạn (dùng kết hợp với duration_type)',
    example: 10,
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'user-management.validation.duration_value_number',
      ),
    },
  )
  @Min(1, {
    message: i18nValidationMessage(
      'user-management.validation.duration_value_min',
    ),
  })
  @IsOptional()
  duration_value?: number;

  @ApiPropertyOptional({
    description: 'Loại thời hạn (dùng kết hợp với duration_value)',
    enum: DurationType,
    example: 'days',
  })
  @IsEnum(DurationType, {
    message: i18nValidationMessage(
      'user-management.validation.duration_type_enum',
    ),
  })
  @IsOptional()
  duration_type?: DurationType;
}

/**
 * DTO unban user
 */
export class UnbanUserDto {
  @ApiPropertyOptional({
    description: 'Ghi chú khi unban',
    example: 'Xác nhận đã xử lý vi phạm',
  })
  @IsString({
    message: i18nValidationMessage('user-management.validation.note_string'),
  })
  @IsOptional()
  note?: string;
}

/**
 * DTO cảnh cáo user
 */
export class WarnUserDto {
  @ApiProperty({
    description: 'ID danh mục cảnh báo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', {
    message: i18nValidationMessage(
      'user-management.validation.category_id_uuid',
    ),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-management.validation.category_id_required',
    ),
  })
  category_id: string;

  @ApiProperty({
    description: 'Lý do cảnh báo chi tiết',
    example: 'Sử dụng ngôn ngữ không phù hợp',
  })
  @IsString({
    message: i18nValidationMessage('user-management.validation.reason_string'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-management.validation.reason_required',
    ),
  })
  reason: string;

  @ApiPropertyOptional({ description: 'Cảnh báo vĩnh viễn', example: false })
  @IsBoolean({
    message: i18nValidationMessage(
      'user-management.validation.is_permanent_boolean',
    ),
  })
  @IsOptional()
  is_permanent?: boolean;

  @ApiPropertyOptional({
    description: 'Giá trị thời hạn (dùng kết hợp với duration_type)',
    example: 10,
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'user-management.validation.duration_value_number',
      ),
    },
  )
  @Min(1, {
    message: i18nValidationMessage(
      'user-management.validation.duration_value_min',
    ),
  })
  @IsOptional()
  duration_value?: number;

  @ApiPropertyOptional({
    description: 'Loại thời hạn (dùng kết hợp với duration_value)',
    enum: DurationType,
    example: 'days',
  })
  @IsEnum(DurationType, {
    message: i18nValidationMessage(
      'user-management.validation.duration_type_enum',
    ),
  })
  @IsOptional()
  duration_type?: DurationType;
}

/**
 * DTO gỡ cảnh báo
 */
export class UnwarnUserDto {
  @ApiPropertyOptional({
    description: 'Ghi chú khi gỡ cảnh báo',
    example: 'Đã xem xét và gỡ bỏ cảnh báo',
  })
  @IsString({
    message: i18nValidationMessage('user-management.validation.note_string'),
  })
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

/**
 * DTO bulk ban users
 */
export class BulkBanUsersDto {
  @ApiProperty({
    description: 'Danh sách ID users cần ban',
    example: ['uuid1', 'uuid2'],
  })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage('user-management.validation.user_ids_uuid'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-management.validation.user_ids_required',
    ),
  })
  user_ids: string[];

  @ApiProperty({
    description: 'Lý do ban',
    example: 'Vi phạm điều khoản sử dụng',
  })
  @IsString({
    message: i18nValidationMessage('user-management.validation.reason_string'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-management.validation.reason_required',
    ),
  })
  reason: string;

  @ApiPropertyOptional({ description: 'Ban vĩnh viễn', example: false })
  @IsBoolean({
    message: i18nValidationMessage(
      'user-management.validation.is_permanent_boolean',
    ),
  })
  @IsOptional()
  is_permanent?: boolean;

  @ApiPropertyOptional({
    description: 'Giá trị thời hạn (dùng kết hợp với duration_type)',
    example: 10,
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'user-management.validation.duration_value_number',
      ),
    },
  )
  @Min(1, {
    message: i18nValidationMessage(
      'user-management.validation.duration_value_min',
    ),
  })
  @IsOptional()
  duration_value?: number;

  @ApiPropertyOptional({
    description: 'Loại thời hạn (dùng kết hợp với duration_value)',
    enum: DurationType,
    example: 'days',
  })
  @IsEnum(DurationType, {
    message: i18nValidationMessage(
      'user-management.validation.duration_type_enum',
    ),
  })
  @IsOptional()
  duration_type?: DurationType;
}

/**
 * DTO bulk unban users
 */
export class BulkUnbanUsersDto {
  @ApiProperty({
    description: 'Danh sách ID users cần unban',
    example: ['uuid1', 'uuid2'],
  })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage('user-management.validation.user_ids_uuid'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-management.validation.user_ids_required',
    ),
  })
  user_ids: string[];

  @ApiPropertyOptional({
    description: 'Ghi chú khi unban',
    example: 'Xác nhận đã xử lý vi phạm',
  })
  @IsString({
    message: i18nValidationMessage('user-management.validation.note_string'),
  })
  @IsOptional()
  note?: string;
}

/**
 * DTO bulk warn users
 */
export class BulkWarnUsersDto {
  @ApiProperty({
    description: 'Danh sách ID users cần cảnh cáo',
    example: ['uuid1', 'uuid2'],
  })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage('user-management.validation.user_ids_uuid'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-management.validation.user_ids_required',
    ),
  })
  user_ids: string[];

  @ApiProperty({
    description: 'ID danh mục cảnh báo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', {
    message: i18nValidationMessage(
      'user-management.validation.category_id_uuid',
    ),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-management.validation.category_id_required',
    ),
  })
  category_id: string;

  @ApiProperty({
    description: 'Lý do cảnh báo chi tiết',
    example: 'Vi phạm quy định cộng đồng',
  })
  @IsString({
    message: i18nValidationMessage('user-management.validation.reason_string'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-management.validation.reason_required',
    ),
  })
  reason: string;

  @ApiPropertyOptional({ description: 'Cảnh báo vĩnh viễn', example: false })
  @IsBoolean({
    message: i18nValidationMessage(
      'user-management.validation.is_permanent_boolean',
    ),
  })
  @IsOptional()
  is_permanent?: boolean;

  @ApiPropertyOptional({
    description: 'Giá trị thời hạn (dùng kết hợp với duration_type)',
    example: 10,
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'user-management.validation.duration_value_number',
      ),
    },
  )
  @Min(1, {
    message: i18nValidationMessage(
      'user-management.validation.duration_value_min',
    ),
  })
  @IsOptional()
  duration_value?: number;

  @ApiPropertyOptional({
    description: 'Loại thời hạn (dùng kết hợp với duration_value)',
    enum: DurationType,
    example: 'days',
  })
  @IsEnum(DurationType, {
    message: i18nValidationMessage(
      'user-management.validation.duration_type_enum',
    ),
  })
  @IsOptional()
  duration_type?: DurationType;
}

/**
 * DTO clear all warnings
 */
export class ClearAllWarningsDto {
  @ApiPropertyOptional({
    description: 'Ghi chú khi xóa tất cả cảnh cáo',
    example: 'Xóa cảnh cáo theo yêu cầu',
  })
  @IsString({
    message: i18nValidationMessage('user-management.validation.note_string'),
  })
  @IsOptional()
  note?: string;
}

/**
 * DTO bulk clear all warnings
 */
export class BulkClearAllWarningsDto {
  @ApiProperty({
    description: 'Danh sách ID users cần xóa cảnh cáo',
    example: ['uuid1', 'uuid2'],
  })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage('user-management.validation.user_ids_uuid'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-management.validation.user_ids_required',
    ),
  })
  user_ids: string[];

  @ApiPropertyOptional({
    description: 'Ghi chú khi xóa cảnh cáo',
    example: 'Xóa cảnh cáo theo yêu cầu',
  })
  @IsString({
    message: i18nValidationMessage('user-management.validation.note_string'),
  })
  @IsOptional()
  note?: string;
}

/**
 * DTO xóa 1 user
 */
export class DeleteUserDto {
  @ApiPropertyOptional({
    description: 'Lý do xóa tài khoản',
    example: 'Vi phạm nghiêm trọng',
  })
  @IsString({
    message: i18nValidationMessage('user-management.validation.reason_string'),
  })
  @IsOptional()
  reason?: string;
}

/**
 * DTO xóa nhiều users
 */
export class BulkDeleteUsersDto {
  @ApiProperty({
    description: 'Danh sách ID users cần xóa',
    example: ['uuid1', 'uuid2'],
  })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage('user-management.validation.user_ids_uuid'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-management.validation.user_ids_required',
    ),
  })
  user_ids: string[];

  @ApiPropertyOptional({
    description: 'Lý do xóa tài khoản',
    example: 'Vi phạm nghiêm trọng',
  })
  @IsString({
    message: i18nValidationMessage('user-management.validation.reason_string'),
  })
  @IsOptional()
  reason?: string;
}

/**
 * DTO tải xuống dữ liệu nhiều users
 */
export class BulkDownloadUsersDto {
  @ApiProperty({
    description: 'Danh sách ID users cần tải dữ liệu',
    example: ['uuid1', 'uuid2'],
  })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage('user-management.validation.user_ids_uuid'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-management.validation.user_ids_required',
    ),
  })
  user_ids: string[];
}

/**
 * DTO tải xuống tất cả users (với filter)
 */
export class DownloadAllUsersDto {
  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm', example: '' })
  @IsOptional()
  keywords?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái',
    example: 'active',
    enum: ['active', 'banned', 'verified', 'unverified', 'deleted'],
  })
  @IsOptional()
  status?: string;
}

export * from './assign-user-roles-permissions.dto';
