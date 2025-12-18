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
        uptime: { type: 'number', example: 123.45 },
      },
    },
  })
  @Public()
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      uptime: process.uptime(),
    };
  }
}
