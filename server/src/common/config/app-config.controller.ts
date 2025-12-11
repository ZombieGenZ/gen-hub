import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
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

@ApiTags('Config')
@Controller('config')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) { }

  @ApiOperation({ summary: 'Lấy cấu hình ứng dụng' })
  @ApiResponse({
    status: 200,
    description: 'Cấu hình ứng dụng hiện tại',
    schema: {
      type: 'object',
      properties: {
        brandName: { type: 'string', example: 'GEN-HUB' },
        colors: {
          type: 'object',
          properties: {
            primary: { type: 'string', example: '#0F766E' },
            primaryLight: { type: 'string', example: '#14B8A6' },
            primaryDark: { type: 'string', example: '#0D5A52' },
          },
        },
      },
    },
  })
  @Public()
  @Get()
  getConfig(): IAppConfig {
    return this.appConfigService.getAll();
  }

  @ApiOperation({ summary: 'Cập nhật cấu hình ứng dụng' })
  @ApiResponse({ status: 200, description: 'Cấu hình đã được cập nhật' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền config.update',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('config.update')
  @Patch()
  async updateConfig(@Body() dto: UpdateAppConfigDto): Promise<IAppConfig> {
    return this.appConfigService.update(dto as Partial<IAppConfig>);
  }

  @ApiOperation({ summary: 'Reset cấu hình về mặc định' })
  @ApiResponse({ status: 200, description: 'Cấu hình đã được reset' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền config.reset',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('config.reset')
  @Post('reset')
  async resetConfig(): Promise<IAppConfig> {
    return this.appConfigService.reset();
  }

  @ApiOperation({ summary: 'Reload cấu hình từ file' })
  @ApiResponse({ status: 200, description: 'Cấu hình đã được reload' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền config.reload',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('config.reload')
  @Post('reload')
  async reloadConfig(): Promise<IAppConfig> {
    return this.appConfigService.reload();
  }
}
