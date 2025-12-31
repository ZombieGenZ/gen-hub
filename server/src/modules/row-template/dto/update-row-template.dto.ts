import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import {
    IsOptional,
    IsUUID,
    IsNumber,
    IsBoolean,
    IsArray,
    ValidateNested,
    Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Type } from 'class-transformer';
import { CreateRowTemplateDto, CreateRowDiscountConfigDto } from './create-row-template.dto';
import { RowAddonGiftDto } from './row-addon-gift.dto';
import { RowInsuranceGiftDto } from './row-insurance-gift.dto';


/**
 * DTO cho discount config khi cập nhật row (có thêm id để update)
 */
export class UpdateRowDiscountConfigDto extends CreateRowDiscountConfigDto {
    @ApiPropertyOptional({ description: 'ID của config (để trống nếu tạo mới)' })
    @IsOptional()
    @IsUUID('4', {
        message: i18nValidationMessage('row-template.validation.id_uuid'),
    })
    id?: string;
}

/**
 * DTO cập nhật RowTemplate
 */
export class UpdateRowTemplateDto extends PartialType(CreateRowTemplateDto) {
    @ApiPropertyOptional({
        description: 'Danh sách config giảm giá. Config có id sẽ được cập nhật, config không có id sẽ được tạo mới, config hiện có nhưng không trong danh sách sẽ bị xóa.',
        type: [UpdateRowDiscountConfigDto],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('row-template.validation.discount_configs_array'),
    })
    @ValidateNested({ each: true })
    @Type(() => UpdateRowDiscountConfigDto)
    discount_configs?: UpdateRowDiscountConfigDto[];


    @ApiPropertyOptional({
        description: 'Danh sách addon tặng kèm',
        type: [RowAddonGiftDto],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('row-template.validation.addon_gifts_array'),
    })
    @ValidateNested({ each: true })
    @Type(() => RowAddonGiftDto)
    addon_gifts?: RowAddonGiftDto[];

    @ApiPropertyOptional({
        description: 'Danh sách bảo hiểm tặng kèm',
        type: [RowInsuranceGiftDto],
    })
    @IsOptional()
    @IsArray({
        message: i18nValidationMessage('row-template.validation.insurance_gifts_array'),
    })
    @ValidateNested({ each: true })
    @Type(() => RowInsuranceGiftDto)
    insurance_gifts?: RowInsuranceGiftDto[];
}

