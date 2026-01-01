import {
    IsString,
    IsOptional,
    IsBoolean,
    MinLength,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO staff reply
 */
export class ReplyContactDto {
    @ApiProperty({ example: 'Nội dung phản hồi...', description: 'Nội dung phản hồi' })
    @IsString({ message: i18nValidationMessage('contact.validation.content_required') })
    @MinLength(1, { message: i18nValidationMessage('contact.validation.content_required') })
    @MaxLength(10000)
    content: string;

    @ApiPropertyOptional({ default: false, description: 'Đánh dấu là ghi chú nội bộ (không gửi email cho khách)' })
    @IsOptional()
    @IsBoolean()
    is_internal?: boolean = false;
}
