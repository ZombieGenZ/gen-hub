import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ExportStatus } from '@prisma/client';

/**
 * DTO cho query danh sách yêu cầu xuất kho
 */
export class QueryOutboundRequestDto {
    @ApiPropertyOptional({
        description: 'ID kho (lọc theo kho)',
        example: '550e8400-e29b-41d4-a716-446655440003',
    })
    @IsOptional()
    @IsString()
    warehouse_id?: string;

    @ApiPropertyOptional({
        description: 'Từ khóa tìm kiếm (mã phiếu, đơn hàng)',
        example: 'PX-2026',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('inventory-request.validation.keywords_string') })
    keywords?: string;

    @ApiPropertyOptional({
        description: 'Lọc theo trạng thái',
        enum: ExportStatus,
        example: 'PENDING',
    })
    @IsOptional()
    @IsEnum(ExportStatus, { message: i18nValidationMessage('inventory-request.validation.status_enum') })
    status?: ExportStatus;

    @ApiPropertyOptional({
        description: 'Số lượng bản ghi trên trang',
        default: 10,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1, { message: i18nValidationMessage('inventory-request.validation.limit_positive') })
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Vị trí bắt đầu',
        default: 0,
        minimum: 0,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0, { message: i18nValidationMessage('inventory-request.validation.offset_min') })
    offset?: number = 0;
}
