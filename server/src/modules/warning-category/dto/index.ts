import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsInt,
    Min,
    Max,
    IsBoolean,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO tạo danh mục cảnh báo
 */
export class CreateWarningCategoryDto {
    @ApiProperty({ description: 'Tên danh mục', example: 'Vi phạm chính sách' })
    @IsString({ message: i18nValidationMessage('warning-category.validation.name_string') })
    @IsNotEmpty({ message: i18nValidationMessage('warning-category.validation.name_required') })
    name: string;

    @ApiPropertyOptional({ description: 'Mô tả', example: 'Danh mục cho các vi phạm về chính sách' })
    @IsString({ message: i18nValidationMessage('warning-category.validation.description_string') })
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Mức độ nghiêm trọng (1-5)', example: 3 })
    @IsInt({ message: i18nValidationMessage('warning-category.validation.severity_int') })
    @Min(1, { message: i18nValidationMessage('warning-category.validation.severity_min') })
    @Max(5, { message: i18nValidationMessage('warning-category.validation.severity_max') })
    @IsOptional()
    severity?: number;
}

/**
 * DTO cập nhật danh mục cảnh báo
 */
export class UpdateWarningCategoryDto {
    @ApiPropertyOptional({ description: 'Tên danh mục', example: 'Vi phạm chính sách' })
    @IsString({ message: i18nValidationMessage('warning-category.validation.name_string') })
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ description: 'Mô tả', example: 'Danh mục cho các vi phạm về chính sách' })
    @IsString({ message: i18nValidationMessage('warning-category.validation.description_string') })
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Mức độ nghiêm trọng (1-5)', example: 3 })
    @IsInt({ message: i18nValidationMessage('warning-category.validation.severity_int') })
    @Min(1, { message: i18nValidationMessage('warning-category.validation.severity_min') })
    @Max(5, { message: i18nValidationMessage('warning-category.validation.severity_max') })
    @IsOptional()
    severity?: number;

    @ApiPropertyOptional({ description: 'Trạng thái kích hoạt', example: true })
    @IsBoolean({ message: i18nValidationMessage('warning-category.validation.is_active_boolean') })
    @IsOptional()
    is_active?: boolean;
}

/**
 * DTO query danh sách danh mục
 */
export class QueryWarningCategoryDto {
    @ApiPropertyOptional({ description: 'Giới hạn số lượng', example: 10 })
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', example: 0 })
    @IsOptional()
    offset?: number;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm', example: 'vi phạm' })
    @IsOptional()
    keywords?: string;

    @ApiPropertyOptional({ description: 'Lọc theo trạng thái', example: 'active' })
    @IsOptional()
    status?: string;
}

/**
 * DTO xóa nhiều danh mục
 */
export class DeleteManyWarningCategoryDto {
    @ApiProperty({ description: 'Danh sách ID cần xóa', type: [String] })
    @IsNotEmpty({ message: i18nValidationMessage('common.validation.ids_required') })
    ids: string[];
}
