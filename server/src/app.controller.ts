import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators';
import { AppConfigService } from './common/config/app-config.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly appConfigService: AppConfigService,
  ) { }

  @ApiOperation({ summary: 'Trang chủ' })
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: 'Kiểm tra trạng thái hoạt động của API' })
  @ApiResponse({
    status: 200,
    description: 'API đang hoạt động bình thường',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        message: { type: 'string', example: 'GEN-HUB API đang hoạt động' },
        timestamp: { type: 'string', example: '2025-12-06T12:30:00.000Z' },
        uptime: { type: 'number', example: 12345.67 },
      },
    },
  })
  @Public()
  @Get('health')
  healthCheck() {
    const appName = this.appConfigService.get('appName');
    return {
      status: 'ok',
      message: `${appName} API đang hoạt động`,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
