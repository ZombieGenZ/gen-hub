import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MinLength,
} from 'class-validator';

/**
 * DTO cho đăng ký tài khoản mới
 * Chỉ hỗ trợ đăng ký bằng email
 */
export class RegisterDto {
    @ApiProperty({
        description: 'Tên người dùng',
        example: 'Nguyễn Văn A',
        minLength: 2,
    })
    @IsNotEmpty({ message: 'Tên không được để trống' })
    @IsString({ message: 'Tên phải là chuỗi' })
    @MinLength(2, { message: 'Tên phải có ít nhất 2 ký tự' })
    name: string;

    @ApiProperty({
        description: 'Email',
        example: 'user@example.com',
    })
    @IsNotEmpty({ message: 'Email là bắt buộc' })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;

    @ApiProperty({
        description: 'Mật khẩu (ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt)',
        example: 'Password@123',
        minLength: 8,
    })
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @IsString({ message: 'Mật khẩu phải là chuỗi' })
    @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/,
        {
            message:
                'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt',
        },
    )
    password: string;
}

/**
 * DTO cho đăng nhập
 * Chỉ hỗ trợ đăng nhập bằng email
 */
export class LoginDto {
    @ApiProperty({
        description: 'Email',
        example: 'user@example.com',
    })
    @IsNotEmpty({ message: 'Email là bắt buộc' })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;

    @ApiProperty({
        description: 'Mật khẩu',
        example: 'Password@123',
    })
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @IsString({ message: 'Mật khẩu phải là chuỗi' })
    password: string;
}

/**
 * DTO cho xác thực quyền truy cập trước khi thực hiện các thao tác nhạy cảm
 */
export class VerifyAccessDto {
    @ApiPropertyOptional({
        description: 'Mật khẩu - dùng khi chưa bật 2FA',
        example: 'Password@123',
    })
    @IsOptional()
    @IsString({ message: 'Mật khẩu phải là chuỗi' })
    password?: string;

    @ApiPropertyOptional({
        description: 'Mã 2FA - dùng khi đã bật 2FA (6 chữ số)',
        example: '123456',
    })
    @IsOptional()
    @IsString({ message: 'Mã 2FA phải là chuỗi' })
    @Matches(/^[0-9]{6}$/, { message: 'Mã 2FA phải là 6 chữ số' })
    two_factor_code?: string;

    @ApiPropertyOptional({
        description: 'Mã backup - dùng thay thế cho 2FA code',
        example: 'ABCD1234',
    })
    @IsOptional()
    @IsString({ message: 'Mã backup phải là chuỗi' })
    backup_code?: string;
}

/**
 * DTO cho xác thực email
 */
export class VerifyEmailDto {
    @ApiProperty({
        description: 'Token xác thực email (nhận từ email)',
        example: 'abc123def456...',
    })
    @IsNotEmpty({ message: 'Token không được để trống' })
    @IsString({ message: 'Token phải là chuỗi' })
    token: string;
}
