import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    UseGuards,
    Req,
    Headers,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiHeader,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import {
    RegisterDto,
    LoginDto,
    VerifyAccessDto,
    VerifyEmailDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    VerifyForgotPasswordTokenDto,
    VerifyTwoFactorSetupDto,
    VerifyTwoFactorLoginDto,
    LogoutDto,
    GoogleAuthDto,
    LinkGoogleDto,
    UnlinkPlatformDto,
    ChangePasswordDto,
    UpdateProfileDto,
} from './dto';
import { JwtAuthGuard, AccessVerificationGuard, PrimaryAuthGuard } from '../../common/guards';
import { Public, CurrentUser } from '../../common/decorators';
import { CreatedResponse, OkResponse, GetResponse, UpdatedResponse } from '../../common/responses';

/**
 * Interface cho JWT Payload
 */
interface IJwtPayload {
    userId: string;
    email?: string;
}

/**
 * Lấy thông tin device từ request
 */
function getDeviceInfo(req: Request) {
    return {
        ip: (req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown') as string,
        device: req.headers['user-agent']?.toString() || 'unknown',
        os: req.headers['sec-ch-ua-platform']?.toString() || 'unknown',
    };
}

/**
 * Auth Controller
 * Xử lý tất cả các API liên quan đến authentication
 */
@ApiTags('Auth')
@ApiHeader({
    name: 'accept-language',
    description: 'Ngôn ngữ (vi, en, ...)',
    required: false,
})
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }



    @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
    @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
    @ApiResponse({ status: 409, description: 'Email đã tồn tại' })
    @Public()
    @Post('register')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async register(
        @Body() dto: RegisterDto,
        @Req() req: Request,
        @Headers('accept-language') lang?: string,
    ) {
        const deviceInfo = getDeviceInfo(req);
        const result = await this.authService.register(dto, deviceInfo, lang || 'vi');
        return new CreatedResponse(result.user, result.message, {
            access_token: result.access_token,
            refresh_token: result.refresh_token,
        });
    }

    @ApiOperation({ summary: 'Đăng nhập' })
    @ApiResponse({ status: 200, description: 'Đăng nhập thành công hoặc yêu cầu 2FA' })
    @ApiResponse({ status: 401, description: 'Thông tin đăng nhập không hợp lệ' })
    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async login(
        @Body() dto: LoginDto,
        @Req() req: Request,
        @Headers('accept-language') lang?: string,
    ) {
        const deviceInfo = getDeviceInfo(req);
        const result = await this.authService.login(dto, deviceInfo, lang || 'vi');

        if ('requires_2fa' in result && result.requires_2fa) {
            return new OkResponse(
                { requires_2fa: true, temp_token: result.temp_token },
                result.message,
            );
        }

        const successResult = result as {
            message: string;
            user: object;
            access_token: string;
            refresh_token: string;
        };

        return new OkResponse(successResult.user, successResult.message, {
            access_token: successResult.access_token,
            refresh_token: successResult.refresh_token,
        });
    }



    @ApiOperation({ summary: 'Xác thực email' })
    @ApiResponse({ status: 200, description: 'Xác thực thành công' })
    @ApiResponse({ status: 400, description: 'Token không hợp lệ hoặc hết hạn' })
    @Public()
    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    async verifyEmail(
        @Body() dto: VerifyEmailDto,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.verifyEmail(dto, lang || 'vi');
        return new OkResponse(null, result.message);
    }

    @ApiOperation({ summary: 'Gửi lại email xác thực' })
    @ApiResponse({ status: 200, description: 'Email đã được gửi' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    async resendVerification(
        @CurrentUser() user: IJwtPayload,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.resendVerificationEmail(user.userId, lang || 'vi');
        return new OkResponse(null, result.message);
    }



    @ApiOperation({ summary: 'Xác thực quyền để thực hiện thao tác nhạy cảm' })
    @ApiResponse({ status: 200, description: 'Xác thực thành công, trả về access verification token' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post('verify-access')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async verifyAccess(
        @CurrentUser() user: IJwtPayload,
        @Body() dto: VerifyAccessDto,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.verifyAccess(user.userId, dto, lang || 'vi');
        return new OkResponse(
            { access_verification_token: result.access_verification_token },
            result.message,
        );
    }



    @ApiOperation({ summary: 'Yêu cầu đặt lại mật khẩu' })
    @ApiResponse({ status: 200, description: 'Email hướng dẫn đã được gửi' })
    @Public()
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    async forgotPassword(
        @Body() dto: ForgotPasswordDto,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.forgotPassword(dto, lang || 'vi');
        return new OkResponse(null, result.message);
    }

    @ApiOperation({ summary: 'Kiểm tra token đặt lại mật khẩu' })
    @ApiResponse({ status: 200, description: 'Trả về trạng thái hợp lệ của token' })
    @Public()
    @Post('verify-forgot-password-token')
    @HttpCode(HttpStatus.OK)
    async verifyForgotPasswordToken(
        @Body() dto: VerifyForgotPasswordTokenDto,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.verifyForgotPasswordToken(dto, lang || 'vi');
        return new OkResponse({ valid: result.valid }, result.message);
    }

    @ApiOperation({ summary: 'Đặt lại mật khẩu mới' })
    @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
    @ApiResponse({ status: 400, description: 'Token không hợp lệ hoặc mật khẩu không khớp' })
    @Public()
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    async resetPassword(
        @Body() dto: ResetPasswordDto,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.resetPassword(dto, lang || 'vi');
        return new OkResponse(null, result.message);
    }



    @ApiOperation({ summary: 'Thiết lập xác thực 2 yếu tố (2FA)' })
    @ApiResponse({ status: 200, description: 'Trả về secret, QR code và backup codes' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, AccessVerificationGuard)
    @Post('2fa/setup')
    @HttpCode(HttpStatus.OK)
    async setupTwoFactor(
        @CurrentUser() user: IJwtPayload,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.setupTwoFactor(user.userId, lang || 'vi');
        return new OkResponse(
            {
                secret: result.secret,
                qr_code_url: result.qr_code_url,
                backup_codes: result.backup_codes,
            },
            result.message,
        );
    }

    @ApiOperation({ summary: 'Xác minh và bật 2FA' })
    @ApiResponse({ status: 200, description: 'Bật 2FA thành công' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post('2fa/verify-setup')
    @HttpCode(HttpStatus.OK)
    async verifyTwoFactorSetup(
        @CurrentUser() user: IJwtPayload,
        @Body() dto: VerifyTwoFactorSetupDto,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.verifyTwoFactorSetup(user.userId, dto, lang || 'vi');
        return new OkResponse(null, result.message);
    }

    @ApiOperation({ summary: 'Tắt xác thực 2 yếu tố (2FA)' })
    @ApiResponse({ status: 200, description: 'Tắt 2FA thành công' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, AccessVerificationGuard)
    @Post('2fa/disable')
    @HttpCode(HttpStatus.OK)
    async disableTwoFactor(
        @CurrentUser() user: IJwtPayload,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.disableTwoFactor(user.userId, lang || 'vi');
        return new OkResponse(null, result.message);
    }

    @ApiOperation({ summary: 'Xác minh 2FA khi đăng nhập' })
    @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
    @Public()
    @Post('2fa/verify-login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async verifyTwoFactorLogin(
        @Body() dto: VerifyTwoFactorLoginDto,
        @Req() req: Request,
        @Headers('accept-language') lang?: string,
    ) {
        const deviceInfo = getDeviceInfo(req);
        const result = await this.authService.verifyTwoFactorLogin(dto, deviceInfo, lang || 'vi');
        return new OkResponse(result.user, result.message, {
            access_token: result.access_token,
            refresh_token: result.refresh_token,
        });
    }

    @ApiOperation({ summary: 'Tạo mới backup codes' })
    @ApiResponse({ status: 200, description: 'Trả về danh sách backup codes mới' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, AccessVerificationGuard)
    @Post('2fa/regenerate-backup-codes')
    @HttpCode(HttpStatus.OK)
    async regenerateBackupCodes(
        @CurrentUser() user: IJwtPayload,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.regenerateBackupCodes(user.userId, lang || 'vi');
        return new OkResponse({ backup_codes: result.backup_codes }, result.message);
    }

    @ApiOperation({ summary: 'Lấy danh sách backup codes' })
    @ApiResponse({ status: 200, description: 'Trả về danh sách backup codes (đã ẩn)' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, AccessVerificationGuard)
    @Get('2fa/backup-codes')
    async getBackupCodes(
        @CurrentUser() user: IJwtPayload,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.getBackupCodes(user.userId, lang || 'vi');
        return new GetResponse(result, result.message);
    }



    @ApiOperation({ summary: 'Lấy thông tin tài khoản' })
    @ApiResponse({ status: 200, description: 'Trả về thông tin user, roles và permissions' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(
        @CurrentUser() user: IJwtPayload,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.getProfile(user.userId, lang || 'vi');
        return new GetResponse(
            {
                user: result.user,
                roles: result.roles,
                permissions: result.permissions,
            },
            result.message,
        );
    }

    @ApiOperation({ summary: 'Đăng xuất' })
    @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Body() dto: LogoutDto,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.logout(dto, lang || 'vi');
        return new OkResponse(null, result.message);
    }

    @ApiOperation({ summary: 'Đăng xuất tất cả thiết bị' })
    @ApiResponse({ status: 200, description: 'Đã đăng xuất tất cả thiết bị' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post('logout-all')
    @HttpCode(HttpStatus.OK)
    async logoutAll(
        @CurrentUser() user: IJwtPayload,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.logoutAll(user.userId, lang || 'vi');
        return new OkResponse(null, result.message);
    }

    // ===================== GOOGLE AUTH =====================

    @ApiOperation({ summary: 'Đăng nhập/đăng ký bằng Google' })
    @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
    @ApiResponse({ status: 201, description: 'Đăng ký và đăng nhập thành công' })
    @Public()
    @Post('google')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async googleAuth(
        @Body() dto: GoogleAuthDto,
        @Req() req: Request,
        @Headers('accept-language') lang?: string,
    ) {
        const deviceInfo = getDeviceInfo(req);
        const result = await this.authService.googleAuth(dto, deviceInfo, lang || 'vi');
        return new OkResponse(result.user, result.message, {
            access_token: result.access_token,
            refresh_token: result.refresh_token,
        });
    }

    @ApiOperation({ summary: 'Liên kết tài khoản Google (yêu cầu xác thực quyền)' })
    @ApiResponse({ status: 200, description: 'Liên kết thành công' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, AccessVerificationGuard)
    @Post('link/google')
    @HttpCode(HttpStatus.OK)
    async linkGoogle(
        @CurrentUser() user: IJwtPayload,
        @Body() dto: LinkGoogleDto,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.linkGoogle(user.userId, dto, lang || 'vi');
        return new OkResponse(null, result.message);
    }

    @ApiOperation({ summary: 'Gỡ liên kết nền tảng (chỉ từ liên kết chính)' })
    @ApiResponse({ status: 200, description: 'Gỡ liên kết thành công' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, AccessVerificationGuard, PrimaryAuthGuard)
    @Post('unlink')
    @HttpCode(HttpStatus.OK)
    async unlinkPlatform(
        @CurrentUser() user: IJwtPayload,
        @Body() dto: UnlinkPlatformDto,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.unlinkPlatform(user.userId, dto, lang || 'vi');
        return new OkResponse(null, result.message);
    }

    // ===================== PASSWORD =====================

    @ApiOperation({ summary: 'Thay đổi mật khẩu (yêu cầu xác thực quyền)' })
    @ApiResponse({ status: 200, description: 'Thay đổi mật khẩu thành công' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, AccessVerificationGuard)
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @CurrentUser() user: IJwtPayload,
        @Body() dto: ChangePasswordDto,
        @Req() req: Request,
        @Headers('accept-language') lang?: string,
    ) {
        const deviceInfo = getDeviceInfo(req);
        const result = await this.authService.changePassword(user.userId, dto, deviceInfo, lang || 'vi');
        return new OkResponse(null, result.message);
    }

    // ===================== PROFILE =====================

    @ApiOperation({ summary: 'Cập nhật thông tin tài khoản (name, language)' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Patch('profile')
    async updateProfile(
        @CurrentUser() user: IJwtPayload,
        @Body() dto: UpdateProfileDto,
        @Headers('accept-language') lang?: string,
    ) {
        const result = await this.authService.updateProfile(user.userId, dto, lang || 'vi');
        return new UpdatedResponse(null, result.message);
    }
}
