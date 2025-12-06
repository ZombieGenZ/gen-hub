import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppConfigService } from './app-config.service';
import type { IAppConfig } from './app-config.service';
import { UpdateAppConfigDto } from './app-config.dto';
import { Public } from '../decorators';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

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
                appName: { type: 'string', example: 'GEN-HUB' },
                appVersion: { type: 'string', example: '1.0.0' },
                teamName: { type: 'string', example: 'TANK ZENITH GEN Development Team' },
                copyright: { type: 'string', example: '© 2025 TANK ZENITH GEN. All rights reserved.' },
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
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Patch()
    async updateConfig(@Body() dto: UpdateAppConfigDto): Promise<IAppConfig> {
        return this.appConfigService.update(dto);
    }

    @ApiOperation({ summary: 'Reset cấu hình về mặc định' })
    @ApiResponse({ status: 200, description: 'Cấu hình đã được reset' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post('reset')
    async resetConfig(): Promise<IAppConfig> {
        return this.appConfigService.reset();
    }

    @ApiOperation({ summary: 'Reload cấu hình từ file' })
    @ApiResponse({ status: 200, description: 'Cấu hình đã được reload' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post('reload')
    async reloadConfig(): Promise<IAppConfig> {
        return this.appConfigService.reload();
    }
}
