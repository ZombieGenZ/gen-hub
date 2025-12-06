import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

/**
 * DTO cho xác minh thiết lập 2FA
 */
export class VerifyTwoFactorSetupDto {
    @ApiProperty({
        description: 'Mã 2FA từ authenticator app (6 chữ số)',
        example: '123456',
    })
    @IsNotEmpty({ message: 'Mã 2FA không được để trống' })
    @IsString({ message: 'Mã 2FA phải là chuỗi' })
    @Matches(/^[0-9]{6}$/, { message: 'Mã 2FA phải là 6 chữ số' })
    two_factor_code: string;
}

/**
 * DTO cho xác minh 2FA khi đăng nhập
 */
export class VerifyTwoFactorLoginDto {
    @ApiProperty({
        description: 'Token tạm thời (nhận được khi login yêu cầu 2FA)',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsNotEmpty({ message: 'Temp token không được để trống' })
    @IsString({ message: 'Temp token phải là chuỗi' })
    temp_token: string;

    @ApiPropertyOptional({
        description: 'Mã 2FA từ authenticator app (6 chữ số)',
        example: '123456',
    })
    @IsOptional()
    @IsString({ message: 'Mã 2FA phải là chuỗi' })
    @Matches(/^[0-9]{6}$/, { message: 'Mã 2FA phải là 6 chữ số' })
    two_factor_code?: string;

    @ApiPropertyOptional({
        description: 'Mã backup (dùng thay thế cho 2FA code)',
        example: 'ABCD1234',
    })
    @IsOptional()
    @IsString({ message: 'Mã backup phải là chuỗi' })
    backup_code?: string;
}

/**
 * DTO cho đăng xuất
 */
export class LogoutDto {
    @ApiProperty({
        description: 'Refresh token cần hủy',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsNotEmpty({ message: 'Refresh token không được để trống' })
    @IsString({ message: 'Refresh token phải là chuỗi' })
    refresh_token: string;
}

/**
 * DTO cho refresh token
 */
export class RefreshTokenDto {
    @ApiProperty({
        description: 'Refresh token để lấy access token mới',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsNotEmpty({ message: 'Refresh token không được để trống' })
    @IsString({ message: 'Refresh token phải là chuỗi' })
    refresh_token: string;
}
