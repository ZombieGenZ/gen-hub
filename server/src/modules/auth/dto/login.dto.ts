import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho đăng nhập
 * Chỉ hỗ trợ đăng nhập bằng email
 */
export class LoginDto {
    @ApiProperty({
        description: 'Email',
        example: 'user@example.com',
    })
    @IsNotEmpty({ message: i18nValidationMessage('auth.validation.email_required') })
    @IsEmail({}, { message: i18nValidationMessage('auth.validation.email_invalid') })
    email: string;

    @ApiProperty({
        description: 'Mật khẩu',
        example: 'Password@123',
    })
    @IsNotEmpty({ message: i18nValidationMessage('auth.validation.password_required') })
    @IsString({ message: i18nValidationMessage('auth.validation.password_string') })
    password: string;
}
