import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export enum StatusFilter {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ALL = 'ALL',
}

/**
 * DTO để query danh sách roles
 */
export class QueryRoleDto {
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
    description: 'Từ khóa tìm kiếm (trong name, description)',
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
  @IsEnum(StatusFilter, {
    message: i18nValidationMessage('common.validation.is_enum'),
  })
  status?: StatusFilter;
}
