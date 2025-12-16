import { IsOptional, IsString, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class QueryWardDto {
    @ApiPropertyOptional({ description: 'Số lượng bản ghi tối đa', default: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('ward.validation.limit_int') })
    @Min(1, { message: i18nValidationMessage('ward.validation.limit_min') })
    limit?: number = 100;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('ward.validation.offset_int') })
    @Min(0, { message: i18nValidationMessage('ward.validation.offset_min') })
    offset?: number = 0;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (tên, mã)' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('ward.validation.keywords_string') })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Loại phường/xã', enum: ['WARD', 'COMMUNE', 'TOWNSHIP', 'TOWN', 'CITY'] })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiPropertyOptional({ description: 'ID tỉnh/thành phố (filter theo tỉnh)' })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('ward.validation.province_id_uuid') })
    province_id?: string;
}
