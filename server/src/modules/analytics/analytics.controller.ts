import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
} from '@nestjs/swagger';
import { CloudflareAnalyticsService } from './cloudflare-analytics.service';
import { Public } from '../../common/decorators';
import { OkResponse, ResponseCode } from '../../common/responses';
import { ConfigService } from '@nestjs/config';

/**
 * Analytics Controller
 * API endpoints cho thống kê traffic
 */
@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
    constructor(
        private readonly cloudflareAnalyticsService: CloudflareAnalyticsService,
        private readonly configService: ConfigService,
    ) { }

    @Get('traffic')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Lấy thống kê traffic từ Cloudflare' })
    @ApiResponse({
        status: 200,
        description: 'Thống kê traffic',
    })
    async getTrafficAnalytics() {
        // endDate là thời gian hiện tại
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];

        // startDate từ env CLOUDFLARE_START_ANALYTICS_DATE
        const startDate = this.configService.get<string>(
            'CLOUDFLARE_START_ANALYTICS_DATE',
        ) || '2024-01-01';

        const result = await this.cloudflareAnalyticsService.getTrafficAnalytics(
            startDate,
            endDate,
        );

        return new OkResponse(ResponseCode.ANALYTICS_TRAFFIC_SUCCESS, result, 'ok');
    }
}
