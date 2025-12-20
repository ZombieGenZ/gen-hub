import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class QueryProvinceDto {
    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (tên, mã)' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('province.validation.keywords_string') })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Loại tỉnh/thành', enum: ['TINH', 'THANH_PHO'] })
    @IsOptional()
    @IsString()
    type?: string;
}
