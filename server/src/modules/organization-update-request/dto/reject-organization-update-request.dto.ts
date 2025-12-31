import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RejectOrganizationUpdateRequestDto {
    @ApiProperty({ description: 'Lý do từ chối', example: 'Thông tin không chính xác' })
    @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
    @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
    reject_reason: string;
}
