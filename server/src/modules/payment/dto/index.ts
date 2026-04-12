import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO cho webhook từ SePay
 */
export class SepayWebhookDto {
  @ApiProperty({ description: 'ID giao dịch trên SePay' })
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @ApiProperty({ description: 'Brand name ngân hàng' })
  @IsNotEmpty()
  @IsString()
  gateway: string;

  @ApiProperty({ description: 'Thời gian giao dịch' })
  @IsNotEmpty()
  @IsString()
  transactionDate: string;

  @ApiProperty({ description: 'Số tài khoản ngân hàng' })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ description: 'Tài khoản định danh' })
  @IsOptional()
  @IsString()
  subAccount?: string;

  @ApiPropertyOptional({ description: 'Mã code thanh toán' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Nội dung chuyển khoản' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Loại giao dịch: in hoặc out' })
  @IsNotEmpty()
  @IsIn(['in', 'out'])
  transferType: 'in' | 'out';

  @ApiProperty({ description: 'Số tiền giao dịch' })
  @IsNotEmpty()
  @IsNumber()
  transferAmount: number;

  @ApiProperty({ description: 'Số dư tài khoản' })
  @IsNotEmpty()
  @IsNumber()
  accumulated: number;

  @ApiProperty({ description: 'Mã tham chiếu' })
  @IsNotEmpty()
  @IsString()
  referenceCode: string;

  @ApiProperty({ description: 'Toàn bộ nội dung tin nhắn' })
  @IsNotEmpty()
  @IsString()
  description: string;
}

/**
 * Query params cho callback URLs
 */
export class PaymentCallbackQueryDto {
  @ApiPropertyOptional({ description: 'Mã thanh toán' })
  @IsOptional()
  @IsString()
  paymentCode?: string;

  @ApiPropertyOptional({ description: 'Trạng thái' })
  @IsOptional()
  @IsString()
  status?: string;
}
