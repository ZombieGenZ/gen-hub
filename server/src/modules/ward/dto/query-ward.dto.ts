import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export enum WardType {
  WARD = 'WARD',
  COMMUNE = 'COMMUNE',
  TOWNSHIP = 'TOWNSHIP',
  TOWN = 'TOWN',
  CITY = 'CITY',
}

export class QueryWardDto {
  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm (tên phường/xã, mã)',
    example: 'Phúc Xá',
    type: String,
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('ward.validation.keywords_string'),
  })
  keywords?: string;

  @ApiPropertyOptional({
    description:
      'Loại phường/xã (WARD: Phường, COMMUNE: Xã, TOWNSHIP: Thị trấn, TOWN: Thị xã, CITY: Thành phố)',
    enum: WardType,
    example: 'WARD',
  })
  @IsOptional()
  @IsEnum(WardType, {
    message: i18nValidationMessage('ward.validation.type_invalid'),
  })
  type?: WardType;

  @ApiPropertyOptional({
    description:
      'ID tỉnh/thành phố để lọc phường/xã thuộc tỉnh/thành phố đó (UUID v4)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    type: String,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage('ward.validation.province_id_uuid'),
  })
  province_id?: string;
}
