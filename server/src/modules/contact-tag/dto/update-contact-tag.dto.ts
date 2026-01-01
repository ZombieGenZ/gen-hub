import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CreateContactTagDto } from './create-contact-tag.dto';

/**
 * DTO cập nhật ContactTag
 */
export class UpdateContactTagDto extends PartialType(CreateContactTagDto) {
    @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('contact-tag.validation.is_active_boolean'),
    })
    is_active?: boolean;
}
