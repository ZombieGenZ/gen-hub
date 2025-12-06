import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsIn,
    Matches,
    MinLength,
    IsBoolean,
} from 'class-validator';

/**
 * DTO cho đăng nhập/đăng ký bằng Google (id_token từ Google OAuth)
 */
export class GoogleAuthDto {
    @ApiProperty({
        description: 'Google ID Token từ OAuth2',
        example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsNotEmpty({ message: 'ID Token không được để trống' })
    @IsString({ message: 'ID Token phải là chuỗi' })
    id_token: string;
}

/**
 * DTO cho đăng nhập/đăng ký bằng Facebook (access_token từ Facebook OAuth)
 */
export class FacebookAuthDto {
    @ApiProperty({
        description: 'Facebook Access Token từ OAuth2',
        example: 'EAABwzLixnjYBAO...',
    })
    @IsNotEmpty({ message: 'Access Token không được để trống' })
    @IsString({ message: 'Access Token phải là chuỗi' })
    access_token: string;
}

/**
 * DTO cho liên kết thêm tài khoản Google (liên kết phụ)
 */
export class LinkGoogleDto {
    @ApiProperty({
        description: 'Google ID Token từ OAuth2',
        example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsNotEmpty({ message: 'ID Token không được để trống' })
    @IsString({ message: 'ID Token phải là chuỗi' })
    id_token: string;
}

/**
 * DTO cho liên kết thêm tài khoản Facebook (liên kết phụ)
 */
export class LinkFacebookDto {
    @ApiProperty({
        description: 'Facebook Access Token từ OAuth2',
        example: 'EAABwzLixnjYBAO...',
    })
    @IsNotEmpty({ message: 'Access Token không được để trống' })
    @IsString({ message: 'Access Token phải là chuỗi' })
    access_token: string;
}

/**
 * DTO cho gỡ liên kết nền tảng phụ
 */
export class UnlinkPlatformDto {
    @ApiProperty({
        description: 'Nền tảng cần gỡ liên kết',
        enum: ['GOOGLE', 'FACEBOOK'],
        example: 'GOOGLE',
    })
    @IsNotEmpty({ message: 'Nền tảng không được để trống' })
    @IsIn(['GOOGLE', 'FACEBOOK'], { message: 'Nền tảng phải là GOOGLE hoặc FACEBOOK' })
    platform: 'GOOGLE' | 'FACEBOOK';
}

/**
 * DTO cho thay đổi mật khẩu
 */
export class ChangePasswordDto {
    @ApiProperty({
        description: 'Mật khẩu hiện tại',
        example: 'Password@123',
    })
    @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
    @IsString({ message: 'Mật khẩu hiện tại phải là chuỗi' })
    current_password: string;

    @ApiProperty({
        description: 'Mật khẩu mới (ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt)',
        example: 'NewPassword@456',
        minLength: 8,
    })
    @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
    @IsString({ message: 'Mật khẩu mới phải là chuỗi' })
    @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/,
        { message: 'Mật khẩu mới phải có chữ hoa, chữ thường, số và ký tự đặc biệt' },
    )
    new_password: string;

    @ApiProperty({
        description: 'Xác nhận mật khẩu mới',
        example: 'NewPassword@456',
    })
    @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
    @IsString({ message: 'Xác nhận mật khẩu phải là chuỗi' })
    confirm_password: string;

    @ApiPropertyOptional({
        description: 'Đăng xuất tất cả thiết bị sau khi đổi mật khẩu',
        default: false,
    })
    @IsOptional()
    @IsBoolean({ message: 'logout_all_devices phải là boolean' })
    logout_all_devices?: boolean;
}

/**
 * DTO cho cập nhật thông tin tài khoản
 */
export class UpdateProfileDto {
    @ApiPropertyOptional({
        description: 'Tên mới',
        example: 'Nguyễn Văn B',
        minLength: 2,
    })
    @IsOptional()
    @IsString({ message: 'Tên phải là chuỗi' })
    @MinLength(2, { message: 'Tên phải có ít nhất 2 ký tự' })
    name?: string;

    @ApiPropertyOptional({
        description: 'Ngôn ngữ mới (vi, en, zh, hi, es, fr, ar, ...)',
        example: 'en',
    })
    @IsOptional()
    @IsString({ message: 'Ngôn ngữ phải là chuỗi' })
    language?: string;
}
