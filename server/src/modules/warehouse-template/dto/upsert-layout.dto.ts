import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsBoolean,
    IsUUID,
    IsNumber,
    IsArray,
    ValidateNested,
    Min,
    Max,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Type } from 'class-transformer';
import { UpdateDiscountConfigDto } from './discount-config.dto';

/**
 * DTO cho Block trong layout
 */
export class LayoutBlockDto {
    @ApiPropertyOptional({ description: 'ID block (để trống nếu tạo mới)' })
    @IsOptional()
    @IsUUID('4', {
        message: i18nValidationMessage('warehouse-template.validation.id_uuid'),
    })
    id?: string;

    @ApiProperty({ description: 'Tên block', example: 'Block A1-1-1-1' })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.block_name_required'),
    })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Mã block', example: 'BLK-A1-1-1-1' })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.block_code_required'),
    })
    @IsString()
    code: string;

    @ApiPropertyOptional({ description: 'Mô tả' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Vị trí X' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    position_x?: number;

    @ApiPropertyOptional({ description: 'Vị trí Y' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    position_y?: number;

    @ApiPropertyOptional({ description: 'Chiều rộng' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    dimensions_width?: number;

    @ApiPropertyOptional({ description: 'Chiều cao' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    dimensions_height?: number;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;


}

/**
 * DTO cho Shelf trong layout
 */
export class LayoutShelfDto {
    @ApiPropertyOptional({ description: 'ID shelf (để trống nếu tạo mới)' })
    @IsOptional()
    @IsUUID('4', {
        message: i18nValidationMessage('warehouse-template.validation.id_uuid'),
    })
    id?: string;

    @ApiProperty({ description: 'Tên shelf', example: 'Tầng 1' })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.shelf_name_required'),
    })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Mã shelf', example: 'SHF-A1-1-1' })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.shelf_code_required'),
    })
    @IsString()
    code: string;

    @ApiPropertyOptional({ description: 'Mô tả' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;



    @ApiPropertyOptional({ description: 'Chiều cao tầng kệ (met)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    height?: number;

    @ApiPropertyOptional({ description: 'Danh sách blocks', type: [LayoutBlockDto] })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('warehouse-template.validation.blocks_array'),
    })
    @ValidateNested({ each: true })
    @Type(() => LayoutBlockDto)
    blocks?: LayoutBlockDto[];
}

/**
 * DTO cho Rack trong layout
 */
export class LayoutRackDto {
    @ApiPropertyOptional({ description: 'ID rack (để trống nếu tạo mới)' })
    @IsOptional()
    @IsUUID('4', {
        message: i18nValidationMessage('warehouse-template.validation.id_uuid'),
    })
    id?: string;

    @ApiProperty({ description: 'Tên rack', example: 'Kệ 1' })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.rack_name_required'),
    })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Mã rack', example: 'RCK-A1-1' })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.rack_code_required'),
    })
    @IsString()
    code: string;

    @ApiPropertyOptional({ description: 'Mô tả' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Vị trí X' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    position_x?: number;

    @ApiPropertyOptional({ description: 'Vị trí Y' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    position_y?: number;

    @ApiPropertyOptional({ description: 'Góc xoay' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    position_rotation?: number;

    @ApiPropertyOptional({ description: 'Chiều rộng' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    dimensions_width?: number;

    @ApiPropertyOptional({ description: 'Chiều sâu' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    dimensions_depth?: number;

    @ApiPropertyOptional({ description: 'Chiều cao' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    dimensions_height?: number;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;



    @ApiPropertyOptional({ description: 'Trọng tải mặc định cho mỗi block (kg)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    default_block_max_weight_capacity?: number;

    @ApiPropertyOptional({ description: 'Ngưỡng vượt tải cho phép (%)', default: 10 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    overload_threshold_percent?: number;

    @ApiPropertyOptional({ description: 'Danh sách shelves', type: [LayoutShelfDto] })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('warehouse-template.validation.shelves_array'),
    })
    @ValidateNested({ each: true })
    @Type(() => LayoutShelfDto)
    shelves?: LayoutShelfDto[];
}

/**
 * DTO cho Row trong layout
 */
export class LayoutRowDto {
    @ApiPropertyOptional({ description: 'ID row (để trống nếu tạo mới)' })
    @IsOptional()
    @IsUUID('4', {
        message: i18nValidationMessage('warehouse-template.validation.id_uuid'),
    })
    id?: string;

    @ApiProperty({ description: 'Tên dãy', example: 'Dãy A' })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.row_name_required'),
    })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Mã dãy', example: 'ROW-A' })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.row_code_required'),
    })
    @IsString()
    code: string;

    @ApiPropertyOptional({ description: 'Mô tả' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Đã được thuê', default: false })
    @IsOptional()
    @IsBoolean()
    is_rented?: boolean;

    @ApiPropertyOptional({ description: 'Giá thuê/ngày' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    price_per_month?: number;

    @ApiPropertyOptional({
        description: 'Danh sách config giảm giá theo mốc thời gian. Config có id sẽ được cập nhật, config không có id sẽ được tạo mới, config hiện có nhưng không trong danh sách sẽ bị xóa.',
        type: [UpdateDiscountConfigDto],
        example: [
            { id: 'uuid-config-1', duration_tier_id: 'uuid-tier-1', discount_percent: 0 },
            { id: 'uuid-config-2', duration_tier_id: 'uuid-tier-2', discount_percent: 5 },
            { duration_tier_id: 'uuid-tier-3', discount_percent: 10 },
        ],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('warehouse-template.validation.discount_configs_array'),
    })
    @ValidateNested({ each: true })
    @Type(() => UpdateDiscountConfigDto)
    discount_configs?: UpdateDiscountConfigDto[];

    @ApiPropertyOptional({ description: 'Địa chỉ' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ description: 'Vĩ độ' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    latitude?: number;

    @ApiPropertyOptional({ description: 'Kinh độ' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    longitude?: number;

    @ApiPropertyOptional({ description: 'Vị trí X' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    position_x?: number;

    @ApiPropertyOptional({ description: 'Vị trí Y' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    position_y?: number;

    @ApiPropertyOptional({ description: 'Góc xoay' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    position_rotation?: number;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;



    @ApiPropertyOptional({ description: 'Danh sách racks', type: [LayoutRackDto] })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('warehouse-template.validation.racks_array'),
    })
    @ValidateNested({ each: true })
    @Type(() => LayoutRackDto)
    racks?: LayoutRackDto[];
}

/**
 * DTO cập nhật toàn bộ layout của WarehouseTemplate
 */
export class UpsertLayoutDto {
    @ApiProperty({ description: 'Danh sách rows với nested racks, shelves, blocks', type: [LayoutRowDto] })
    @IsArray({
        message: i18nValidationMessage('warehouse-template.validation.rows_array'),
    })
    @ValidateNested({ each: true })
    @Type(() => LayoutRowDto)
    rows: LayoutRowDto[];
}
