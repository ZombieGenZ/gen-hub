import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsIn } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho gỡ liên kết nền tảng phụ
 */
export class UnlinkPlatformDto {
    @ApiProperty({
        description: 'Nền tảng cần gỡ liên kết',
        enum: ['GOOGLE', 'FACEBOOK'],
        example: 'GOOGLE',
    })
    @IsNotEmpty({ message: i18nValidationMessage('auth.validation.platform_required') })
    @IsIn(['GOOGLE', 'FACEBOOK'], { message: i18nValidationMessage('auth.validation.platform_invalid') })
    platform: 'GOOGLE' | 'FACEBOOK';
}
