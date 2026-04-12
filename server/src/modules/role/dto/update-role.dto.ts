import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Transform } from 'class-transformer';
import { CreateRoleDto } from './create-role.dto';

/**
 * DTO để cập nhật role
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @ApiProperty({
    description: 'Trạng thái active của role',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('common.validation.is_boolean') })
  @Transform(({ value }) => value === 'true' || value === true)
  is_active?: boolean;
}
