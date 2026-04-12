import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ContactListType, ContactListMatchType } from '@prisma/client';

/**
 * DTO query danh sách ContactListEntry
 */
export class QueryContactListDto {
  @ApiPropertyOptional({ description: 'Số lượng bản ghi', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({ enum: ContactListType, description: 'Loại danh sách' })
  @IsOptional()
  @IsEnum(ContactListType)
  list_type?: ContactListType;

  @ApiPropertyOptional({
    enum: ContactListMatchType,
    description: 'Loại match',
  })
  @IsOptional()
  @IsEnum(ContactListMatchType)
  match_type?: ContactListMatchType;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_active?: boolean;
}
