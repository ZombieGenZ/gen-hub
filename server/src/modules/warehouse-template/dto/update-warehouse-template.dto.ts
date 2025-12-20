import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CreateWarehouseTemplateDto } from './create-warehouse-template.dto';
import { UpdateDiscountTierDto } from './discount-tier.dto';

/**
 * DTO cập nhật WarehouseTemplate (partial of create)
 * Override discount_tiers để sử dụng UpdateDiscountTierDto (có id)
 */
export class UpdateWarehouseTemplateDto extends PartialType(CreateWarehouseTemplateDto) {
    @ApiPropertyOptional({
        description: 'Danh sách tier giảm giá. Tier có id sẽ được cập nhật, tier không có id sẽ được tạo mới, tier hiện có nhưng không trong danh sách sẽ bị xóa.',
        type: [UpdateDiscountTierDto],
        example: [
            { id: '550e8400-e29b-41d4-a716-446655440001', name: '1 tháng', duration_value: 1, duration_unit: 'MONTH', discount_percent: 0 },
            { id: '550e8400-e29b-41d4-a716-446655440002', name: '3 tháng', duration_value: 3, duration_unit: 'MONTH', discount_percent: 5 },
            { id: '550e8400-e29b-41d4-a716-446655440003', name: '6 tháng', duration_value: 6, duration_unit: 'MONTH', discount_percent: 10 },
            { id: '550e8400-e29b-41d4-a716-446655440004', name: '1 năm', duration_value: 1, duration_unit: 'YEAR', discount_percent: 15 },
            { id: '550e8400-e29b-41d4-a716-446655440005', name: '2 năm', duration_value: 2, duration_unit: 'YEAR', discount_percent: 20 },
            { id: '550e8400-e29b-41d4-a716-446655440006', name: '3 năm', duration_value: 3, duration_unit: 'YEAR', discount_percent: 25 },
        ],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('warehouse-template.validation.discount_tiers_array'),
    })
    @ValidateNested({ each: true })
    @Type(() => UpdateDiscountTierDto)
    discount_tiers?: UpdateDiscountTierDto[];
}
