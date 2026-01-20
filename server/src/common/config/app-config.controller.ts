import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
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

  @ApiOperation({ summary: 'Lấy cấu hình ứng dụng' })
  @ApiResponse({
    status: 200,
    description: 'Cấu hình ứng dụng hiện tại',
    schema: {
      type: 'object',
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
          defaultLimit: '10',
          defaultOffset: '0',
          maxLimit: '1000',
          minLimit: '1',
        },
        enableAiAutoReply: 'true',
      },
    },
  })
  @Public()
  @Get()
  getConfig(): IAppConfig {
    return this.appConfigService.getAll();
  }

  @ApiOperation({ summary: 'Cập nhật cấu hình ứng dụng' })
  @ApiResponse({
    status: 200,
    description: 'Cấu hình đã được cập nhật thành công',
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
            primary: { type: 'string', example: '#0F766E' },
            primaryLight: { type: 'string', example: '#14B8A6' },
            primaryDark: { type: 'string', example: '#0D5A52' },
            gray900: { type: 'string', example: '#1E293B' },
            gray700: { type: 'string', example: '#334155' },
            gray500: { type: 'string', example: '#64748B' },
            gray300: { type: 'string', example: '#CBD5E1' },
            gray100: { type: 'string', example: '#F1F5F9' },
            background: { type: 'string', example: '#F8FAFC' },
            cardSurface: { type: 'string', example: '#FFFFFF' },
            sidebarBg: { type: 'string', example: '#F1F5F9' },
            success: { type: 'string', example: '#10B981' },
            warning: { type: 'string', example: '#F59E0B' },
            error: { type: 'string', example: '#EF4444' },
            info: { type: 'string', example: '#0EA5E9' },
            border: { type: 'string', example: '#E2E8F0' },
            shadow: { type: 'string', example: 'rgba(0, 0, 0, 0.04)' },
          },
        },
        pagination: {
          type: 'object',
          description: 'Cấu hình phân trang',
          properties: {
            defaultLimit: { type: 'string', description: 'Số item mặc định mỗi trang', example: '10' },
            defaultOffset: { type: 'string', description: 'Vị trí bắt đầu mặc định', example: '0' },
            maxLimit: { type: 'string', description: 'Số item tối đa mỗi trang', example: '1000' },
            minLimit: { type: 'string', description: 'Số item tối thiểu mỗi trang', example: '1' },
          },
        },
        enableAiAutoReply: { type: 'string', description: 'Bật/tắt AI tự động trả lời', example: 'true' },
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
          defaultLimit: '10',
          defaultOffset: '0',
          maxLimit: '1000',
          minLimit: '1',
        },
        enableAiAutoReply: 'true',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Chưa xác thực hoặc token không hợp lệ',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      },
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền config.update',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Bạn không có quyền thực hiện hành động này' },
        error: { type: 'string', example: 'Forbidden' },
        requiredPermission: { type: 'string', example: 'config.update' },
      },
      example: {
        statusCode: 403,
        message: 'Bạn không có quyền thực hiện hành động này',
        error: 'Forbidden',
        requiredPermission: 'config.update',
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

  @ApiOperation({ summary: 'Reset cấu hình về mặc định' })
  @ApiResponse({
    status: 200,
    description: 'Cấu hình đã được reset về giá trị mặc định',
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
            primary: { type: 'string', example: '#0F766E' },
            primaryLight: { type: 'string', example: '#14B8A6' },
            primaryDark: { type: 'string', example: '#0D5A52' },
            gray900: { type: 'string', example: '#1E293B' },
            gray700: { type: 'string', example: '#334155' },
            gray500: { type: 'string', example: '#64748B' },
            gray300: { type: 'string', example: '#CBD5E1' },
            gray100: { type: 'string', example: '#F1F5F9' },
            background: { type: 'string', example: '#F8FAFC' },
            cardSurface: { type: 'string', example: '#FFFFFF' },
            sidebarBg: { type: 'string', example: '#F1F5F9' },
            success: { type: 'string', example: '#10B981' },
            warning: { type: 'string', example: '#F59E0B' },
            error: { type: 'string', example: '#EF4444' },
            info: { type: 'string', example: '#0EA5E9' },
            border: { type: 'string', example: '#E2E8F0' },
            shadow: { type: 'string', example: 'rgba(0, 0, 0, 0.04)' },
          },
        },
        pagination: {
          type: 'object',
          description: 'Cấu hình phân trang',
          properties: {
            defaultLimit: { type: 'string', description: 'Số item mặc định mỗi trang', example: '10' },
            defaultOffset: { type: 'string', description: 'Vị trí bắt đầu mặc định', example: '0' },
            maxLimit: { type: 'string', description: 'Số item tối đa mỗi trang', example: '1000' },
            minLimit: { type: 'string', description: 'Số item tối thiểu mỗi trang', example: '1' },
          },
        },
        enableAiAutoReply: { type: 'string', description: 'Bật/tắt AI tự động trả lời', example: 'true' },
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
          defaultLimit: '10',
          defaultOffset: '0',
          maxLimit: '1000',
          minLimit: '1',
        },
        enableAiAutoReply: 'true',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Chưa xác thực hoặc token không hợp lệ',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      },
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền config.reset',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Bạn không có quyền thực hiện hành động này' },
        error: { type: 'string', example: 'Forbidden' },
        requiredPermission: { type: 'string', example: 'config.reset' },
      },
      example: {
        statusCode: 403,
        message: 'Bạn không có quyền thực hiện hành động này',
        error: 'Forbidden',
        requiredPermission: 'config.reset',
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

  @ApiOperation({ summary: 'Reload cấu hình từ file' })
  @ApiResponse({
    status: 200,
    description: 'Cấu hình đã được reload từ file',
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
            primary: { type: 'string', example: '#0F766E' },
            primaryLight: { type: 'string', example: '#14B8A6' },
            primaryDark: { type: 'string', example: '#0D5A52' },
            gray900: { type: 'string', example: '#1E293B' },
            gray700: { type: 'string', example: '#334155' },
            gray500: { type: 'string', example: '#64748B' },
            gray300: { type: 'string', example: '#CBD5E1' },
            gray100: { type: 'string', example: '#F1F5F9' },
            background: { type: 'string', example: '#F8FAFC' },
            cardSurface: { type: 'string', example: '#FFFFFF' },
            sidebarBg: { type: 'string', example: '#F1F5F9' },
            success: { type: 'string', example: '#10B981' },
            warning: { type: 'string', example: '#F59E0B' },
            error: { type: 'string', example: '#EF4444' },
            info: { type: 'string', example: '#0EA5E9' },
            border: { type: 'string', example: '#E2E8F0' },
            shadow: { type: 'string', example: 'rgba(0, 0, 0, 0.04)' },
          },
        },
        pagination: {
          type: 'object',
          description: 'Cấu hình phân trang',
          properties: {
            defaultLimit: { type: 'string', description: 'Số item mặc định mỗi trang', example: '10' },
            defaultOffset: { type: 'string', description: 'Vị trí bắt đầu mặc định', example: '0' },
            maxLimit: { type: 'string', description: 'Số item tối đa mỗi trang', example: '1000' },
            minLimit: { type: 'string', description: 'Số item tối thiểu mỗi trang', example: '1' },
          },
        },
        enableAiAutoReply: { type: 'string', description: 'Bật/tắt AI tự động trả lời', example: 'true' },
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
          defaultLimit: '10',
          defaultOffset: '0',
          maxLimit: '1000',
          minLimit: '1',
        },
        enableAiAutoReply: 'true',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Chưa xác thực hoặc token không hợp lệ',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      },
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền config.reload',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Bạn không có quyền thực hiện hành động này' },
        error: { type: 'string', example: 'Forbidden' },
        requiredPermission: { type: 'string', example: 'config.reload' },
      },
      example: {
        statusCode: 403,
        message: 'Bạn không có quyền thực hiện hành động này',
        error: 'Forbidden',
        requiredPermission: 'config.reload',
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
