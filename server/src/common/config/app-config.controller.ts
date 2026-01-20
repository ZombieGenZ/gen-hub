import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AppConfigService } from './app-config.service';
import type { IAppConfig } from './app-config.service';
import { UpdateAppConfigDto } from './app-config.dto';
import { Public, RequirePermission } from '../decorators';
import { JwtAuthGuard, PermissionGuard } from '../guards';
import { WebsocketGateway } from '../../modules/websocket/websocket.gateway';

@ApiTags('Config')
@Controller('config')
export class AppConfigController {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly websocketGateway: WebsocketGateway,
  ) { }

  @ApiOperation({
    summary: 'Lấy cấu hình ứng dụng',
    description: 'API công khai để lấy toàn bộ cấu hình ứng dụng bao gồm thông tin thương hiệu, bảng màu giao diện và cấu hình phân trang. Không yêu cầu xác thực.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về toàn bộ cấu hình ứng dụng hiện tại',
    schema: {
      type: 'object',
      properties: {
        brandName: { type: 'string', description: 'Tên thương hiệu ứng dụng', example: 'GEN-HUB' },
        supportEmail: { type: 'string', description: 'Địa chỉ email hỗ trợ khách hàng', example: 'support@gen-hub.dev' },
        supportPhone: { type: 'string', description: 'Số điện thoại hỗ trợ khách hàng', example: '0783 504 540' },
        colors: {
          type: 'object',
          description: 'Bảng màu giao diện của ứng dụng',
          properties: {
            primary: { type: 'string', description: 'Màu chính', example: '#0F766E' },
            primaryLight: { type: 'string', description: 'Màu chính sáng', example: '#14B8A6' },
            primaryDark: { type: 'string', description: 'Màu chính tối', example: '#0D5A52' },
            gray900: { type: 'string', description: 'Màu xám 900', example: '#1E293B' },
            gray700: { type: 'string', description: 'Màu xám 700', example: '#334155' },
            gray500: { type: 'string', description: 'Màu xám 500', example: '#64748B' },
            gray300: { type: 'string', description: 'Màu xám 300', example: '#CBD5E1' },
            gray100: { type: 'string', description: 'Màu xám 100', example: '#F1F5F9' },
            background: { type: 'string', description: 'Màu nền trang', example: '#F8FAFC' },
            cardSurface: { type: 'string', description: 'Màu bề mặt card', example: '#FFFFFF' },
            sidebarBg: { type: 'string', description: 'Màu nền sidebar', example: '#F1F5F9' },
            success: { type: 'string', description: 'Màu thành công', example: '#10B981' },
            warning: { type: 'string', description: 'Màu cảnh báo', example: '#F59E0B' },
            error: { type: 'string', description: 'Màu lỗi', example: '#EF4444' },
            info: { type: 'string', description: 'Màu thông tin', example: '#0EA5E9' },
            border: { type: 'string', description: 'Màu viền', example: '#E2E8F0' },
            shadow: { type: 'string', description: 'Màu bóng đổ', example: 'rgba(0, 0, 0, 0.04)' },
          },
        },
        pagination: {
          type: 'object',
          description: 'Cấu hình phân trang mặc định',
          properties: {
            defaultLimit: { type: 'number', description: 'Số lượng item mặc định mỗi trang', example: 10 },
            defaultOffset: { type: 'number', description: 'Vị trí bắt đầu mặc định', example: 0 },
            maxLimit: { type: 'number', description: 'Số lượng item tối đa mỗi trang', example: 100 },
            minLimit: { type: 'number', description: 'Số lượng item tối thiểu mỗi trang', example: 1 },
          },
        },
        enableAiAutoReply: { type: 'boolean', description: 'Trạng thái bật/tắt AI tự động phản hồi', example: true },
      },
      example: {
        brandName: 'GEN-HUB',
        supportEmail: 'support@gen-hub.dev',
        supportPhone: '0783 504 540',
        colors: {
          primary: '#0F766E',
          primaryLight: '#14B8A6',
          primaryDark: '#0D5A52',
          gray900: '#1E293B',
          gray700: '#334155',
          gray500: '#64748B',
          gray300: '#CBD5E1',
          gray100: '#F1F5F9',
          background: '#F8FAFC',
          cardSurface: '#FFFFFF',
          sidebarBg: '#F1F5F9',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#0EA5E9',
          border: '#E2E8F0',
          shadow: 'rgba(0, 0, 0, 0.04)',
        },
        pagination: {
          defaultLimit: 10,
          defaultOffset: 0,
          maxLimit: 100,
          minLimit: 1,
        },
        enableAiAutoReply: true,
      },
    },
  })
  @Public()
  @Get()
  getConfig(): IAppConfig {
    return this.appConfigService.getAll();
  }

  @ApiOperation({
    summary: 'Cập nhật cấu hình ứng dụng',
    description: 'Cập nhật một phần hoặc toàn bộ cấu hình ứng dụng. Chỉ các trường được gửi trong request body mới được cập nhật, các trường khác giữ nguyên. Yêu cầu quyền `config.update`.',
  })
  @ApiBody({
    type: UpdateAppConfigDto,
    description: 'Dữ liệu cấu hình cần cập nhật (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_brand: {
        summary: 'Cập nhật thông tin thương hiệu',
        description: 'Ví dụ cập nhật tên thương hiệu và thông tin hỗ trợ',
        value: {
          brandName: 'GEN-HUB Pro',
          supportEmail: 'support@gen-hub.dev',
          supportPhone: '0783 504 540',
        },
      },
      update_colors: {
        summary: 'Cập nhật bảng màu',
        description: 'Ví dụ cập nhật màu chính và màu accent',
        value: {
          colors: {
            primary: '#6366F1',
            primaryLight: '#818CF8',
            primaryDark: '#4F46E5',
            success: '#22C55E',
            warning: '#EAB308',
            error: '#DC2626',
            info: '#3B82F6',
          },
        },
      },
      update_pagination: {
        summary: 'Cập nhật cấu hình phân trang',
        description: 'Ví dụ cập nhật cấu hình phân trang mặc định',
        value: {
          pagination: {
            defaultLimit: 20,
            maxLimit: 200,
            minLimit: 5,
          },
        },
      },
      update_ai_reply: {
        summary: 'Bật/tắt AI tự động phản hồi',
        description: 'Ví dụ bật AI tự động phản hồi',
        value: {
          enableAiAutoReply: true,
        },
      },
      update_full: {
        summary: 'Cập nhật toàn bộ cấu hình',
        description: 'Ví dụ cập nhật tất cả các trường cấu hình',
        value: {
          brandName: 'GEN-HUB Pro',
          supportEmail: 'support@gen-hub.dev',
          supportPhone: '0783 504 540',
          colors: {
            primary: '#0F766E',
            primaryLight: '#14B8A6',
            primaryDark: '#0D5A52',
            gray900: '#1E293B',
            gray700: '#334155',
            gray500: '#64748B',
            gray300: '#CBD5E1',
            gray100: '#F1F5F9',
            background: '#F8FAFC',
            cardSurface: '#FFFFFF',
            sidebarBg: '#F1F5F9',
            success: '#10B981',
            warning: '#F59E0B',
            error: '#EF4444',
            info: '#0EA5E9',
            border: '#E2E8F0',
            shadow: 'rgba(0, 0, 0, 0.04)',
          },
          pagination: {
            defaultLimit: 10,
            defaultOffset: 0,
            maxLimit: 100,
            minLimit: 1,
          },
          enableAiAutoReply: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về toàn bộ cấu hình sau khi cập nhật thành công',
    schema: {
      type: 'object',
      properties: {
        brandName: { type: 'string', description: 'Tên thương hiệu', example: 'GEN-HUB' },
        supportEmail: { type: 'string', description: 'Email hỗ trợ', example: 'support@gen-hub.dev' },
        supportPhone: { type: 'string', description: 'Số điện thoại hỗ trợ', example: '0783 504 540' },
        colors: {
          type: 'object',
          description: 'Bảng màu giao diện',
          properties: {
            primary: { type: 'string', description: 'Màu chính', example: '#0F766E' },
            primaryLight: { type: 'string', description: 'Màu chính sáng', example: '#14B8A6' },
            primaryDark: { type: 'string', description: 'Màu chính tối', example: '#0D5A52' },
            gray900: { type: 'string', description: 'Màu xám 900', example: '#1E293B' },
            gray700: { type: 'string', description: 'Màu xám 700', example: '#334155' },
            gray500: { type: 'string', description: 'Màu xám 500', example: '#64748B' },
            gray300: { type: 'string', description: 'Màu xám 300', example: '#CBD5E1' },
            gray100: { type: 'string', description: 'Màu xám 100', example: '#F1F5F9' },
            background: { type: 'string', description: 'Màu nền trang', example: '#F8FAFC' },
            cardSurface: { type: 'string', description: 'Màu bề mặt card', example: '#FFFFFF' },
            sidebarBg: { type: 'string', description: 'Màu nền sidebar', example: '#F1F5F9' },
            success: { type: 'string', description: 'Màu thành công', example: '#10B981' },
            warning: { type: 'string', description: 'Màu cảnh báo', example: '#F59E0B' },
            error: { type: 'string', description: 'Màu lỗi', example: '#EF4444' },
            info: { type: 'string', description: 'Màu thông tin', example: '#0EA5E9' },
            border: { type: 'string', description: 'Màu viền', example: '#E2E8F0' },
            shadow: { type: 'string', description: 'Màu bóng đổ', example: 'rgba(0, 0, 0, 0.04)' },
          },
        },
        pagination: {
          type: 'object',
          description: 'Cấu hình phân trang',
          properties: {
            defaultLimit: { type: 'number', description: 'Số lượng item mặc định mỗi trang', example: 10 },
            defaultOffset: { type: 'number', description: 'Vị trí bắt đầu mặc định', example: 0 },
            maxLimit: { type: 'number', description: 'Số lượng item tối đa mỗi trang', example: 100 },
            minLimit: { type: 'number', description: 'Số lượng item tối thiểu mỗi trang', example: 1 },
          },
        },
        enableAiAutoReply: { type: 'boolean', description: 'Trạng thái bật/tắt AI tự động phản hồi', example: true },
      },
      example: {
        brandName: 'GEN-HUB',
        supportEmail: 'support@gen-hub.dev',
        supportPhone: '0783 504 540',
        colors: {
          primary: '#0F766E',
          primaryLight: '#14B8A6',
          primaryDark: '#0D5A52',
          gray900: '#1E293B',
          gray700: '#334155',
          gray500: '#64748B',
          gray300: '#CBD5E1',
          gray100: '#F1F5F9',
          background: '#F8FAFC',
          cardSurface: '#FFFFFF',
          sidebarBg: '#F1F5F9',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#0EA5E9',
          border: '#E2E8F0',
          shadow: 'rgba(0, 0, 0, 0.04)',
        },
        pagination: {
          defaultLimit: 10,
          defaultOffset: 0,
          maxLimit: 100,
          minLimit: 1,
        },
        enableAiAutoReply: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Chưa xác thực hoặc token không hợp lệ',
    content: {
      'application/json': {
        examples: {
          token_missing: {
            summary: 'Không có token',
            value: {
              statusCode: 401,
              message: 'Không có quyền truy cập',
              error: 'Unauthorized',
            },
          },
          token_expired: {
            summary: 'Token hết hạn',
            value: {
              statusCode: 401,
              message: 'Token đã hết hạn',
              error: 'Unauthorized',
            },
          },
          token_invalid: {
            summary: 'Token không hợp lệ',
            value: {
              statusCode: 401,
              message: 'Token không hợp lệ',
              error: 'Unauthorized',
            },
          },
          token_malformed: {
            summary: 'Token không đúng định dạng',
            value: {
              statusCode: 401,
              message: 'Token không đúng định dạng',
              error: 'Unauthorized',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền truy cập',
    content: {
      'application/json': {
        examples: {
          no_permission: {
            summary: 'Không có quyền thực hiện',
            value: {
              statusCode: 403,
              message: 'Không có quyền thực hiện thao tác này',
              error: 'Forbidden',
            },
          },
          account_banned: {
            summary: 'Tài khoản bị khóa',
            value: {
              statusCode: 403,
              message: 'Tài khoản đã bị khóa',
              error: 'Forbidden',
            },
          },
          account_not_verified: {
            summary: 'Tài khoản chưa xác minh',
            value: {
              statusCode: 403,
              message: 'Tài khoản chưa được xác minh. Vui lòng xác minh email để tiếp tục.',
              error: 'Forbidden',
            },
          },
          account_not_found: {
            summary: 'Tài khoản không tồn tại',
            value: {
              statusCode: 403,
              message: 'Tài khoản không tồn tại',
              error: 'Forbidden',
            },
          },
        },
      },
    },
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('config.update')
  @Patch()
  async updateConfig(@Body() dto: UpdateAppConfigDto, @Request() req: any): Promise<IAppConfig> {
    const result = await this.appConfigService.update(dto as Partial<IAppConfig>);
    this.websocketGateway.emitConfigUpdated('updated', req.user?.userId);
    return result;
  }

  @ApiOperation({
    summary: 'Reset cấu hình về mặc định',
    description: 'Khôi phục toàn bộ cấu hình ứng dụng về giá trị mặc định được định nghĩa trong biến môi trường (.env). Thao tác này sẽ ghi đè tất cả các tùy chỉnh hiện tại. Yêu cầu quyền `config.reset`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về toàn bộ cấu hình sau khi reset về giá trị mặc định',
    schema: {
      type: 'object',
      properties: {
        brandName: { type: 'string', description: 'Tên thương hiệu', example: 'GEN-HUB' },
        supportEmail: { type: 'string', description: 'Email hỗ trợ', example: 'support@gen-hub.dev' },
        supportPhone: { type: 'string', description: 'Số điện thoại hỗ trợ', example: '0783 504 540' },
        colors: {
          type: 'object',
          description: 'Bảng màu giao diện',
          properties: {
            primary: { type: 'string', description: 'Màu chính', example: '#0F766E' },
            primaryLight: { type: 'string', description: 'Màu chính sáng', example: '#14B8A6' },
            primaryDark: { type: 'string', description: 'Màu chính tối', example: '#0D5A52' },
            gray900: { type: 'string', description: 'Màu xám 900', example: '#1E293B' },
            gray700: { type: 'string', description: 'Màu xám 700', example: '#334155' },
            gray500: { type: 'string', description: 'Màu xám 500', example: '#64748B' },
            gray300: { type: 'string', description: 'Màu xám 300', example: '#CBD5E1' },
            gray100: { type: 'string', description: 'Màu xám 100', example: '#F1F5F9' },
            background: { type: 'string', description: 'Màu nền trang', example: '#F8FAFC' },
            cardSurface: { type: 'string', description: 'Màu bề mặt card', example: '#FFFFFF' },
            sidebarBg: { type: 'string', description: 'Màu nền sidebar', example: '#F1F5F9' },
            success: { type: 'string', description: 'Màu thành công', example: '#10B981' },
            warning: { type: 'string', description: 'Màu cảnh báo', example: '#F59E0B' },
            error: { type: 'string', description: 'Màu lỗi', example: '#EF4444' },
            info: { type: 'string', description: 'Màu thông tin', example: '#0EA5E9' },
            border: { type: 'string', description: 'Màu viền', example: '#E2E8F0' },
            shadow: { type: 'string', description: 'Màu bóng đổ', example: 'rgba(0, 0, 0, 0.04)' },
          },
        },
        pagination: {
          type: 'object',
          description: 'Cấu hình phân trang',
          properties: {
            defaultLimit: { type: 'number', description: 'Số lượng item mặc định mỗi trang', example: 10 },
            defaultOffset: { type: 'number', description: 'Vị trí bắt đầu mặc định', example: 0 },
            maxLimit: { type: 'number', description: 'Số lượng item tối đa mỗi trang', example: 100 },
            minLimit: { type: 'number', description: 'Số lượng item tối thiểu mỗi trang', example: 1 },
          },
        },
        enableAiAutoReply: { type: 'boolean', description: 'Trạng thái bật/tắt AI tự động phản hồi', example: true },
      },
      example: {
        brandName: 'GEN-HUB',
        supportEmail: 'support@gen-hub.dev',
        supportPhone: '0783 504 540',
        colors: {
          primary: '#0F766E',
          primaryLight: '#14B8A6',
          primaryDark: '#0D5A52',
          gray900: '#1E293B',
          gray700: '#334155',
          gray500: '#64748B',
          gray300: '#CBD5E1',
          gray100: '#F1F5F9',
          background: '#F8FAFC',
          cardSurface: '#FFFFFF',
          sidebarBg: '#F1F5F9',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#0EA5E9',
          border: '#E2E8F0',
          shadow: 'rgba(0, 0, 0, 0.04)',
        },
        pagination: {
          defaultLimit: 10,
          defaultOffset: 0,
          maxLimit: 100,
          minLimit: 1,
        },
        enableAiAutoReply: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Chưa xác thực hoặc token không hợp lệ',
    content: {
      'application/json': {
        examples: {
          token_missing: {
            summary: 'Không có token',
            value: {
              statusCode: 401,
              message: 'Không có quyền truy cập',
              error: 'Unauthorized',
            },
          },
          token_expired: {
            summary: 'Token hết hạn',
            value: {
              statusCode: 401,
              message: 'Token đã hết hạn',
              error: 'Unauthorized',
            },
          },
          token_invalid: {
            summary: 'Token không hợp lệ',
            value: {
              statusCode: 401,
              message: 'Token không hợp lệ',
              error: 'Unauthorized',
            },
          },
          token_malformed: {
            summary: 'Token không đúng định dạng',
            value: {
              statusCode: 401,
              message: 'Token không đúng định dạng',
              error: 'Unauthorized',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền truy cập',
    content: {
      'application/json': {
        examples: {
          no_permission: {
            summary: 'Không có quyền thực hiện',
            value: {
              statusCode: 403,
              message: 'Không có quyền thực hiện thao tác này',
              error: 'Forbidden',
            },
          },
          account_banned: {
            summary: 'Tài khoản bị khóa',
            value: {
              statusCode: 403,
              message: 'Tài khoản đã bị khóa',
              error: 'Forbidden',
            },
          },
          account_not_verified: {
            summary: 'Tài khoản chưa xác minh',
            value: {
              statusCode: 403,
              message: 'Tài khoản chưa được xác minh. Vui lòng xác minh email để tiếp tục.',
              error: 'Forbidden',
            },
          },
          account_not_found: {
            summary: 'Tài khoản không tồn tại',
            value: {
              statusCode: 403,
              message: 'Tài khoản không tồn tại',
              error: 'Forbidden',
            },
          },
        },
      },
    },
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('config.reset')
  @Post('reset')
  async resetConfig(@Request() req: any): Promise<IAppConfig> {
    const result = await this.appConfigService.reset();
    this.websocketGateway.emitConfigUpdated('reset', req.user?.userId);
    return result;
  }

  @ApiOperation({
    summary: 'Reload cấu hình từ file',
    description: 'Đọc lại cấu hình từ file `app-config.json` trên server và cập nhật vào bộ nhớ. Hữu ích khi cần đồng bộ cấu hình sau khi chỉnh sửa file trực tiếp trên server. Thao tác này sẽ invalidate Redis cache và force reload từ file. Yêu cầu quyền `config.reload`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về toàn bộ cấu hình sau khi reload từ file',
    schema: {
      type: 'object',
      properties: {
        brandName: { type: 'string', description: 'Tên thương hiệu', example: 'GEN-HUB' },
        supportEmail: { type: 'string', description: 'Email hỗ trợ', example: 'support@gen-hub.dev' },
        supportPhone: { type: 'string', description: 'Số điện thoại hỗ trợ', example: '0783 504 540' },
        colors: {
          type: 'object',
          description: 'Bảng màu giao diện',
          properties: {
            primary: { type: 'string', description: 'Màu chính', example: '#0F766E' },
            primaryLight: { type: 'string', description: 'Màu chính sáng', example: '#14B8A6' },
            primaryDark: { type: 'string', description: 'Màu chính tối', example: '#0D5A52' },
            gray900: { type: 'string', description: 'Màu xám 900', example: '#1E293B' },
            gray700: { type: 'string', description: 'Màu xám 700', example: '#334155' },
            gray500: { type: 'string', description: 'Màu xám 500', example: '#64748B' },
            gray300: { type: 'string', description: 'Màu xám 300', example: '#CBD5E1' },
            gray100: { type: 'string', description: 'Màu xám 100', example: '#F1F5F9' },
            background: { type: 'string', description: 'Màu nền trang', example: '#F8FAFC' },
            cardSurface: { type: 'string', description: 'Màu bề mặt card', example: '#FFFFFF' },
            sidebarBg: { type: 'string', description: 'Màu nền sidebar', example: '#F1F5F9' },
            success: { type: 'string', description: 'Màu thành công', example: '#10B981' },
            warning: { type: 'string', description: 'Màu cảnh báo', example: '#F59E0B' },
            error: { type: 'string', description: 'Màu lỗi', example: '#EF4444' },
            info: { type: 'string', description: 'Màu thông tin', example: '#0EA5E9' },
            border: { type: 'string', description: 'Màu viền', example: '#E2E8F0' },
            shadow: { type: 'string', description: 'Màu bóng đổ', example: 'rgba(0, 0, 0, 0.04)' },
          },
        },
        pagination: {
          type: 'object',
          description: 'Cấu hình phân trang',
          properties: {
            defaultLimit: { type: 'number', description: 'Số lượng item mặc định mỗi trang', example: 10 },
            defaultOffset: { type: 'number', description: 'Vị trí bắt đầu mặc định', example: 0 },
            maxLimit: { type: 'number', description: 'Số lượng item tối đa mỗi trang', example: 100 },
            minLimit: { type: 'number', description: 'Số lượng item tối thiểu mỗi trang', example: 1 },
          },
        },
        enableAiAutoReply: { type: 'boolean', description: 'Trạng thái bật/tắt AI tự động phản hồi', example: true },
      },
      example: {
        brandName: 'GEN-HUB',
        supportEmail: 'support@gen-hub.dev',
        supportPhone: '0783 504 540',
        colors: {
          primary: '#0F766E',
          primaryLight: '#14B8A6',
          primaryDark: '#0D5A52',
          gray900: '#1E293B',
          gray700: '#334155',
          gray500: '#64748B',
          gray300: '#CBD5E1',
          gray100: '#F1F5F9',
          background: '#F8FAFC',
          cardSurface: '#FFFFFF',
          sidebarBg: '#F1F5F9',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#0EA5E9',
          border: '#E2E8F0',
          shadow: 'rgba(0, 0, 0, 0.04)',
        },
        pagination: {
          defaultLimit: 10,
          defaultOffset: 0,
          maxLimit: 100,
          minLimit: 1,
        },
        enableAiAutoReply: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Chưa xác thực hoặc token không hợp lệ',
    content: {
      'application/json': {
        examples: {
          token_missing: {
            summary: 'Không có token',
            value: {
              statusCode: 401,
              message: 'Không có quyền truy cập',
              error: 'Unauthorized',
            },
          },
          token_expired: {
            summary: 'Token hết hạn',
            value: {
              statusCode: 401,
              message: 'Token đã hết hạn',
              error: 'Unauthorized',
            },
          },
          token_invalid: {
            summary: 'Token không hợp lệ',
            value: {
              statusCode: 401,
              message: 'Token không hợp lệ',
              error: 'Unauthorized',
            },
          },
          token_malformed: {
            summary: 'Token không đúng định dạng',
            value: {
              statusCode: 401,
              message: 'Token không đúng định dạng',
              error: 'Unauthorized',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền truy cập',
    content: {
      'application/json': {
        examples: {
          no_permission: {
            summary: 'Không có quyền thực hiện',
            value: {
              statusCode: 403,
              message: 'Không có quyền thực hiện thao tác này',
              error: 'Forbidden',
            },
          },
          account_banned: {
            summary: 'Tài khoản bị khóa',
            value: {
              statusCode: 403,
              message: 'Tài khoản đã bị khóa',
              error: 'Forbidden',
            },
          },
          account_not_verified: {
            summary: 'Tài khoản chưa xác minh',
            value: {
              statusCode: 403,
              message: 'Tài khoản chưa được xác minh. Vui lòng xác minh email để tiếp tục.',
              error: 'Forbidden',
            },
          },
          account_not_found: {
            summary: 'Tài khoản không tồn tại',
            value: {
              statusCode: 403,
              message: 'Tài khoản không tồn tại',
              error: 'Forbidden',
            },
          },
        },
      },
    },
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('config.reload')
  @Post('reload')
  async reloadConfig(@Request() req: any): Promise<IAppConfig> {
    const result = await this.appConfigService.reload();
    this.websocketGateway.emitConfigUpdated('reloaded', req.user?.userId);
    return result;
  }
}
