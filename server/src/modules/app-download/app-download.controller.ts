import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AppDownloadService } from './app-download.service';
import { CreateShareInviteDto, AppDownloadShareResponseDto } from './dto';
import {
  GetResponse,
  CreatedResponse,
} from '../../common/responses/success.response';
import type { Response } from 'express';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import {
  RequirePermission,
  Public,
  CurrentActor,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import { I18nLang, I18nService } from 'nestjs-i18n';

@ApiTags('App Download')
@ApiBearerAuth('JWT-auth')
@Controller('app-download')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AppDownloadController {
  constructor(
    private readonly service: AppDownloadService,
    private readonly i18n: I18nService,
  ) {}

  @Get('shares')
  @RequirePermission('app-download.list')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả shares',
    description:
      'Lấy danh sách tất cả các link chia sẻ tải ứng dụng đã tạo. Bao gồm thông tin về token, số lượt tải, thời hạn và danh sách lời mời email. Yêu cầu quyền `app-download.list`.',
  })
  @ApiAuthResponses()
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'app-download.list_shares' },
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Lấy danh sách chia sẻ thành công',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '550e8400-e29b-41d4-a716-446655440001',
              },
              token: { type: 'string', example: 'abc123xyz789' },
              max_download: { type: 'number', example: 5 },
              current_download: { type: 'number', example: 2 },
              is_permanent: { type: 'boolean', example: false },
              expires_at: {
                type: 'string',
                format: 'date-time',
                example: '2024-12-31T23:59:59.000Z',
              },
              is_active: { type: 'boolean', example: true },
              created_at: { type: 'string', format: 'date-time' },
              invites: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', example: 'user@example.com' },
                    sent_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getAllShares(@I18nLang() lang: string) {
    const shares = await this.service.getAllShares();
    return new GetResponse(
      'app-download.list_shares',
      shares,
      await this.i18n.translate('app-download.success.list_shares', { lang }),
    );
  }

  @Get('shares/:id')
  @RequirePermission('app-download.read')
  @ApiOperation({
    summary: 'Lấy chi tiết share theo ID',
    description:
      'Lấy thông tin chi tiết của một link chia sẻ cụ thể, bao gồm tất cả lời mời email đã gửi. Yêu cầu quyền `app-download.read`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của share (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiAuthResponses()
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'app-download.get_share' },
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Lấy chi tiết chia sẻ thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            token: { type: 'string', example: 'abc123xyz789' },
            max_download: { type: 'number', example: 5 },
            current_download: { type: 'number', example: 2 },
            is_permanent: { type: 'boolean', example: false },
            expires_at: { type: 'string', format: 'date-time' },
            is_active: { type: 'boolean', example: true },
            invites: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string' },
                  sent_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy share' })
  async getShareById(@Param('id') id: string, @I18nLang() lang: string) {
    const share = await this.service.getShareById(id);
    return new GetResponse(
      'app-download.get_share',
      share,
      await this.i18n.translate('app-download.success.get_share', { lang }),
    );
  }

  @Post('shares/invite')
  @RequirePermission('app-download.invite')
  @ApiOperation({
    summary: 'Tạo lời mời và gửi email',
    description:
      'Tạo một link chia sẻ mới với token duy nhất và gửi email lời mời tải ứng dụng đến địa chỉ email được chỉ định. Link có thể được cấu hình với giới hạn số lần tải và thời hạn sử dụng. Yêu cầu quyền `app-download.invite`.',
  })
  @ApiBody({
    type: CreateShareInviteDto,
    examples: {
      basic: {
        summary: 'Lời mời cơ bản (7 ngày, không giới hạn lượt tải)',
        value: {
          email: 'user@example.com',
        },
      },
      limited_downloads: {
        summary: 'Giới hạn 5 lượt tải, hết hạn sau 30 ngày',
        value: {
          email: 'partner@company.com',
          max_download: 5,
          expires_in_days: 30,
        },
      },
      specific_date: {
        summary: 'Hết hạn vào ngày cụ thể',
        value: {
          email: 'client@business.com',
          max_download: 3,
          expires_at: '2024-12-31T23:59:59Z',
        },
      },
      permanent: {
        summary: 'Link vĩnh viễn, không giới hạn',
        value: {
          email: 'vip@example.com',
          is_permanent: true,
          max_download: -1,
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiResponse({
    status: 201,
    description: 'Tạo lời mời thành công và đã gửi email',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'app-download.create_invite' },
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Tạo liên kết chia sẻ thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            token: { type: 'string', example: 'abc123xyz789' },
            max_download: { type: 'number', example: 5 },
            current_download: { type: 'number', example: 0 },
            is_permanent: { type: 'boolean', example: false },
            expires_at: { type: 'string', format: 'date-time' },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            invites: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string', example: 'user@example.com' },
                  sent_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  })
  async createInvite(
    @Body() dto: CreateShareInviteDto,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ) {
    const share = await this.service.createShareInvite(dto, actorId);
    return new CreatedResponse(
      'app-download.create_invite',
      share,
      await this.i18n.translate('app-download.success.share_created', { lang }),
    );
  }

  @Post('invites/:id/resend')
  @RequirePermission('app-download.resend_invite')
  @ApiOperation({
    summary: 'Gửi lại email lời mời',
    description:
      'Gửi lại email lời mời tải ứng dụng cho một share đã tồn tại. Hữu ích khi người dùng không nhận được email hoặc email bị mất. Yêu cầu quyền `app-download.resend_invite`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của share cần gửi lại email (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiAuthResponses()
  @ApiResponse({
    status: 200,
    description: 'Gửi lại email thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'app-download.resend_invite' },
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Gửi lời mời thành công' },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy share hoặc lời mời',
  })
  async resendInvite(@Param('id') id: string, @I18nLang() lang: string) {
    await this.service.resendInvite(id);
    return new GetResponse(
      'app-download.resend_invite',
      null,
      await this.i18n.translate('app-download.success.invite_sent', { lang }),
    );
  }

  @Delete('invites/:id')
  @RequirePermission('app-download.delete')
  @ApiOperation({
    summary: 'Xóa lời mời',
    description:
      'Xóa (soft delete) một lời mời tải ứng dụng. Link tải sẽ không còn hoạt động sau khi xóa. Yêu cầu quyền `app-download.delete`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của share cần xóa (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiAuthResponses()
  @ApiResponse({
    status: 200,
    description: 'Xóa lời mời thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'app-download.delete_invite' },
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Xóa lời mời thành công' },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lời mời' })
  async deleteInvite(
    @Param('id') id: string,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.deleteInvite(id, actorId);
    return new GetResponse(
      'app-download.delete_invite',
      null,
      await this.i18n.translate('app-download.success.invite_deleted', {
        lang,
      }),
    );
  }

  @Get('download/:token')
  @Public()
  @ApiOperation({
    summary: 'Tải ứng dụng với token (endpoint công khai)',
    description:
      'Endpoint công khai cho phép tải ứng dụng GenHub bằng token duy nhất. Token được cung cấp qua email lời mời. Endpoint này kiểm tra tính hợp lệ của token, giới hạn số lần tải, thời hạn và tự động theo dõi số lượt tải. Không yêu cầu xác thực JWT.',
  })
  @ApiParam({
    name: 'token',
    description: 'Token duy nhất để tải ứng dụng (được cung cấp trong email)',
    example: 'abc123xyz789',
  })
  @ApiResponse({
    status: 200,
    description:
      'Bắt đầu tải file ứng dụng. File GenHubApp.exe sẽ được tải về.',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Token không hợp lệ, link đã hết hạn, hoặc đã đạt giới hạn tải xuống',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Token không hợp lệ' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'File ứng dụng không tồn tại trên server',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Installer file not found on server.',
        },
      },
    },
  })
  async downloadApp(@Param('token') token: string, @Res() res: Response) {
    const share = await this.service.validateDownloadToken(token);
    const { filePath, fileName } = await this.service.getReleaseFileOrThrow();

    await this.service.trackDownload(share.id);

    res.download(filePath, fileName);
  }
}
