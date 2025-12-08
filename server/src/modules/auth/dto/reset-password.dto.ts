import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho yêu cầu đặt lại mật khẩu
 */
export class ResetPasswordDto {
    @ApiProperty({
        description: 'Token quên mật khẩu (nhận từ email)',
        example: 'abc123def456...',
    })
    @IsNotEmpty({ message: i18nValidationMessage('auth.validation.token_required') })
    @IsString({ message: i18nValidationMessage('auth.validation.token_string') })
    token: string;

    @ApiProperty({
        description: 'Mật khẩu mới (ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt)',
        example: 'NewPassword@123',
    })
    @IsNotEmpty({ message: i18nValidationMessage('auth.validation.new_password_required') })
    @IsString({ message: i18nValidationMessage('auth.validation.new_password_string') })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/,
        {
            message: i18nValidationMessage('common.validation.new_password_pattern'),
        },
    )
    new_password: string;

    @ApiProperty({
        description: 'Xác nhận mật khẩu mới',
        example: 'NewPassword@123',
    })
    @IsNotEmpty({ message: i18nValidationMessage('auth.validation.confirm_password_required') })
    @IsString({ message: i18nValidationMessage('auth.validation.confirm_password_string') })
    confirm_password: string;

    @ApiPropertyOptional({
        description: 'Đăng xuất khỏi tất cả thiết bị sau khi đổi mật khẩu',
        example: true,
        default: false,
    })
    @IsOptional()
    logout_all_devices?: boolean;
}
