import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGpsSessionDto {
  @ApiProperty({ description: 'Biển số xe (sẽ được chuẩn hóa)' })
  @IsString()
  license_plate: string;

  @ApiProperty({ description: 'ID warehouse template cần theo dõi' })
  @IsUUID()
  warehouse_template_id: string;

  @ApiPropertyOptional({ description: 'ID phiếu nhập liên kết' })
  @IsOptional()
  @IsUUID()
  receipt_id?: string;

  @ApiPropertyOptional({ description: 'ID phiếu xuất liên kết' })
  @IsOptional()
  @IsUUID()
  export_id?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại tài xế để gửi link' })
  @IsOptional()
  @IsString()
  driver_phone?: string;
}
