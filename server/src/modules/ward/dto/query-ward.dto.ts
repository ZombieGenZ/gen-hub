import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class QueryWardDto {
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
