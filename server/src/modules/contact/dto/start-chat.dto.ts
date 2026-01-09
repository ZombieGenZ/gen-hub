import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO khởi tạo phiên chat live (Guest không cần đăng nhập)
 */
export class StartChatDto {
    @ApiProperty({
        description: 'Tên khách hàng',
        example: 'Nguyễn Văn A',
        maxLength: 100,
    })
    @IsString({ message: i18nValidationMessage('common.validation.string') })
    @MaxLength(100, { message: i18nValidationMessage('common.validation.max_length') })
    name: string;

    @ApiProperty({
        description: 'Email khách hàng',
        example: 'customer@example.com',
    })
    @IsEmail({}, { message: i18nValidationMessage('common.validation.email') })
    email: string;

    @ApiPropertyOptional({
        description: 'Số điện thoại khách hàng',
        example: '0912345678',
        maxLength: 20,
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('common.validation.string') })
    @MaxLength(20, { message: i18nValidationMessage('common.validation.max_length') })
    phone?: string;

    @ApiPropertyOptional({
        description: 'Tên công ty (nếu có)',
        example: 'Công ty ABC',
        maxLength: 200,
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('common.validation.string') })
    @MaxLength(200, { message: i18nValidationMessage('common.validation.max_length') })
    company?: string;

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
