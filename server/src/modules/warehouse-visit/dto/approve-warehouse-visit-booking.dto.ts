import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export enum WarehouseVisitApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ApproveWarehouseVisitBookingDto {
  @ApiProperty({
    description: 'Hành động xử lý lịch hẹn: duyệt hoặc từ chối.',
    enum: WarehouseVisitApprovalAction,
    example: WarehouseVisitApprovalAction.APPROVE,
  })
  @IsEnum(WarehouseVisitApprovalAction, {
    message: i18nValidationMessage('warehouse_visit.validation.action_enum'),
  })
  action: WarehouseVisitApprovalAction;

  @ApiPropertyOptional({
    description: 'Ghi chú xác nhận khi lịch hẹn được duyệt.',
    example: 'Đã xác nhận lịch với khách qua điện thoại.',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('warehouse_visit.validation.confirmation_notes_string'),
  })
  confirmation_notes?: string;

  @ApiPropertyOptional({
    description: 'Lý do từ chối lịch hẹn nếu action là REJECT.',
    example: 'Khung giờ đã kín, vui lòng chọn lịch khác.',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('warehouse_visit.validation.rejection_reason_string'),
  })
  rejection_reason?: string;
}
