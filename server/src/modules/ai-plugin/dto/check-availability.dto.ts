import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'ID của kho cần kiểm tra tình trạng còn chỗ theo dữ liệu thời gian thực.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', {
    message: i18nValidationMessage('ai-plugin.validation.warehouse_id_uuid'),
  })
  warehouse_id: string;

  @ApiPropertyOptional({
    description:
      'ID của row hoặc khu vực cụ thể trong kho chia sẻ. Chỉ truyền khi cần kiểm tra một vị trí xác định.',
    example: '660e8400-e29b-41d4-a716-446655440111',
  })
  @IsOptional()
  @IsUUID('4', { message: i18nValidationMessage('ai-plugin.validation.row_id_uuid') })
  row_id?: string;
}
