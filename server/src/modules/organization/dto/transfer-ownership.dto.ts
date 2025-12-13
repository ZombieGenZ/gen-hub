import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEmail } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO chuyển quyền sở hữu Organization
 */
export class TransferOwnershipDto {
    @ApiProperty({ description: 'Email của chủ sở hữu mới', example: 'newowner@example.com' })
    @IsNotEmpty({
        message: i18nValidationMessage('organization.validation.new_owner_email_required'),
    })
    @IsEmail({}, {
        message: i18nValidationMessage('organization.validation.new_owner_email_invalid'),
    })
    new_owner_email: string;
}
