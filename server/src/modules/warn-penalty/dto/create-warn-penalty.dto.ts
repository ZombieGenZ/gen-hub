import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateIf,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BanDurationUnit } from '@prisma/client';

export class CreateWarnPenaltyDto {
    @IsNotEmpty({ message: i18nValidationMessage('warn-penalty.validation.min_warn_count_required') })
    @IsInt({ message: i18nValidationMessage('warn-penalty.validation.min_warn_count_must_be_integer') })
    @Min(1, { message: i18nValidationMessage('warn-penalty.validation.min_warn_count_min') })
    min_warn_count: number;

    @IsOptional()
    @IsInt({ message: i18nValidationMessage('warn-penalty.validation.max_warn_count_must_be_integer') })
    @Min(1, { message: i18nValidationMessage('warn-penalty.validation.max_warn_count_min') })
    max_warn_count?: number;

    @IsOptional()
    @IsBoolean({ message: i18nValidationMessage('warn-penalty.validation.is_permanent_ban_must_be_boolean') })
    is_permanent_ban?: boolean = false;

    @ValidateIf((o) => !o.is_permanent_ban)
    @IsNotEmpty({ message: i18nValidationMessage('warn-penalty.validation.duration_value_required') })
    @IsInt({ message: i18nValidationMessage('warn-penalty.validation.duration_value_must_be_integer') })
    @Min(1, { message: i18nValidationMessage('warn-penalty.validation.duration_value_min') })
    duration_value?: number;

    @ValidateIf((o) => !o.is_permanent_ban)
    @IsNotEmpty({ message: i18nValidationMessage('warn-penalty.validation.duration_unit_required') })
    @IsEnum(BanDurationUnit, { message: i18nValidationMessage('warn-penalty.validation.duration_unit_invalid') })
    duration_unit?: BanDurationUnit;

    @IsOptional()
    @IsString({ message: i18nValidationMessage('warn-penalty.validation.description_must_be_string') })
    @Max(500, { message: i18nValidationMessage('warn-penalty.validation.description_max_length') })
    description?: string;
}
