import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO khởi tạo phiên chat live (Guest không cần đăng nhập)
 * Client truyền uid (session ID) để định danh guest
 */
export class StartChatDto {
    @ApiProperty({
        description: 'UID (session ID) để định danh guest',
        example: 'session-abc-123',
        maxLength: 200,
    })
    @IsString({ message: i18nValidationMessage('common.validation.string') })
    @MaxLength(200, { message: i18nValidationMessage('common.validation.max_length') })
    uid: string;

    @ApiPropertyOptional({
        description: 'Tin nhắn đầu tiên',
        example: 'Tôi muốn hỏi về dịch vụ thuê kho',
        maxLength: 2000,
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('common.validation.string') })
    @MaxLength(2000, { message: i18nValidationMessage('common.validation.max_length') })
    initialMessage?: string;
}
