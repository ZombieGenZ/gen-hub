import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho liên kết thêm tài khoản Facebook (liên kết phụ)
 */
export class LinkFacebookDto {
    @ApiProperty({
        description: 'Facebook Access Token từ OAuth2',
        example: 'EAABwzLixnjYBAO...',
    })
    @IsNotEmpty({ message: i18nValidationMessage('auth.validation.access_token_required') })
    @IsString({ message: i18nValidationMessage('auth.validation.access_token_string') })
    access_token: string;
}
