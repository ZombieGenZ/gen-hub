import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Một dòng cập nhật số đếm thực tế trong phiếu kiểm kê
 */
export class StockTakeDetailItemDto {
  @ApiProperty({
    description: 'ID của dòng chi tiết kiểm kê (StockTakeDetail.id)',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  detail_id: string;

  @ApiProperty({
    description: 'Số lượng đếm thực tế',
    example: 95,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  actual_qty: number;
}

/**
 * DTO cập nhật số đếm thực tế cho nhiều dòng trong phiếu kiểm kê
 */
export class UpdateStockTakeDetailsDto {
  @ApiProperty({
    description: 'Danh sách các dòng cần cập nhật số đếm',
    type: [StockTakeDetailItemDto],
  })
  @IsArray()
  @Type(() => StockTakeDetailItemDto)
  details: StockTakeDetailItemDto[];
}
