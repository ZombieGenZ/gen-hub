import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class QueryProvinceDto {
    @ApiPropertyOptional({ description: 'Số lượng bản ghi tối đa', default: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('province.validation.limit_int') })
    @Min(1, { message: i18nValidationMessage('province.validation.limit_min') })
    limit?: number = 100;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('province.validation.offset_int') })
    @Min(0, { message: i18nValidationMessage('province.validation.offset_min') })
    offset?: number = 0;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (tên, mã)' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('province.validation.keywords_string') })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Loại tỉnh/thành', enum: ['TINH', 'THANH_PHO'] })
    @IsOptional()
    @IsString()
    type?: string;
}
