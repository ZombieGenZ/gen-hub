import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho đăng nhập/đăng ký bằng Google (id_token từ Google OAuth)
 */
export class GoogleAuthDto {
    @ApiProperty({
        description: 'Google ID Token từ OAuth2',
        example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsNotEmpty({ message: i18nValidationMessage('auth.validation.id_token_required') })
    @IsString({ message: i18nValidationMessage('auth.validation.id_token_string') })
    id_token: string;
}
