import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueryRevenueDto } from './query-revenue.dto';

export enum ExportFormat {
    EXCEL = 'excel',
    PDF = 'pdf',
}

export class ExportRevenueDto extends QueryRevenueDto {
    @ApiPropertyOptional({
        enum: ExportFormat,
        default: ExportFormat.EXCEL,
        description: 'Định dạng file xuất ra',
    })
    @IsOptional()
    @IsEnum(ExportFormat)
    format?: ExportFormat;
}
