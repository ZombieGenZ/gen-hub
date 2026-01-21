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
  ApiBody,
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
  LogoutDto,
  RefreshTokenDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { Public, CurrentUser } from '../../common/decorators';
import { BruteForceGuard } from '../brute-force/brute-force.guard';
import { CreatedResponse, OkResponse, ResponseCode } from '../../common/responses';
import type { IJwtPayload } from '../../common/interfaces';
import {
  ApiValidationErrorResponse,
  ApiAuthResponses,
  ApiUnauthorizedResponses,
} from '../../common/decorators/api-common-responses.decorator';

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

  @ApiOperation({
    summary: 'Đăng ký tài khoản mới',
    description: 'Tạo tài khoản mới bằng email. Sau khi đăng ký thành công, hệ thống sẽ gửi email xác thực đến địa chỉ email đã đăng ký. Tài khoản mới sẽ tự động đăng nhập và nhận access token + refresh token.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'Thông tin đăng ký tài khoản',
    examples: {
      basic: {
        summary: 'Đăng ký cơ bản',
        description: 'Ví dụ đăng ký với thông tin tối thiểu',
        value: {
          name: 'Nguyễn Văn A',
          email: 'user@example.com',
          password: 'Password@123',
        },
      },
      with_language: {
        summary: 'Đăng ký với ngôn ngữ',
        description: 'Ví dụ đăng ký và chỉ định ngôn ngữ ưu tiên',
        value: {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass@456',
          language: 'en',
        },
      },
      with_turnstile: {
        summary: 'Đăng ký với Turnstile',
        description: 'Ví dụ đăng ký kèm Cloudflare Turnstile token',
        value: {
          name: 'Trần Thị B',
          email: 'tranb@example.com',
          password: 'MyPass@789',
          turnstileToken: '0.abc123xyz...',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Đăng ký thành công, trả về thông tin user và tokens',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.register.success' },
        message: { type: 'string', example: 'Đăng ký tài khoản thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx1234567890abcdef' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'Nguyễn Văn A' },
            isVerified: { type: 'boolean', example: false },
            language: { type: 'string', example: 'vi' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-21T09:00:00.000Z' },
          },
        },
        authorization: {
          type: 'object',
          properties: {
            access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email đã tồn tại trong hệ thống',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.register.email_exists' },
        message: { type: 'string', example: 'Email đã được sử dụng' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiValidationErrorResponse()
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

  @ApiOperation({
    summary: 'Đăng nhập',
    description: 'Đăng nhập bằng email và mật khẩu. Nếu tài khoản đã bật 2FA, sẽ trả về temp_token để tiếp tục xác thực 2FA. Nếu không, trả về access token và refresh token.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Thông tin đăng nhập',
    examples: {
      basic: {
        summary: 'Đăng nhập cơ bản',
        description: 'Đăng nhập với email và mật khẩu',
        value: {
          email: 'user@example.com',
          password: 'Password@123',
        },
      },
      with_turnstile: {
        summary: 'Đăng nhập với Turnstile',
        description: 'Đăng nhập kèm Cloudflare Turnstile token để vượt qua CAPTCHA',
        value: {
          email: 'user@example.com',
          password: 'Password@123',
          turnstileToken: '0.abc123xyz...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công hoặc yêu cầu 2FA',
    content: {
      'application/json': {
        examples: {
          success: {
            summary: 'Đăng nhập thành công (không có 2FA)',
            value: {
              code: 'auth.login.success',
              message: 'Đăng nhập thành công',
              success: true,
              data: {
                id: 'clx1234567890abcdef',
                email: 'user@example.com',
                name: 'Nguyễn Văn A',
                isVerified: true,
                twoFactorEnabled: false,
              },
              authorization: {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
          requires_2fa: {
            summary: 'Yêu cầu xác thực 2FA',
            description: 'Tài khoản đã bật 2FA, cần xác thực thêm',
            value: {
              code: 'auth.login.2fa_required',
              message: 'Vui lòng nhập mã xác thực 2FA',
              success: true,
              data: {
                requires_2fa: true,
                temp_token: 'temp_2fa_token_abc123...',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Thông tin đăng nhập không hợp lệ',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.login.invalid_credentials' },
        message: { type: 'string', example: 'Email hoặc mật khẩu không đúng' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Quá nhiều lần đăng nhập thất bại, tài khoản bị tạm khóa',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.login.too_many_attempts' },
        message: { type: 'string', example: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiValidationErrorResponse()
  @Public()
  @UseGuards(BruteForceGuard)
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

  @ApiOperation({
    summary: 'Đăng nhập Database Panel',
    description: 'Đăng nhập vào Database Panel. Yêu cầu tài khoản phải có quyền `database.admin`. Nếu tài khoản đã bật 2FA, sẽ trả về temp_token để tiếp tục xác thực 2FA.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Thông tin đăng nhập',
    examples: {
      admin_login: {
        summary: 'Đăng nhập admin',
        description: 'Đăng nhập với tài khoản có quyền database.admin',
        value: {
          email: 'admin@example.com',
          password: 'AdminPass@123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công hoặc yêu cầu 2FA',
    content: {
      'application/json': {
        examples: {
          success: {
            summary: 'Đăng nhập thành công',
            value: {
              code: 'auth.login.database_panel.success',
              message: 'Đăng nhập Database Panel thành công',
              success: true,
              data: {
                id: 'clx1234567890abcdef',
                email: 'admin@example.com',
                name: 'Admin User',
                permissions: ['database.admin'],
              },
              authorization: {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
          requires_2fa: {
            summary: 'Yêu cầu xác thực 2FA',
            value: {
              code: 'auth.login.2fa_required',
              message: 'Vui lòng nhập mã xác thực 2FA',
              success: true,
              data: {
                requires_2fa: true,
                temp_token: 'temp_2fa_token_abc123...',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Thông tin đăng nhập không hợp lệ',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.login.invalid_credentials' },
        message: { type: 'string', example: 'Email hoặc mật khẩu không đúng' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập Database Panel',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.login.no_permission' },
        message: { type: 'string', example: 'Bạn không có quyền truy cập Database Panel' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiValidationErrorResponse()
  @Public()
  @UseGuards(BruteForceGuard)
  @Post('login/database-panel')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async loginDatabasePanel(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Headers('accept-language') lang?: string,
  ) {
    const deviceInfo = getDeviceInfo(req);
    const result = await this.authService.loginDatabasePanel(dto, deviceInfo, lang || 'vi');

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

    return new OkResponse(ResponseCode.AUTH_LOGIN_DATABASE_PANEL_SUCCESS, successResult.user, successResult.message, {
      access_token: successResult.access_token,
      refresh_token: successResult.refresh_token,
    });
  }

  @ApiOperation({
    summary: 'Đăng nhập Feature Flag Panel',
    description: 'Đăng nhập vào Feature Flag Panel. Yêu cầu tài khoản phải có quyền `featureflag.admin`. Nếu tài khoản đã bật 2FA, sẽ trả về temp_token để tiếp tục xác thực 2FA.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Thông tin đăng nhập',
    examples: {
      admin_login: {
        summary: 'Đăng nhập admin',
        description: 'Đăng nhập với tài khoản có quyền featureflag.admin',
        value: {
          email: 'admin@example.com',
          password: 'AdminPass@123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công hoặc yêu cầu 2FA',
    content: {
      'application/json': {
        examples: {
          success: {
            summary: 'Đăng nhập thành công',
            value: {
              code: 'auth.login.feature_flag_panel.success',
              message: 'Đăng nhập Feature Flag Panel thành công',
              success: true,
              data: {
                id: 'clx1234567890abcdef',
                email: 'admin@example.com',
                name: 'Admin User',
                permissions: ['featureflag.admin'],
              },
              authorization: {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
          requires_2fa: {
            summary: 'Yêu cầu xác thực 2FA',
            value: {
              code: 'auth.login.2fa_required',
              message: 'Vui lòng nhập mã xác thực 2FA',
              success: true,
              data: {
                requires_2fa: true,
                temp_token: 'temp_2fa_token_abc123...',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Thông tin đăng nhập không hợp lệ',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.login.invalid_credentials' },
        message: { type: 'string', example: 'Email hoặc mật khẩu không đúng' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập Feature Flag Panel',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.login.no_permission' },
        message: { type: 'string', example: 'Bạn không có quyền truy cập Feature Flag Panel' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiValidationErrorResponse()
  @Public()
  @UseGuards(BruteForceGuard)
  @Post('login/feature-flag-panel')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async loginFeatureFlagPanel(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Headers('accept-language') lang?: string,
  ) {
    const deviceInfo = getDeviceInfo(req);
    const result = await this.authService.loginFeatureFlagPanel(dto, deviceInfo, lang || 'vi');

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

    return new OkResponse(ResponseCode.AUTH_LOGIN_FEATURE_FLAG_PANEL_SUCCESS, successResult.user, successResult.message, {
      access_token: successResult.access_token,
      refresh_token: successResult.refresh_token,
    });
  }

  @ApiOperation({
    summary: 'Đăng nhập Resources Panel',
    description: 'Đăng nhập vào Resources Panel. Yêu cầu tài khoản phải có quyền `resources.admin`. Nếu tài khoản đã bật 2FA, sẽ trả về temp_token để tiếp tục xác thực 2FA.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Thông tin đăng nhập',
    examples: {
      admin_login: {
        summary: 'Đăng nhập admin',
        description: 'Đăng nhập với tài khoản có quyền resources.admin',
        value: {
          email: 'admin@example.com',
          password: 'AdminPass@123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công hoặc yêu cầu 2FA',
    content: {
      'application/json': {
        examples: {
          success: {
            summary: 'Đăng nhập thành công',
            value: {
              code: 'auth.login.resources_panel.success',
              message: 'Đăng nhập Resources Panel thành công',
              success: true,
              data: {
                id: 'clx1234567890abcdef',
                email: 'admin@example.com',
                name: 'Admin User',
                permissions: ['resources.admin'],
              },
              authorization: {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
          requires_2fa: {
            summary: 'Yêu cầu xác thực 2FA',
            value: {
              code: 'auth.login.2fa_required',
              message: 'Vui lòng nhập mã xác thực 2FA',
              success: true,
              data: {
                requires_2fa: true,
                temp_token: 'temp_2fa_token_abc123...',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Thông tin đăng nhập không hợp lệ',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.login.invalid_credentials' },
        message: { type: 'string', example: 'Email hoặc mật khẩu không đúng' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập Resources Panel',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.login.no_permission' },
        message: { type: 'string', example: 'Bạn không có quyền truy cập Resources Panel' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiValidationErrorResponse()
  @Public()
  @UseGuards(BruteForceGuard)
  @Post('login/resources-panel')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async loginResourcesPanel(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Headers('accept-language') lang?: string,
  ) {
    const deviceInfo = getDeviceInfo(req);
    const result = await this.authService.loginResourcesPanel(dto, deviceInfo, lang || 'vi');

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

    return new OkResponse(ResponseCode.AUTH_LOGIN_RESOURCES_PANEL_SUCCESS, successResult.user, successResult.message, {
      access_token: successResult.access_token,
      refresh_token: successResult.refresh_token,
    });
  }

  @ApiOperation({
    summary: 'Đăng nhập Admin Panel',
    description: 'Đăng nhập vào Admin Panel. Yêu cầu tài khoản phải có ít nhất 1 trong 3 quyền: `database.admin`, `featureflag.admin`, hoặc `resources.admin`. Nếu tài khoản đã bật 2FA, sẽ trả về temp_token để tiếp tục xác thực 2FA.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Thông tin đăng nhập',
    examples: {
      admin_login: {
        summary: 'Đăng nhập admin',
        description: 'Đăng nhập với tài khoản có quyền admin',
        value: {
          email: 'admin@example.com',
          password: 'AdminPass@123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công hoặc yêu cầu 2FA',
    content: {
      'application/json': {
        examples: {
          success: {
            summary: 'Đăng nhập thành công',
            value: {
              code: 'auth.login.admin_panel.success',
              message: 'Đăng nhập Admin Panel thành công',
              success: true,
              data: {
                id: 'clx1234567890abcdef',
                email: 'admin@example.com',
                name: 'Admin User',
                permissions: ['database.admin', 'featureflag.admin', 'resources.admin'],
              },
              authorization: {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
          requires_2fa: {
            summary: 'Yêu cầu xác thực 2FA',
            value: {
              code: 'auth.login.2fa_required',
              message: 'Vui lòng nhập mã xác thực 2FA',
              success: true,
              data: {
                requires_2fa: true,
                temp_token: 'temp_2fa_token_abc123...',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Thông tin đăng nhập không hợp lệ',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.login.invalid_credentials' },
        message: { type: 'string', example: 'Email hoặc mật khẩu không đúng' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập Admin Panel',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.login.no_permission' },
        message: { type: 'string', example: 'Bạn không có quyền truy cập Admin Panel' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiValidationErrorResponse()
  @Public()
  @UseGuards(BruteForceGuard)
  @Post('login/admin-panel')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async loginAdminPanel(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Headers('accept-language') lang?: string,
  ) {
    const deviceInfo = getDeviceInfo(req);
    const result = await this.authService.loginAdminPanel(dto, deviceInfo, lang || 'vi');

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

    return new OkResponse(ResponseCode.AUTH_LOGIN_ADMIN_PANEL_SUCCESS, successResult.user, successResult.message, {
      access_token: successResult.access_token,
      refresh_token: successResult.refresh_token,
    });
  }

  @ApiOperation({
    summary: 'Làm mới access token',
    description: 'Sử dụng refresh token để lấy access token mới. Refresh token cũ sẽ bị vô hiệu hóa và một refresh token mới được cấp (token rotation).',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token hiện tại',
    examples: {
      refresh: {
        summary: 'Làm mới token',
        description: 'Gửi refresh token để nhận tokens mới',
        value: {
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Làm mới token thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.refresh.success' },
        message: { type: 'string', example: 'Làm mới token thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
        authorization: {
          type: 'object',
          properties: {
            access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token không hợp lệ hoặc hết hạn',
    content: {
      'application/json': {
        examples: {
          invalid: {
            summary: 'Token không hợp lệ',
            value: {
              code: 'auth.refresh.invalid_token',
              message: 'Refresh token không hợp lệ',
              success: false,
            },
          },
          expired: {
            summary: 'Token hết hạn',
            value: {
              code: 'auth.refresh.token_expired',
              message: 'Refresh token đã hết hạn, vui lòng đăng nhập lại',
              success: false,
            },
          },
          revoked: {
            summary: 'Token đã bị thu hồi',
            value: {
              code: 'auth.refresh.token_revoked',
              message: 'Refresh token đã bị thu hồi',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiValidationErrorResponse()
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

  @ApiOperation({
    summary: 'Đăng xuất',
    description: 'Đăng xuất khỏi thiết bị hiện tại bằng cách hủy refresh token được chỉ định. Access token vẫn còn hiệu lực cho đến khi hết hạn.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: LogoutDto,
    description: 'Refresh token cần hủy',
    examples: {
      logout: {
        summary: 'Đăng xuất',
        description: 'Gửi refresh token để đăng xuất',
        value: {
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng xuất thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.logout.success' },
        message: { type: 'string', example: 'Đăng xuất thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiUnauthorizedResponses()
  @ApiValidationErrorResponse()
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

  @ApiOperation({
    summary: 'Đăng xuất tất cả thiết bị',
    description: 'Đăng xuất khỏi tất cả các thiết bị đã đăng nhập bằng cách hủy tất cả refresh tokens. Hữu ích khi nghi ngờ tài khoản bị xâm nhập.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiResponse({
    status: 200,
    description: 'Đã đăng xuất tất cả thiết bị',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.logout_all.success' },
        message: { type: 'string', example: 'Đã đăng xuất khỏi tất cả thiết bị' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiUnauthorizedResponses()
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

  @ApiOperation({
    summary: 'Xác thực email',
    description: 'Xác thực địa chỉ email bằng token được gửi qua email sau khi đăng ký. Token có thời hạn 24 giờ.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: VerifyEmailDto,
    description: 'Token xác thực email',
    examples: {
      verify: {
        summary: 'Xác thực email',
        description: 'Gửi token nhận được từ email',
        value: {
          token: 'abc123def456ghi789...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xác thực email thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.verify_email.success' },
        message: { type: 'string', example: 'Xác thực email thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token không hợp lệ hoặc hết hạn',
    content: {
      'application/json': {
        examples: {
          invalid: {
            summary: 'Token không hợp lệ',
            value: {
              code: 'auth.verify_email.invalid_token',
              message: 'Token xác thực không hợp lệ',
              success: false,
            },
          },
          expired: {
            summary: 'Token hết hạn',
            value: {
              code: 'auth.verify_email.token_expired',
              message: 'Token xác thực đã hết hạn, vui lòng yêu cầu gửi lại email xác thực',
              success: false,
            },
          },
          already_verified: {
            summary: 'Email đã được xác thực',
            value: {
              code: 'auth.verify_email.already_verified',
              message: 'Email đã được xác thực trước đó',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiValidationErrorResponse()
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

  @ApiOperation({
    summary: 'Gửi lại email xác thực',
    description: 'Gửi lại email xác thực đến địa chỉ email của tài khoản. Giới hạn 3 lần/phút để tránh spam.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiResponse({
    status: 200,
    description: 'Email xác thực đã được gửi',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.resend_verification.success' },
        message: { type: 'string', example: 'Email xác thực đã được gửi' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Lỗi khi gửi email',
    content: {
      'application/json': {
        examples: {
          already_verified: {
            summary: 'Email đã được xác thực',
            value: {
              code: 'auth.resend_verification.already_verified',
              message: 'Email đã được xác thực, không cần gửi lại',
              success: false,
            },
          },
          rate_limit: {
            summary: 'Quá nhiều yêu cầu',
            value: {
              code: 'auth.resend_verification.rate_limit',
              message: 'Vui lòng đợi trước khi yêu cầu gửi lại email',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponses()
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

  @ApiOperation({
    summary: 'Xác thực quyền truy cập',
    description: 'Xác thực quyền truy cập trước khi thực hiện các thao tác nhạy cảm như bật/tắt 2FA, xóa tài khoản, v.v. Nếu đã bật 2FA thì dùng mã 2FA hoặc backup code, nếu chưa bật thì dùng mật khẩu. Token trả về có thời hạn 5 phút.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: VerifyAccessDto,
    description: 'Thông tin xác thực (chỉ cần 1 trong 3: password, two_factor_code, hoặc backup_code)',
    examples: {
      with_password: {
        summary: 'Xác thực bằng mật khẩu',
        description: 'Dùng khi chưa bật 2FA',
        value: {
          password: 'Password@123',
        },
      },
      with_2fa: {
        summary: 'Xác thực bằng mã 2FA',
        description: 'Dùng khi đã bật 2FA',
        value: {
          two_factor_code: '123456',
        },
      },
      with_backup: {
        summary: 'Xác thực bằng backup code',
        description: 'Dùng khi mất thiết bị 2FA',
        value: {
          backup_code: 'ABCD1234',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xác thực thành công, trả về access verification token',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.verify_access.success' },
        message: { type: 'string', example: 'Xác thực thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            access_verification_token: {
              type: 'string',
              description: 'Token xác thực quyền truy cập, dùng cho các thao tác nhạy cảm, có hiệu lực 5 phút',
              example: 'avt_abc123def456...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Thông tin xác thực không chính xác',
    content: {
      'application/json': {
        examples: {
          wrong_password: {
            summary: 'Sai mật khẩu',
            value: {
              code: 'auth.verify_access.wrong_password',
              message: 'Mật khẩu không chính xác',
              success: false,
            },
          },
          invalid_2fa_code: {
            summary: 'Mã 2FA không đúng',
            value: {
              code: 'auth.verify_access.invalid_2fa_code',
              message: 'Mã xác thực 2FA không chính xác',
              success: false,
            },
          },
          invalid_backup_code: {
            summary: 'Backup code không đúng',
            value: {
              code: 'auth.verify_access.invalid_backup_code',
              message: 'Mã backup không chính xác hoặc đã được sử dụng',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
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

  @ApiOperation({
    summary: 'Yêu cầu đặt lại mật khẩu',
    description: 'Gửi email chứa link đặt lại mật khẩu đến địa chỉ email đã đăng ký. Link có thời hạn 1 giờ. Để bảo mật, API luôn trả về thành công bất kể email có tồn tại hay không.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Email đăng ký tài khoản',
    examples: {
      forgot_password: {
        summary: 'Yêu cầu đặt lại mật khẩu',
        description: 'Gửi email để nhận link đặt lại mật khẩu',
        value: {
          email: 'user@example.com',
        },
      },
      with_turnstile: {
        summary: 'Yêu cầu với Turnstile',
        description: 'Gửi kèm Cloudflare Turnstile token',
        value: {
          email: 'user@example.com',
          turnstileToken: '0.abc123xyz...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email hướng dẫn đã được gửi (nếu email tồn tại trong hệ thống)',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.forgot_password.sent' },
        message: { type: 'string', example: 'Nếu email tồn tại, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiValidationErrorResponse()
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

  @ApiOperation({
    summary: 'Kiểm tra token đặt lại mật khẩu',
    description: 'Kiểm tra xem token đặt lại mật khẩu có hợp lệ và còn thời hạn hay không. Dùng để validate trước khi hiển thị form đặt mật khẩu mới.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: VerifyForgotPasswordTokenDto,
    description: 'Token quên mật khẩu từ email',
    examples: {
      verify_token: {
        summary: 'Kiểm tra token',
        description: 'Gửi token từ link trong email',
        value: {
          token: 'abc123def456ghi789...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về trạng thái hợp lệ của token',
    content: {
      'application/json': {
        examples: {
          valid: {
            summary: 'Token hợp lệ',
            value: {
              code: 'auth.verify_forgot_password_token.success',
              message: 'Token hợp lệ',
              success: true,
              data: {
                valid: true,
              },
            },
          },
          invalid: {
            summary: 'Token không hợp lệ',
            value: {
              code: 'auth.verify_forgot_password_token.invalid',
              message: 'Token không hợp lệ hoặc đã hết hạn',
              success: true,
              data: {
                valid: false,
              },
            },
          },
        },
      },
    },
  })
  @ApiValidationErrorResponse()
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

  @ApiOperation({
    summary: 'Đặt lại mật khẩu mới',
    description: 'Đặt mật khẩu mới bằng token từ email quên mật khẩu. Mật khẩu mới phải đáp ứng yêu cầu: ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt. Có thể chọn đăng xuất khỏi tất cả thiết bị sau khi đổi mật khẩu.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Thông tin đặt lại mật khẩu',
    examples: {
      reset: {
        summary: 'Đặt lại mật khẩu',
        description: 'Đặt mật khẩu mới với token từ email',
        value: {
          token: 'abc123def456ghi789...',
          new_password: 'NewPassword@123',
          confirm_password: 'NewPassword@123',
        },
      },
      reset_logout_all: {
        summary: 'Đặt lại mật khẩu và đăng xuất tất cả',
        description: 'Đặt mật khẩu mới và đăng xuất khỏi tất cả thiết bị',
        value: {
          token: 'abc123def456ghi789...',
          new_password: 'NewPassword@123',
          confirm_password: 'NewPassword@123',
          logout_all_devices: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Đổi mật khẩu thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'auth.reset_password.success' },
        message: { type: 'string', example: 'Đặt lại mật khẩu thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token không hợp lệ hoặc mật khẩu không khớp',
    content: {
      'application/json': {
        examples: {
          invalid_token: {
            summary: 'Token không hợp lệ',
            value: {
              code: 'auth.reset_password.invalid_token',
              message: 'Token không hợp lệ hoặc đã hết hạn',
              success: false,
            },
          },
          password_mismatch: {
            summary: 'Mật khẩu không khớp',
            value: {
              code: 'auth.reset_password.password_mismatch',
              message: 'Xác nhận mật khẩu không khớp',
              success: false,
            },
          },
          same_password: {
            summary: 'Mật khẩu trùng với mật khẩu cũ',
            value: {
              code: 'auth.reset_password.same_password',
              message: 'Mật khẩu mới không được trùng với mật khẩu cũ',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiValidationErrorResponse()
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
