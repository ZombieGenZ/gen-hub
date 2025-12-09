import {
  Controller,
  Post,
  Get,
  Patch,
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
import { UpdateProfileDto, ChangePasswordDto } from '../auth/dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import {
  OkResponse,
  GetResponse,
  UpdatedResponse,
} from '../../common/responses';
import { AccountService } from './account.service';

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
 * Account Controller
 * Quản lý thông tin tài khoản và mật khẩu
 */
@ApiTags('Account')
@Controller('account')
@ApiBearerAuth('JWT-auth')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @ApiOperation({ summary: 'Lấy thông tin tài khoản' })
  @ApiResponse({
    status: 200,
    description: 'Trả về thông tin user, roles và permissions',
  })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(
    @CurrentUser() user: IJwtPayload,
    @Headers('accept-language') lang?: string,
  ) {
    const result = await this.accountService.getProfile(
      user.userId,
      lang || 'vi',
    );
    return new GetResponse(
      {
        user: result.user,
        roles: result.roles,
        permissions: result.permissions,
      },
      result.message,
    );
  }

  @ApiOperation({ summary: 'Cập nhật thông tin tài khoản (name, language)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: IJwtPayload,
    @Body() dto: UpdateProfileDto,
    @Headers('accept-language') lang?: string,
  ) {
    const result = await this.accountService.updateProfile(
      user.userId,
      dto,
      lang || 'vi',
    );
    return new UpdatedResponse(null, result.message);
  }

  @ApiOperation({ summary: 'Thay đổi mật khẩu' })
  @ApiResponse({ status: 200, description: 'Thay đổi mật khẩu thành công' })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: IJwtPayload,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Headers('accept-language') lang?: string,
  ) {
    const deviceInfo = getDeviceInfo(req);
    const result = await this.accountService.changePassword(
      user.userId,
      dto,
      deviceInfo,
      lang || 'vi',
    );
    return new OkResponse(null, result.message);
  }
}
