import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export class QueryTransactionDto {
    @ApiPropertyOptional({ description: 'ID kho cần lọc', example: '550e8400-e29b-41d4-a716-446655440003' })
    @IsOptional()
    @IsUUID()
    warehouse_id?: string;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo mã phiếu hoặc tên sản phẩm', example: 'PN-2026' })
    @IsOptional()
    @IsString()
    keywords?: string;

    @ApiPropertyOptional({ description: 'Lọc theo loại giao dịch', enum: TransactionType, example: TransactionType.INBOUND })
    @IsOptional()
    @IsEnum(TransactionType)
    type?: TransactionType;

    @ApiPropertyOptional({ description: 'Số lượng bản ghi trên mỗi trang', example: 10, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu để phân trang', example: 0, default: 0 })
    @IsOptional()
    @Type(() => Number)
    @Min(0)
    offset?: number = 0;
}
