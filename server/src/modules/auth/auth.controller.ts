import {
  Controller,
  Post,
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
  LogoutDto,
  RefreshTokenDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { Public, CurrentUser } from '../../common/decorators';
import { CreatedResponse, OkResponse, ResponseCode } from '../../common/responses';

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
    ip: (req.ip ||
      req.headers['x-forwarded-for']?.toString() ||
      'unknown') as string,
    device: req.headers['user-agent']?.toString() || 'unknown',
    os: req.headers['sec-ch-ua-platform']?.toString() || 'unknown',
  };
}

/**
 * Auth Controller
 * Xử lý các API liên quan đến authentication
 */
@ApiTags('Auth')
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
    const result = await this.authService.register(
      dto,
      deviceInfo,
      lang || 'vi',
    );
    return new CreatedResponse(ResponseCode.AUTH_REGISTER_SUCCESS, result.user, result.message, {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
  }

  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công hoặc yêu cầu 2FA',
  })
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
        ResponseCode.AUTH_LOGIN_2FA_REQUIRED,
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

    return new OkResponse(ResponseCode.AUTH_LOGIN_SUCCESS, successResult.user, successResult.message, {
      access_token: successResult.access_token,
      refresh_token: successResult.refresh_token,
    });
  }

  @ApiOperation({ summary: 'Làm mới access token từ refresh token' })
  @ApiResponse({ status: 200, description: 'Làm mới token thành công' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token không hợp lệ hoặc hết hạn',
  })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Headers('accept-language') lang?: string,
  ) {
    const deviceInfo = getDeviceInfo(req);
    const result = await this.authService.refreshToken(
      dto.refresh_token,
      deviceInfo,
      lang || 'vi',
    );
    return new OkResponse(ResponseCode.AUTH_REFRESH_TOKEN_SUCCESS, null, result.message, {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
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
    return new OkResponse(ResponseCode.AUTH_LOGOUT_SUCCESS, null, result.message);
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
    return new OkResponse(ResponseCode.AUTH_LOGOUT_ALL_SUCCESS, null, result.message);
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
    return new OkResponse(ResponseCode.AUTH_VERIFY_EMAIL_SUCCESS, null, result.message);
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
    const result = await this.authService.resendVerificationEmail(
      user.userId,
      lang || 'vi',
    );
    return new OkResponse(ResponseCode.AUTH_RESEND_VERIFICATION_SUCCESS, null, result.message);
  }

  @ApiOperation({ summary: 'Xác thực quyền để thực hiện thao tác nhạy cảm' })
  @ApiResponse({
    status: 200,
    description: 'Xác thực thành công, trả về access verification token',
  })
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
    const result = await this.authService.verifyAccess(
      user.userId,
      dto,
      lang || 'vi',
    );
    return new OkResponse(
      ResponseCode.AUTH_VERIFY_ACCESS_SUCCESS,
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
    return new OkResponse(ResponseCode.AUTH_FORGOT_PASSWORD_SENT, null, result.message);
  }

  @ApiOperation({ summary: 'Kiểm tra token đặt lại mật khẩu' })
  @ApiResponse({
    status: 200,
    description: 'Trả về trạng thái hợp lệ của token',
  })
  @Public()
  @Post('verify-forgot-password-token')
  @HttpCode(HttpStatus.OK)
  async verifyForgotPasswordToken(
    @Body() dto: VerifyForgotPasswordTokenDto,
    @Headers('accept-language') lang?: string,
  ) {
    const result = await this.authService.verifyForgotPasswordToken(
      dto,
      lang || 'vi',
    );
    return new OkResponse(ResponseCode.AUTH_VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS, { valid: result.valid }, result.message);
  }

  @ApiOperation({ summary: 'Đặt lại mật khẩu mới' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  @ApiResponse({
    status: 400,
    description: 'Token không hợp lệ hoặc mật khẩu không khớp',
  })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Headers('accept-language') lang?: string,
  ) {
    const result = await this.authService.resetPassword(dto, lang || 'vi');
    return new OkResponse(ResponseCode.AUTH_RESET_PASSWORD_SUCCESS, null, result.message);
  }
}
