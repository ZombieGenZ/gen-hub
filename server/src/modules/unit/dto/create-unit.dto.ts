import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateUnitDto {
    @ApiProperty({ description: 'Tên đơn vị tính', example: 'Kilogram' })
    @IsNotEmpty({ message: i18nValidationMessage('unit.validation.name_required') })
    @IsString({ message: i18nValidationMessage('unit.validation.name_string') })
    @MaxLength(100, { message: i18nValidationMessage('unit.validation.name_max_length') })
    name: string;

    @ApiPropertyOptional({ description: 'Mô tả đơn vị tính', example: 'Đơn vị đo khối lượng' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('unit.validation.description_string') })
    @MaxLength(500, { message: i18nValidationMessage('unit.validation.description_max_length') })
    description?: string;

    @ApiPropertyOptional({ description: 'Hỗ trợ nhiều ngôn ngữ', default: false })
    @IsOptional()
    @IsBoolean({ message: i18nValidationMessage('unit.validation.is_used_multiple_languages_boolean') })
    is_used_multiple_languages?: boolean;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({ message: i18nValidationMessage('unit.validation.is_active_boolean') })
    is_active?: boolean;
}
