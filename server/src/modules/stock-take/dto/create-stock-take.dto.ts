import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO tạo phiếu kiểm kê mới
 */
export class CreateStockTakeDto {
  @ApiProperty({
    description: 'ID kho cần kiểm kê',
    example: '550e8400-e29b-41d4-a716-446655440003',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  warehouse_id: string;

  @ApiPropertyOptional({
    description: 'Ghi chú cho phiếu kiểm kê',
    example: 'Kiểm kê định kỳ tháng 4/2026',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
