import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
} from 'class-validator';

/**
 * DTO cho yêu cầu quên mật khẩu
 * Chỉ hỗ trợ qua email
 */
export class ForgotPasswordDto {
    @ApiProperty({
        description: 'Email đăng ký tài khoản',
        example: 'user@example.com',
    })
    @IsNotEmpty({ message: 'Email là bắt buộc' })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;
}

/**
 * DTO cho yêu cầu xác thực token quên mật khẩu
 */
export class VerifyForgotPasswordTokenDto {
    @ApiProperty({
        description: 'Token quên mật khẩu (nhận từ email)',
        example: 'abc123def456...',
    })
    @IsNotEmpty({ message: 'Token không được để trống' })
    @IsString({ message: 'Token phải là chuỗi' })
    token: string;
}

/**
 * DTO cho yêu cầu đặt lại mật khẩu
 */
export class ResetPasswordDto {
    @ApiProperty({
        description: 'Token quên mật khẩu (nhận từ email)',
        example: 'abc123def456...',
    })
    @IsNotEmpty({ message: 'Token không được để trống' })
    @IsString({ message: 'Token phải là chuỗi' })
    token: string;

    @ApiProperty({
        description: 'Mật khẩu mới (ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt)',
        example: 'NewPassword@123',
    })
    @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
    @IsString({ message: 'Mật khẩu mới phải là chuỗi' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        {
            message:
                'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
        },
    )
    new_password: string;

    @ApiProperty({
        description: 'Xác nhận mật khẩu mới',
        example: 'NewPassword@123',
    })
    @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
    @IsString({ message: 'Xác nhận mật khẩu phải là chuỗi' })
    confirm_password: string;

    @ApiPropertyOptional({
        description: 'Đăng xuất khỏi tất cả thiết bị sau khi đổi mật khẩu',
        example: true,
        default: false,
    })
    @IsOptional()
    logout_all_devices?: boolean;
}
