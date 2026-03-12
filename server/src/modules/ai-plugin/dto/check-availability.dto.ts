import { IsOptional, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO cho API check availability
 */
export class CheckAvailabilityDto {
    @ApiProperty({ description: 'ID kho cần kiểm tra' })
    @IsUUID('4', { message: i18nValidationMessage('ai-plugin.validation.warehouse_id_uuid') })
    warehouse_id: string;

    @ApiPropertyOptional({ description: 'ID row cụ thể (optional, cho kho chung)' })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('ai-plugin.validation.row_id_uuid') })
    row_id?: string;
}
