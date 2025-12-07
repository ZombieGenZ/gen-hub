import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho đăng nhập/đăng ký bằng Facebook (access_token từ Facebook OAuth)
 */
export class FacebookAuthDto {
    @ApiProperty({
        description: 'Facebook Access Token từ OAuth2',
        example: 'EAABwzLixnjYBAO...',
    })
    @IsNotEmpty({ message: i18nValidationMessage('auth.validation.access_token_required') })
    @IsString({ message: i18nValidationMessage('auth.validation.access_token_string') })
    access_token: string;
}
