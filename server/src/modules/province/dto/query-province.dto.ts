import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ProvinceType } from '@prisma/client';

export class QueryProvinceDto {
    @ApiPropertyOptional({
        description: 'Từ khóa tìm kiếm (tên tỉnh/thành phố, mã)',
        example: 'Hà Nội',
        type: String,
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('province.validation.keywords_string') })
    keywords?: string;

    @ApiPropertyOptional({
        description: 'Loại tỉnh/thành phố (PROVINCE: Tỉnh, CITY: Thành phố trực thuộc trung ương)',
        enum: ProvinceType,
        example: 'CITY',
    })
    @IsOptional()
    @IsEnum(ProvinceType, { message: i18nValidationMessage('province.validation.type_invalid') })
    type?: ProvinceType;
}
