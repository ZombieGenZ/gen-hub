import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    Matches,
    MinLength,
    IsBoolean,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho thay đổi mật khẩu
 */
export class ChangePasswordDto {
    @ApiProperty({
        description: 'Mật khẩu hiện tại',
        example: 'Password@123',
    })
    @IsNotEmpty({ message: i18nValidationMessage('auth.validation.current_password_required') })
    @IsString({ message: i18nValidationMessage('auth.validation.current_password_string') })
    current_password: string;

    @ApiProperty({
        description: 'Mật khẩu mới (ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt)',
        example: 'NewPassword@456',
        minLength: 8,
    })
    @IsNotEmpty({ message: i18nValidationMessage('auth.validation.new_password_required') })
    @IsString({ message: i18nValidationMessage('auth.validation.new_password_string') })
    @MinLength(8, { message: i18nValidationMessage('auth.validation.new_password_min_length') })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/,
        { message: i18nValidationMessage('auth.validation.new_password_pattern') },
    )
    new_password: string;

    @ApiProperty({
        description: 'Xác nhận mật khẩu mới',
        example: 'NewPassword@456',
    })
    @IsNotEmpty({ message: i18nValidationMessage('auth.validation.confirm_password_required') })
    @IsString({ message: i18nValidationMessage('auth.validation.confirm_password_string') })
    confirm_password: string;

    @ApiPropertyOptional({
        description: 'Đăng xuất tất cả thiết bị sau khi đổi mật khẩu',
        default: false,
    })
    @IsOptional()
    @IsBoolean({ message: i18nValidationMessage('auth.validation.logout_all_devices_boolean') })
    logout_all_devices?: boolean;
}
