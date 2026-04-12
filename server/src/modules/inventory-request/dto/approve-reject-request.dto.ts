import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RejectRequestDto {
  @ApiPropertyOptional({
    description: 'Lý do từ chối',
    example: 'Thông tin sản phẩm không hợp lệ',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'inventory-request.validation.reject_reason_string',
    ),
  })
  @MaxLength(500)
  reason?: string;
}

export enum ApprovePickingStrategy {
  FEFO = 'FEFO',
  FIFO = 'FIFO',
}

export class ApproveRequestDto {
  @ApiPropertyOptional({
    description: 'Ghi chú khi duyệt',
    example: 'Đã kiểm tra, hợp lệ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Chiến lược nhặt hàng',
    enum: ApprovePickingStrategy,
    default: ApprovePickingStrategy.FEFO,
  })
  @IsOptional()
  @IsEnum(ApprovePickingStrategy)
  picking_strategy?: ApprovePickingStrategy;
}
