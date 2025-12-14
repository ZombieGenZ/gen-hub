import { IsOptional, IsString, IsInt, Min, IsUUID, IsArray, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ContractStatus } from '@prisma/client';

/**
 * DTO để tạo hợp đồng thuê
 */
export class CreateRentalContractDto {
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.template_id_uuid') })
    template_id: string;

    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.organization_id_uuid') })
    organization_id: string;

    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.name_string') })
    name?: string;

    @IsOptional()
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.row_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('rental-contract.validation.row_id_uuid') })
    row_ids?: string[];

    @IsInt({ message: i18nValidationMessage('rental-contract.validation.rental_months_positive') })
    @Min(1, { message: i18nValidationMessage('rental-contract.validation.rental_months_min') })
    rental_months: number;

    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.notes_string') })
    notes?: string;
}

/**
 * DTO để cập nhật/gia hạn hợp đồng
 */
export class UpdateRentalContractDto {
    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.name_string') })
    name?: string;

    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.notes_string') })
    notes?: string;

    @IsOptional()
    @IsInt({ message: i18nValidationMessage('rental-contract.validation.additional_months_positive') })
    @Min(1, { message: i18nValidationMessage('rental-contract.validation.additional_months_positive') })
    additional_months?: number;
}

/**
 * DTO query params cho danh sách hợp đồng
 */
export class QueryRentalContractDto {
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1, { message: i18nValidationMessage('rental-contract.validation.limit_positive') })
    limit?: number;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(0, { message: i18nValidationMessage('rental-contract.validation.offset_min') })
    offset?: number;

    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.keywords_string') })
    keywords?: string;

    @IsOptional()
    @IsEnum(ContractStatus, { message: i18nValidationMessage('rental-contract.validation.status_invalid') })
    status?: ContractStatus;

    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.organization_id_uuid') })
    organization_id?: string;
}
