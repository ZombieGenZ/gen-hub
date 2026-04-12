import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
  Req,
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

import { VerifyTwoFactorSetupDto, VerifyTwoFactorLoginDto } from '../auth/dto';
import { JwtAuthGuard, AccessVerificationGuard } from '../../common/guards';
import {
  Public,
  CurrentUser,
  ApiAuthResponses,
  ApiValidationErrorResponse,
  ApiUnauthorizedResponses,
} from '../../common/decorators';
import { OkResponse, GetResponse, ResponseCode } from '../../common/responses';
import { TwoFactorService } from './two-factor.service';
import type { IJwtPayload } from '../../common/interfaces';

/**
 * Lấy thông tin device từ request
 */
function getDeviceInfo(req: Request) {
  return {
    ip: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
    device: req.headers['user-agent']?.toString() || 'unknown',
    os: req.headers['sec-ch-ua-platform']?.toString() || 'unknown',
  };
}

/**
 * Two-Factor Controller
 * Quản lý xác thực 2 yếu tố (2FA)
 */
@ApiTags('Two-Factor Authentication')
@Controller('2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @ApiOperation({
    summary: 'Thiết lập xác thực 2 yếu tố (2FA)',
    description:
      'Bắt đầu quá trình thiết lập 2FA. API trả về secret key và QR code URL để người dùng quét bằng ứng dụng authenticator (Google Authenticator, Authy, v.v.). Sau khi quét, cần gọi API verify-setup để hoàn tất.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về secret và QR code để thiết lập 2FA',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'two_factor.setup_success' },
        message: {
          type: 'string',
          example: 'Vui lòng xác minh mã 2FA để hoàn tất thiết lập',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            secret: {
              type: 'string',
              description: 'Secret key (base32)',
              example: 'JBSWY3DPEHPK3PXP',
            },
            qr_code_url: {
              type: 'string',
              description: 'QR code URL (data URI)',
              example: 'data:image/png;base64,iVBORw0KGgo...',
            },
          },
        },
      },
      example: {
        code: 'two_factor.setup_success',
        message: 'Vui lòng xác minh mã 2FA để hoàn tất thiết lập',
        success: true,
        data: {
          secret: 'JBSWY3DPEHPK3PXP',
          qr_code_url: 'data:image/png;base64,iVBORw0KGgo...',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '2FA đã được bật hoặc người dùng không tồn tại',
    content: {
      'application/json': {
        examples: {
          already_enabled: {
            summary: '2FA đã được bật',
            value: {
              code: 'error.bad_request',
              message: '2FA đã được bật',
              success: false,
            },
          },
          user_not_found: {
            summary: 'Người dùng không tồn tại',
            value: {
              code: 'error.bad_request',
              message: 'Người dùng không tồn tại',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AccessVerificationGuard)
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  async setupTwoFactor(
    @CurrentUser() user: IJwtPayload,
    @Headers('accept-language') lang?: string,
  ) {
    const result = await this.twoFactorService.setupTwoFactor(
      user.userId,
      lang || 'vi',
    );
    return new OkResponse(
      ResponseCode.TWO_FACTOR_SETUP_SUCCESS,
      {
        secret: result.secret,
        qr_code_url: result.qr_code_url,
      },
      result.message,
    );
  }

  @ApiOperation({
    summary: 'Xác minh và bật 2FA',
    description:
      'Xác minh mã 2FA từ authenticator app để hoàn tất thiết lập. Sau khi xác minh thành công, 2FA sẽ được bật và hệ thống trả về danh sách backup codes. Backup codes dùng để đăng nhập khi mất thiết bị xác thực.',
  })
  @ApiBody({
    type: VerifyTwoFactorSetupDto,
    description: 'Mã 2FA 6 chữ số từ ứng dụng authenticator',
    examples: {
      valid_code: {
        summary: 'Mã 2FA hợp lệ',
        description: 'Mã 6 chữ số từ Google Authenticator hoặc Authy',
        value: {
          two_factor_code: '123456',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Bật 2FA thành công và trả về backup codes',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'two_factor.verify_setup_success' },
        message: { type: 'string', example: 'Thiết lập 2FA thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            backup_codes: {
              type: 'array',
              description: 'Danh sách 10 mã backup (mỗi mã dùng một lần)',
              items: { type: 'string' },
              example: [
                'ABCD1234',
                'EFGH5678',
                'IJKL9012',
                'MNOP3456',
                'QRST7890',
                'UVWX1234',
                'YZAB5678',
                'CDEF9012',
                'GHIJ3456',
                'KLMN7890',
              ],
            },
          },
        },
      },
      example: {
        code: 'two_factor.verify_setup_success',
        message: 'Thiết lập 2FA thành công',
        success: true,
        data: {
          backup_codes: [
            'ABCD1234',
            'EFGH5678',
            'IJKL9012',
            'MNOP3456',
            'QRST7890',
            'UVWX1234',
            'YZAB5678',
            'CDEF9012',
            'GHIJ3456',
            'KLMN7890',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Mã 2FA không chính xác hoặc chưa thiết lập 2FA',
    content: {
      'application/json': {
        examples: {
          verify_failed: {
            summary: 'Mã 2FA không chính xác',
            value: {
              code: 'error.bad_request',
              message: 'Mã 2FA không chính xác',
              success: false,
            },
          },
          setup_not_started: {
            summary: 'Chưa thiết lập 2FA',
            value: {
              code: 'error.bad_request',
              message: 'Chưa thiết lập 2FA',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiValidationErrorResponse()
  @ApiUnauthorizedResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('verify-setup')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactorSetup(
    @CurrentUser() user: IJwtPayload,
    @Body() dto: VerifyTwoFactorSetupDto,
    @Headers('accept-language') lang?: string,
  ) {
    const result = await this.twoFactorService.verifyTwoFactorSetup(
      user.userId,
      dto,
      lang || 'vi',
    );
    return new OkResponse(
      ResponseCode.TWO_FACTOR_VERIFY_SETUP_SUCCESS,
      { backup_codes: result.backup_codes },
      result.message,
    );
  }

  @ApiOperation({
    summary: 'Tắt xác thực 2 yếu tố (2FA)',
    description:
      'Vô hiệu hóa 2FA cho tài khoản. Tất cả backup codes sẽ bị xóa. Sau khi tắt, người dùng chỉ cần mật khẩu để đăng nhập. Yêu cầu xác thực quyền truy cập (access verification).',
  })
  @ApiResponse({
    status: 200,
    description: 'Tắt 2FA thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'two_factor.disable_success' },
        message: { type: 'string', example: 'Đã tắt 2FA thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
      example: {
        code: 'two_factor.disable_success',
        message: 'Đã tắt 2FA thành công',
        success: true,
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '2FA chưa được bật hoặc người dùng không tồn tại',
    content: {
      'application/json': {
        examples: {
          not_enabled: {
            summary: '2FA chưa được bật',
            value: {
              code: 'error.bad_request',
              message: '2FA chưa được bật',
              success: false,
            },
          },
          user_not_found: {
            summary: 'Người dùng không tồn tại',
            value: {
              code: 'error.bad_request',
              message: 'Người dùng không tồn tại',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AccessVerificationGuard)
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disableTwoFactor(
    @CurrentUser() user: IJwtPayload,
    @Headers('accept-language') lang?: string,
  ) {
    const result = await this.twoFactorService.disableTwoFactor(
      user.userId,
      lang || 'vi',
    );
    return new OkResponse(
      ResponseCode.TWO_FACTOR_DISABLE_SUCCESS,
      null,
      result.message,
    );
  }

  @ApiOperation({
    summary: 'Xác minh 2FA khi đăng nhập',
    description:
      'Xác minh mã 2FA hoặc backup code khi đăng nhập. Sử dụng temp_token nhận được từ API login khi tài khoản bật 2FA. Có thể dùng mã 2FA từ authenticator app hoặc backup code (khi mất thiết bị).',
  })
  @ApiBody({
    type: VerifyTwoFactorLoginDto,
    description: 'Token tạm thời và mã xác thực (2FA code hoặc backup code)',
    examples: {
      with_2fa_code: {
        summary: 'Xác minh bằng mã 2FA',
        description: 'Sử dụng mã 6 chữ số từ ứng dụng authenticator',
        value: {
          temp_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          two_factor_code: '123456',
        },
      },
      with_backup_code: {
        summary: 'Xác minh bằng backup code',
        description: 'Sử dụng backup code khi mất thiết bị xác thực',
        value: {
          temp_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          backup_code: 'ABCD1234',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công, trả về access token và refresh token',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'two_factor.verify_login_success' },
        message: { type: 'string', example: 'Xác minh 2FA thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID người dùng',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: {
              type: 'string',
              description: 'Tên người dùng',
              example: 'Nguyễn Văn A',
            },
            email: {
              type: 'string',
              description: 'Email',
              example: 'user@example.com',
            },
            email_confirmed: {
              type: 'boolean',
              description: 'Email đã xác thực',
              example: true,
            },
            is_verified: {
              type: 'boolean',
              description: 'Tài khoản đã xác minh',
              example: true,
            },
            two_factor_enabled: {
              type: 'boolean',
              description: '2FA đã bật',
              example: true,
            },
            language: {
              type: 'string',
              description: 'Ngôn ngữ',
              example: 'vi',
            },
            created_at: {
              type: 'string',
              description: 'Ngày tạo',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'JWT access token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refresh_token: {
              type: 'string',
              description: 'JWT refresh token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
      example: {
        code: 'two_factor.verify_login_success',
        message: 'Xác minh 2FA thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Nguyễn Văn A',
          email: 'user@example.com',
          email_confirmed: true,
          is_verified: true,
          two_factor_enabled: true,
          language: 'vi',
          created_at: '2024-01-01T00:00:00.000Z',
        },
        metadata: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Mã xác thực không hợp lệ hoặc token hết hạn',
    content: {
      'application/json': {
        examples: {
          verify_failed: {
            summary: 'Mã 2FA/backup không chính xác',
            value: {
              code: 'error.unauthorized',
              message: 'Mã 2FA không chính xác',
              success: false,
            },
          },
          token_invalid: {
            summary: 'Token không hợp lệ hoặc hết hạn',
            value: {
              code: 'error.unauthorized',
              message: 'Token không hợp lệ hoặc đã hết hạn',
              success: false,
            },
          },
          account_banned: {
            summary: 'Tài khoản bị khóa',
            value: {
              code: 'error.unauthorized',
              message: 'Tài khoản đã bị khóa',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiValidationErrorResponse()
  @Public()
  @Post('verify-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async verifyTwoFactorLogin(
    @Body() dto: VerifyTwoFactorLoginDto,
    @Req() req: Request,
    @Headers('accept-language') lang?: string,
  ) {
    const deviceInfo = getDeviceInfo(req);
    const result = await this.twoFactorService.verifyTwoFactorLogin(
      dto,
      deviceInfo,
      lang || 'vi',
    );
    return new OkResponse(
      ResponseCode.TWO_FACTOR_VERIFY_LOGIN_SUCCESS,
      result.user,
      result.message,
      {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      },
    );
  }

  @ApiOperation({
    summary: 'Tạo mới backup codes',
    description:
      'Tạo lại danh sách backup codes mới. Tất cả backup codes cũ sẽ bị hủy. Chỉ sử dụng khi đã mất hoặc sử dụng hết backup codes cũ. Yêu cầu 2FA đã được bật và xác thực quyền truy cập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách backup codes mới',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'two_factor.regenerate_backup_codes_success',
        },
        message: { type: 'string', example: 'Đã tạo mã backup mới' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            backup_codes: {
              type: 'array',
              description: 'Danh sách 10 mã backup mới (mỗi mã dùng một lần)',
              items: { type: 'string' },
              example: [
                'ABCD1234',
                'EFGH5678',
                'IJKL9012',
                'MNOP3456',
                'QRST7890',
                'UVWX1234',
                'YZAB5678',
                'CDEF9012',
                'GHIJ3456',
                'KLMN7890',
              ],
            },
          },
        },
      },
      example: {
        code: 'two_factor.regenerate_backup_codes_success',
        message: 'Đã tạo mã backup mới',
        success: true,
        data: {
          backup_codes: [
            'ABCD1234',
            'EFGH5678',
            'IJKL9012',
            'MNOP3456',
            'QRST7890',
            'UVWX1234',
            'YZAB5678',
            'CDEF9012',
            'GHIJ3456',
            'KLMN7890',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '2FA chưa được bật',
    content: {
      'application/json': {
        examples: {
          not_enabled: {
            summary: '2FA chưa được bật',
            value: {
              code: 'error.bad_request',
              message: '2FA chưa được bật',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AccessVerificationGuard)
  @Post('regenerate-backup-codes')
  @HttpCode(HttpStatus.OK)
  async regenerateBackupCodes(
    @CurrentUser() user: IJwtPayload,
    @Headers('accept-language') lang?: string,
  ) {
    const result = await this.twoFactorService.regenerateBackupCodes(
      user.userId,
      lang || 'vi',
    );
    return new OkResponse(
      ResponseCode.TWO_FACTOR_REGENERATE_BACKUP_CODES_SUCCESS,
      { backup_codes: result.backup_codes },
      result.message,
    );
  }

  // @ApiOperation({ summary: 'Lấy danh sách backup codes' })
  // @ApiResponse({ status: 200, description: 'Trả về danh sách backup codes (đã ẩn)' })
  // @ApiBearerAuth('JWT-auth')
  // @UseGuards(JwtAuthGuard, AccessVerificationGuard)
  // @Get('backup-codes')
  // async getBackupCodes(
  //     @CurrentUser() user: IJwtPayload,
  //     @Headers('accept-language') lang?: string,
  // ) {
  //     const result = await this.twoFactorService.getBackupCodes(user.userId, lang || 'vi');
  //     return new GetResponse(result, result.message);
  // }
}
