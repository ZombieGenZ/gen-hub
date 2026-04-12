import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { OrganizationUpdateRequestStatus } from '@prisma/client';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Type } from 'class-transformer';

export class QueryOrganizationUpdateRequestDto {
  @ApiPropertyOptional({ description: 'Số lượng record', example: 10 })
  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(1, { message: i18nValidationMessage('validation.MIN_VALUE') })
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Vị trí bắt đầu', example: 0 })
  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(0, { message: i18nValidationMessage('validation.MIN_VALUE') })
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({
    enum: OrganizationUpdateRequestStatus,
    description: 'Trạng thái yêu cầu',
  })
  @IsOptional()
  @IsEnum(OrganizationUpdateRequestStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: OrganizationUpdateRequestStatus;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm (tên tổ chức, mã số thuế...)',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  keyword?: string;
}
