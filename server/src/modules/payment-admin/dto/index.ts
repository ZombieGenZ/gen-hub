import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';

export class QueryPaymentDto {
  @ApiPropertyOptional({ description: 'Số lượng tối đa', default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number = 0;
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo mã thanh toán hoặc nội dung',
  })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    description: 'Trạng thái thanh toán',
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'ID tổ chức' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export * from './manual-action-payment.dto';
