import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ConsultationRequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

import { CreateConsultationRequestDto } from './create-consultation-request.dto';

export class UpdateConsultationRequestDto extends PartialType(CreateConsultationRequestDto) {
  @ApiPropertyOptional({
    description: 'Trạng thái mới của yêu cầu tư vấn.',
    enum: ConsultationRequestStatus,
    example: ConsultationRequestStatus.CONTACTED,
  })
  @IsOptional()
  @IsEnum(ConsultationRequestStatus, {
    message: i18nValidationMessage('consultation-request.validation.status_enum'),
  })
  status?: ConsultationRequestStatus;

  @ApiPropertyOptional({
    description: 'ID nhân viên được phân công xử lý yêu cầu.',
    example: '660e8400-e29b-41d4-a716-446655440111',
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage('consultation-request.validation.assigned_to_uuid'),
  })
  assigned_to?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú nội bộ của nhân viên xử lý.',
    example: 'Khách muốn nhận báo giá trước ngày 20/03.',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('consultation-request.validation.staff_notes_string'),
  })
  staff_notes?: string;
}
