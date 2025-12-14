import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO cho webhook từ PayOS
 */
export class PayOSWebhookDto {
    @ApiProperty({ description: 'Mã lỗi từ PayOS' })
    @IsNotEmpty()
    @IsString()
    code: string;

    @ApiProperty({ description: 'Mô tả lỗi' })
    @IsNotEmpty()
    @IsString()
    desc: string;

    @ApiProperty({ description: 'Dữ liệu thanh toán' })
    @IsNotEmpty()
    data: any;

    @ApiProperty({ description: 'Chữ ký xác thực' })
    @IsNotEmpty()
    @IsString()
    signature: string;
}

/**
 * Query params cho callback URLs
 */
export class PaymentCallbackQueryDto {
    @ApiPropertyOptional({ description: 'Mã đơn hàng' })
    @IsOptional()
    @IsNumber()
    orderCode?: number;

    @ApiPropertyOptional({ description: 'Mã lỗi' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({ description: 'ID thanh toán' })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiPropertyOptional({ description: 'Trạng thái hủy' })
    @IsOptional()
    @IsString()
    cancel?: string;

    @ApiPropertyOptional({ description: 'Trạng thái' })
    @IsOptional()
    @IsString()
    status?: string;
}
