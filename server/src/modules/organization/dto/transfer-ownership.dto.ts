import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO chuyển quyền sở hữu Organization
 */
export class TransferOwnershipDto {
    @ApiProperty({ description: 'ID của chủ sở hữu mới', example: 'uuid-here' })
    @IsNotEmpty({
        message: i18nValidationMessage('organization.validation.new_owner_id_required'),
    })
    @IsUUID('4', {
        message: i18nValidationMessage('organization.validation.new_owner_id_uuid'),
    })
    new_owner_id: string;
}
