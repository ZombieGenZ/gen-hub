import { IsOptional, IsString, IsEnum, IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export enum PermissionQueryType {
    ROLE = 'role',
    USER = 'user',
}

export enum StatusFilter {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    ALL = 'ALL',
}

/**
 * DTO để query danh sách permissions
 */
export class QueryPermissionDto {
    @ApiProperty({
        description: 'Số lượng bản ghi trả về',
        required: false,
        default: 10,
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('common.validation.is_string') })
    limit?: string;

    @ApiProperty({
        description: 'Vị trí bắt đầu',
        required: false,
        default: 0,
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('common.validation.is_string') })
    offset?: string;

    @ApiProperty({
        description: 'Từ khóa tìm kiếm (trong name, key, description)',
        required: false,
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('common.validation.is_string') })
    keywords?: string;

    @ApiProperty({
        description: 'Lọc theo trạng thái',
        enum: StatusFilter,
        required: false,
        default: StatusFilter.ACTIVE,
    })
    @IsOptional()
    @IsEnum(StatusFilter, { message: i18nValidationMessage('common.validation.is_enum') })
    status?: StatusFilter;

    @ApiProperty({
        description: 'Loại đối tượng để so sánh (role hoặc user)',
        enum: PermissionQueryType,
        required: false,
    })
    @IsOptional()
    @IsEnum(PermissionQueryType, { message: i18nValidationMessage('common.validation.is_enum') })
    type?: PermissionQueryType;

    @ApiProperty({
        description: 'ID của role hoặc user (bắt buộc khi có type)',
        required: false,
    })
    @ValidateIf((o) => o.type !== undefined)
    @IsUUID('4', { message: i18nValidationMessage('common.validation.is_uuid') })
    id?: string;

    @ApiProperty({
        description: 'Lọc theo module (prefix của permission key)',
        required: false,
        example: 'account-balance',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('common.validation.is_string') })
    module?: string;
}
