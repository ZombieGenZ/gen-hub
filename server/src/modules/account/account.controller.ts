import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
  Req,
  UseInterceptors,
  UploadedFile,
  Put,
  ParseUUIDPipe,
  Param,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiConsumes,
} from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { UpdateProfileDto, ChangePasswordDto } from '../auth/dto';
import { JwtAuthGuard, AccessVerificationGuard } from '../../common/guards';
import {
  CurrentUser,
  ApiUnauthorizedResponses,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import {
  CreatedResponse,
  OkResponse,
  GetResponse,
  UpdatedResponse,
  DeletedResponse,
  ResponseCode,
} from '../../common/responses';
import { AccountService } from './account.service';
import type { IJwtPayload } from '../../common/interfaces';
import { DeleteAccountDto } from './dto';

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

const avatarCoverUploadRequestSchema: SchemaObject = {
  type: 'object',
  required: ['file'],
  properties: {
    file: {
      type: 'string',
      format: 'binary',
      description: 'Image file to upload',
    },
  },
};

function createAvatarCoverResponseSchema(options: {
  code: string;
  message: string;
  data: NonNullable<SchemaObject['properties']>;
}): SchemaObject {
  return {
    type: 'object',
    properties: {
      code: { type: 'string', example: options.code },
      message: { type: 'string', example: options.message },
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: options.data,
      },
    },
  };
}

const uploadAvatarResponseSchema = createAvatarCoverResponseSchema({
  code: 'account.avatar.upload_success',
  message: 'Avatar uploaded successfully',
  data: {
    message: { type: 'string', example: 'Avatar uploaded successfully' },
    avatar_url: {
      type: 'string',
      format: 'uri',
      example: 'https://cdn.genhub.dev/avatars/avatar-123.webp',
    },
  },
});

const uploadCoverResponseSchema = createAvatarCoverResponseSchema({
  code: 'account.cover.upload_success',
  message: 'Cover uploaded successfully',
  data: {
    message: { type: 'string', example: 'Cover uploaded successfully' },
    cover_url: {
      type: 'string',
      format: 'uri',
      example: 'https://cdn.genhub.dev/covers/cover-123.webp',
    },
  },
});

const setAvatarDefaultResponseSchema = createAvatarCoverResponseSchema({
  code: 'account.avatar.default_success',
  message: 'Default avatar applied successfully',
  data: {
    message: { type: 'string', example: 'Default avatar applied successfully' },
    avatar_image_id: {
      type: 'string',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440000',
    },
  },
});

const setCoverDefaultResponseSchema = createAvatarCoverResponseSchema({
  code: 'account.cover.default_success',
  message: 'Default cover applied successfully',
  data: {
    message: { type: 'string', example: 'Default cover applied successfully' },
    cover_image_id: {
      type: 'string',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440001',
    },
  },
});

const selectAvatarResponseSchema = createAvatarCoverResponseSchema({
  code: 'account.avatar.select_success',
  message: 'Avatar selected successfully',
  data: {
    message: { type: 'string', example: 'Avatar selected successfully' },
    avatar_image_id: {
      type: 'string',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440000',
    },
  },
});

const selectCoverResponseSchema = createAvatarCoverResponseSchema({
  code: 'account.cover.select_success',
  message: 'Cover selected successfully',
  data: {
    message: { type: 'string', example: 'Cover selected successfully' },
    cover_image_id: {
      type: 'string',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440001',
    },
  },
});

/**
 * Account Controller
 * Quản lý thông tin tài khoản và mật khẩu
 */
@ApiTags('Account')
@Controller('account')
@ApiBearerAuth('JWT-auth')
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  private static readonly AVATAR_MAX_FILE_SIZE = parseInt(
    process.env.UPLOAD_AVATAR_MAX_SIZE || '2097152',
    10,
  );

  private static readonly AVATAR_ALLOWED_MIME_TYPES = (
    process.env.UPLOAD_AVATAR_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp'
  ).split(',');

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
        data: {
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
      },
      example: {
        code: 'account.update_profile_success',
        message: 'Cập nhật thông tin tài khoản thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Nguyễn Văn B',
          email: 'user@example.com',
          email_confirmed: true,
          is_verified: true,
          two_factor_enabled: false,
          language: 'en',
          created_at: '2026-01-01T00:00:00.000Z',
        },
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
      result.user,
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

  @ApiOperation({
    summary: 'Tải xuống dữ liệu cá nhân',
    description:
      'Tải xuống toàn bộ dữ liệu cá nhân của tài khoản dưới dạng JSON. Yêu cầu xác thực quyền truy cập thông qua header X-Access-Verification-Token.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi, en)',
    required: false,
    example: 'vi',
  })
  @ApiHeader({
    name: 'X-Access-Verification-Token',
    description: 'Token xác thực quyền truy cập (lấy từ API verify-access)',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về dữ liệu cá nhân dạng JSON',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'account.download_data_success' },
        message: { type: 'string', example: 'Tải dữ liệu thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Toàn bộ dữ liệu cá nhân',
              example: {
                personal_info: {
                  id: '550e8400-e29b-41d4-a716-446655440000',
                  name: 'Nguyễn Văn A',
                  email: 'user@example.com',
                  email_confirmed: true,
                  language: 'vi',
                  is_verified: true,
                  two_factor_enabled: true,
                  created_at: '2025-01-01T00:00:00.000Z',
                  updated_at: '2026-01-01T00:00:00.000Z',
                },
                account_status: {
                  is_banned: false,
                  banned_start: null,
                  banned_end: null,
                  is_online: true,
                  last_online: '2026-01-21T10:00:00.000Z',
                },
                system_roles: [
                  {
                    id: '550e8400-e29b-41d4-a716-446655440001',
                    name: 'User',
                    description: 'Người dùng cơ bản',
                    assigned_at: '2025-01-01T00:00:00.000Z',
                  },
                ],
                system_permissions: [],
                organizations: {
                  owned: [
                    {
                      id: '550e8400-e29b-41d4-a716-446655440005',
                      name: 'My Team',
                      created_at: '2025-01-10T00:00:00.000Z',
                    },
                  ],
                  memberships: [],
                },
                notifications: [
                  {
                    id: '550e8400-e29b-41d4-a716-446655440099',
                    title: 'Chào mừng thành viên mới',
                    content: 'Cảm ơn bạn đã tham gia GEN-HUB',
                    is_read: true,
                    created_at: '2025-01-01T00:00:00.000Z',
                  },
                ],
                warnings: [],
                sessions: [
                  {
                    id: '550e8400-e29b-41d4-a716-446655440088',
                    ip: '127.0.0.1',
                    location: 'Unknown',
                    device: 'Chrome',
                    os: 'Windows 10',
                    created_at: '2026-01-21T09:00:00.000Z',
                  },
                ],
                export_info: {
                  exported_at: '2026-01-21T12:00:00.000Z',
                  data_version: '1.0',
                },
              },
            },
            filename: {
              type: 'string',
              example: 'user-data-uuid-2026-01-21.json',
            },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @UseGuards(JwtAuthGuard, AccessVerificationGuard)
  @Get('download-data')
  async downloadPersonalData(
    @CurrentUser() user: IJwtPayload,
    @Req() req: Request,
    @Headers('accept-language') lang?: string,
  ) {
    const deviceInfo = getDeviceInfo(req);
    const result = await this.accountService.downloadPersonalData(
      user.userId,
      deviceInfo,
      lang || 'vi',
    );
    return new GetResponse(
      ResponseCode.ACCOUNT_DOWNLOAD_DATA_SUCCESS,
      { data: result.data, filename: result.filename },
      result.message,
    );
  }

  @ApiOperation({
    summary: 'Xóa tài khoản',
    description:
      'Xóa tài khoản người dùng (soft delete). Yêu cầu xác thực quyền truy cập thông qua header X-Access-Verification-Token và nhập xác nhận "XÓA TÀI KHOẢN" hoặc "DELETE ACCOUNT".',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi, en)',
    required: false,
    example: 'vi',
  })
  @ApiHeader({
    name: 'X-Access-Verification-Token',
    description: 'Token xác thực quyền truy cập (lấy từ API verify-access)',
    required: true,
  })
  @ApiBody({
    type: DeleteAccountDto,
    description: 'Dữ liệu xóa tài khoản',
    examples: {
      delete_vi: {
        summary: 'Xóa tài khoản (Tiếng Việt)',
        value: {
          confirmation: 'XÓA TÀI KHOẢN',
          reason: 'Không còn sử dụng dịch vụ',
        },
      },
      delete_en: {
        summary: 'Xóa tài khoản (English)',
        value: {
          confirmation: 'DELETE ACCOUNT',
          reason: 'No longer using the service',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa tài khoản thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'account.delete_account_success' },
        message: { type: 'string', example: 'Xóa tài khoản thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @UseGuards(JwtAuthGuard, AccessVerificationGuard)
  @Delete('delete-account')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentUser() user: IJwtPayload,
    @Body() dto: DeleteAccountDto,
    @Req() req: Request,
    @Headers('accept-language') lang?: string,
  ) {
    const deviceInfo = getDeviceInfo(req);
    const result = await this.accountService.deleteAccount(
      user.userId,
      dto.confirmation,
      dto.reason,
      deviceInfo,
      lang || 'vi',
    );
    return new DeletedResponse(
      ResponseCode.ACCOUNT_DELETE_ACCOUNT_SUCCESS,
      null,
      result.message,
    );
  }

  @ApiOperation({ summary: 'Upload avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Avatar upload payload',
    schema: avatarCoverUploadRequestSchema,
  })
  @ApiResponse({
    status: 201,
    description: 'Upload avatar thành công',
    schema: uploadAvatarResponseSchema,
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: AccountController.AVATAR_MAX_FILE_SIZE },
      fileFilter: (req, file, cb) => {
        if (AccountController.AVATAR_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
          return;
        }
        cb(new BadRequestException('Invalid file type'), false);
      },
    }),
  )
  @Post('avatar/upload')
  async uploadAvatar(
    @CurrentUser() user: IJwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Headers('accept-language') lang?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.accountService.uploadAvatar(
      user.userId,
      file,
      lang || 'vi',
    );

    return new CreatedResponse('account.avatar.upload_success', result, result.message);
  }

  @ApiOperation({ summary: 'Upload cover' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Cover upload payload',
    schema: avatarCoverUploadRequestSchema,
  })
  @ApiResponse({
    status: 201,
    description: 'Upload cover thành công',
    schema: uploadCoverResponseSchema,
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: AccountController.AVATAR_MAX_FILE_SIZE },
      fileFilter: (req, file, cb) => {
        if (AccountController.AVATAR_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
          return;
        }
        cb(new BadRequestException('Invalid file type'), false);
      },
    }),
  )
  @Post('cover/upload')
  async uploadCover(
    @CurrentUser() user: IJwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Headers('accept-language') lang?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.accountService.uploadCover(
      user.userId,
      file,
      lang || 'vi',
    );

    return new CreatedResponse('account.cover.upload_success', result, result.message);
  }

  @ApiOperation({ summary: 'Set avatar default system image' })
  @ApiResponse({
    status: 200,
    description: 'Đặt avatar mặc định thành công',
    schema: setAvatarDefaultResponseSchema,
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Put('avatar/default')
  async setAvatarDefault(
    @CurrentUser() user: IJwtPayload,
    @Headers('accept-language') lang?: string,
  ) {
    const result = await this.accountService.setAvatarDefault(user.userId, lang || 'vi');
    return new UpdatedResponse('account.avatar.default_success', result, result.message);
  }

  @ApiOperation({ summary: 'Set cover default system image' })
  @ApiResponse({
    status: 200,
    description: 'Đặt cover mặc định thành công',
    schema: setCoverDefaultResponseSchema,
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Put('cover/default')
  async setCoverDefault(
    @CurrentUser() user: IJwtPayload,
    @Headers('accept-language') lang?: string,
  ) {
    const result = await this.accountService.setCoverDefault(user.userId, lang || 'vi');
    return new UpdatedResponse('account.cover.default_success', result, result.message);
  }

  @ApiOperation({ summary: 'Select avatar image from defaults' })
  @ApiResponse({
    status: 200,
    description: 'Chọn avatar mặc định thành công',
    schema: selectAvatarResponseSchema,
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Put('avatar/select/:id')
  async selectAvatar(
    @CurrentUser() user: IJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('accept-language') lang?: string,
  ) {
    const result = await this.accountService.selectAvatarImage(user.userId, id, lang || 'vi');
    return new UpdatedResponse('account.avatar.select_success', result, result.message);
  }

  @ApiOperation({ summary: 'Select cover image from defaults' })
  @ApiResponse({
    status: 200,
    description: 'Chọn cover mặc định thành công',
    schema: selectCoverResponseSchema,
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Put('cover/select/:id')
  async selectCover(
    @CurrentUser() user: IJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('accept-language') lang?: string,
  ) {
    const result = await this.accountService.selectCoverImage(user.userId, id, lang || 'vi');
    return new UpdatedResponse('account.cover.select_success', result, result.message);
  }
}
