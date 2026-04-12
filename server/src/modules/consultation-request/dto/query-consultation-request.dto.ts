import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConsultationRequestSource,
  ConsultationRequestStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class QueryConsultationRequestDto {
  @ApiPropertyOptional({
    description: 'Trang hiện tại của danh sách yêu cầu tư vấn.',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, {
    message: i18nValidationMessage('consultation-request.validation.page_min'),
  })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi trả về trên mỗi trang.',
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, {
    message: i18nValidationMessage('consultation-request.validation.limit_min'),
  })
  limit?: number = 10;

  @ApiPropertyOptional({
    description:
      'Từ khóa tìm kiếm theo tên, email, số điện thoại hoặc mã yêu cầu.',
    example: 'Nguyễn Thị Lan',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'consultation-request.validation.search_string',
    ),
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái xử lý của yêu cầu tư vấn.',
    enum: ConsultationRequestStatus,
    example: ConsultationRequestStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ConsultationRequestStatus, {
    message: i18nValidationMessage(
      'consultation-request.validation.status_enum',
    ),
  })
  status?: ConsultationRequestStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo nguồn tạo yêu cầu tư vấn.',
    enum: ConsultationRequestSource,
    example: ConsultationRequestSource.WEB_FORM,
  })
  @IsOptional()
  @IsEnum(ConsultationRequestSource, {
    message: i18nValidationMessage(
      'consultation-request.validation.source_enum',
    ),
  })
  source?: ConsultationRequestSource;

  @ApiPropertyOptional({
    description: 'ID nhân viên đang được phân công xử lý yêu cầu.',
    example: '660e8400-e29b-41d4-a716-446655440111',
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage(
      'consultation-request.validation.assigned_to_uuid',
    ),
  })
  assigned_to?: string;

  @ApiPropertyOptional({
    description: 'Trường dùng để sắp xếp danh sách.',
    default: 'created_at',
    example: 'created_at',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'consultation-request.validation.sort_by_string',
    ),
  })
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Thứ tự sắp xếp tăng dần hoặc giảm dần.',
    default: 'desc',
    example: 'desc',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'consultation-request.validation.sort_order_string',
    ),
  })
  sort_order?: 'asc' | 'desc' = 'desc';
}
