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
} from '@nestjs/swagger';
import type { Request } from 'express';

import { VerifyTwoFactorSetupDto, VerifyTwoFactorLoginDto } from '../auth/dto';
import { JwtAuthGuard, AccessVerificationGuard } from '../../common/guards';
import { Public, CurrentUser } from '../../common/decorators';
import { OkResponse, GetResponse } from '../../common/responses';
import { TwoFactorService } from './two-factor.service';

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
 * Two-Factor Controller
 * Quản lý xác thực 2 yếu tố (2FA)
 */
@ApiTags('Two-Factor Authentication')
@Controller('2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @ApiOperation({ summary: 'Thiết lập xác thực 2 yếu tố (2FA)' })
  @ApiResponse({
    status: 200,
    description: 'Trả về secret, QR code và backup codes',
  })
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
    return new OkResponse(null, result.message);
  }

  @ApiOperation({ summary: 'Tắt xác thực 2 yếu tố (2FA)' })
  @ApiResponse({ status: 200, description: 'Tắt 2FA thành công' })
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
    return new OkResponse(null, result.message);
  }

  @ApiOperation({ summary: 'Xác minh 2FA khi đăng nhập' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
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
    return new OkResponse(result.user, result.message, {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
  }

  @ApiOperation({ summary: 'Tạo mới backup codes' })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách backup codes mới',
  })
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
