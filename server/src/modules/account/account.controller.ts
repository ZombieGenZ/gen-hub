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
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { UpdateProfileDto, ChangePasswordDto } from '../auth/dto';
import { JwtAuthGuard } from '../../common/guards';
import {
  CurrentUser,
  ApiUnauthorizedResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import {
  OkResponse,
  GetResponse,
  UpdatedResponse,
  ResponseCode,
} from '../../common/responses';
import { AccountService } from './account.service';
import type { IJwtPayload } from '../../common/interfaces';

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

  @ApiOperation({
    summary: 'Lấy thông tin tài khoản',
    description:
      'Lấy thông tin chi tiết tài khoản đang đăng nhập bao gồm thông tin cá nhân, danh sách roles được gán và tất cả permissions (từ roles và được gán trực tiếp).',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi, en)',
    required: false,
    example: 'vi',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về thông tin user, roles và permissions',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'account.get_profile_success' },
        message: {
          type: 'string',
          example: 'Lấy thông tin tài khoản thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              description: 'Thông tin người dùng',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  example: '550e8400-e29b-41d4-a716-446655440000',
                },
                name: { type: 'string', example: 'Nguyễn Văn A' },
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'user@example.com',
                },
                email_confirmed: { type: 'boolean', example: true },
                is_verified: { type: 'boolean', example: true },
                two_factor_enabled: { type: 'boolean', example: false },
                language: { type: 'string', example: 'vi' },
                created_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-01-01T00:00:00.000Z',
                },
              },
            },
            roles: {
              type: 'array',
              description: 'Danh sách roles được gán',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    example: '550e8400-e29b-41d4-a716-446655440001',
                  },
                  name: { type: 'string', example: 'Admin' },
                  description: {
                    type: 'string',
                    example: 'Quản trị viên hệ thống',
                  },
                },
              },
            },
            permissions: {
              type: 'array',
              description: 'Danh sách permissions (từ roles và gán trực tiếp)',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    example: '550e8400-e29b-41d4-a716-446655440002',
                  },
                  name: { type: 'string', example: 'Quản lý người dùng' },
                  key: { type: 'string', example: 'user.manage' },
                  description: {
                    type: 'string',
                    example: 'Quyền quản lý người dùng',
                  },
                  source: {
                    type: 'string',
                    enum: ['role', 'permission'],
                    example: 'role',
                  },
                  roles: {
                    type: 'array',
                    description:
                      'Danh sách roles chứa permission này (chỉ có khi source = role)',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      example: {
        code: 'account.get_profile_success',
        message: 'Lấy thông tin tài khoản thành công',
        success: true,
        data: {
          user: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Nguyễn Văn A',
            email: 'user@example.com',
            email_confirmed: true,
            is_verified: true,
            two_factor_enabled: false,
            language: 'vi',
            created_at: '2026-01-01T00:00:00.000Z',
          },
          roles: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              name: 'Admin',
              description: 'Quản trị viên hệ thống',
            },
          ],
          permissions: [
            {
              id: '550e8400-e29b-41d4-a716-446655440002',
              name: 'Quản lý người dùng',
              key: 'user.manage',
              description: 'Quyền quản lý người dùng',
              source: 'role',
              roles: [
                { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Admin' },
              ],
            },
          ],
        },
      },
    },
  })
  @ApiUnauthorizedResponses()
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
      ResponseCode.ACCOUNT_GET_PROFILE_SUCCESS,
      {
        user: result.user,
        roles: result.roles,
        permissions: result.permissions,
      },
      result.message,
    );
  }

  @ApiOperation({
    summary: 'Cập nhật thông tin tài khoản',
    description:
      'Cập nhật một phần thông tin tài khoản (name, language). Chỉ các trường được gửi trong request body mới được cập nhật.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi, en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: UpdateProfileDto,
    description: 'Dữ liệu cần cập nhật (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_name: {
        summary: 'Cập nhật tên',
        description: 'Ví dụ chỉ cập nhật tên người dùng',
        value: {
          name: 'Nguyễn Văn B',
        },
      },
      update_language: {
        summary: 'Cập nhật ngôn ngữ',
        description: 'Ví dụ thay đổi ngôn ngữ hiển thị',
        value: {
          language: 'en',
        },
      },
      update_full: {
        summary: 'Cập nhật tất cả',
        description: 'Ví dụ cập nhật cả tên và ngôn ngữ',
        value: {
          name: 'Nguyễn Văn B',
          language: 'en',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'account.update_profile_success' },
        message: {
          type: 'string',
          example: 'Cập nhật thông tin tài khoản thành công',
        },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
      example: {
        code: 'account.update_profile_success',
        message: 'Cập nhật thông tin tài khoản thành công',
        success: true,
        data: null,
      },
    },
  })
  @ApiUnauthorizedResponses()
  @ApiValidationErrorResponse()
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
    return new UpdatedResponse(
      ResponseCode.ACCOUNT_UPDATE_PROFILE_SUCCESS,
      null,
      result.message,
    );
  }

  @ApiOperation({
    summary: 'Thay đổi mật khẩu',
    description:
      'Thay đổi mật khẩu tài khoản. Yêu cầu nhập mật khẩu hiện tại để xác thực. Có thể chọn đăng xuất tất cả thiết bị khác sau khi đổi mật khẩu.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi, en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: 'Dữ liệu thay đổi mật khẩu',
    examples: {
      change_password: {
        summary: 'Đổi mật khẩu',
        description: 'Ví dụ đổi mật khẩu cơ bản',
        value: {
          current_password: 'Password@123',
          new_password: 'NewPassword@456',
          confirm_password: 'NewPassword@456',
        },
      },
      change_password_logout_all: {
        summary: 'Đổi mật khẩu và đăng xuất tất cả thiết bị',
        description:
          'Đổi mật khẩu và đăng xuất tất cả các phiên đăng nhập khác',
        value: {
          current_password: 'Password@123',
          new_password: 'NewPassword@456',
          confirm_password: 'NewPassword@456',
          logout_all_devices: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thay đổi mật khẩu thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'account.change_password_success' },
        message: { type: 'string', example: 'Thay đổi mật khẩu thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
      example: {
        code: 'account.change_password_success',
        message: 'Thay đổi mật khẩu thành công',
        success: true,
        data: null,
      },
    },
  })
  @ApiUnauthorizedResponses()
  @ApiValidationErrorResponse()
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
    return new OkResponse(
      ResponseCode.ACCOUNT_CHANGE_PASSWORD_SUCCESS,
      null,
      result.message,
    );
  }
}
