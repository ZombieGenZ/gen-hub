import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CreateWarehouseTemplateDto } from './create-warehouse-template.dto';
import { UpdateDiscountConfigDto } from './discount-config.dto';
import { WarehouseAddonGiftDto } from './warehouse-addon-gift.dto';
import { WarehouseInsuranceGiftDto } from './warehouse-insurance-gift.dto';


/**
 * DTO cập nhật WarehouseTemplate (partial of create)
 * Override discount_configs để sử dụng UpdateDiscountConfigDto (có id)
 */
export class UpdateWarehouseTemplateDto extends PartialType(CreateWarehouseTemplateDto) {
    @ApiPropertyOptional({
        description: 'Danh sách config giảm giá. Config có id sẽ được cập nhật, config không có id sẽ được tạo mới, config hiện có nhưng không trong danh sách sẽ bị xóa.',
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

    @ApiPropertyOptional({
        description: 'Danh sách addon tặng kèm. Config có id sẽ được cập nhật, config không có id sẽ được tạo mới, config hiện có nhưng không trong danh sách sẽ bị xóa.',
        type: [WarehouseAddonGiftDto],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('warehouse-template.validation.addon_gifts_array'),
    })
    @ValidateNested({ each: true })
    @Type(() => WarehouseAddonGiftDto)
    addon_gifts?: WarehouseAddonGiftDto[];

    @ApiPropertyOptional({
        description: 'Danh sách bảo hiểm tặng kèm. Config có id sẽ được cập nhật, config không có id sẽ được tạo mới, config hiện có nhưng không trong danh sách sẽ bị xóa.',
        type: [WarehouseInsuranceGiftDto],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('warehouse-template.validation.insurance_gifts_array'),
    })
    @ValidateNested({ each: true })
    @Type(() => WarehouseInsuranceGiftDto)
    insurance_gifts?: WarehouseInsuranceGiftDto[];
}

