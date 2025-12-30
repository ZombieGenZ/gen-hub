import {
    Controller,
    Get,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
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
    @ApiQuery({
        name: 'startDate',
        required: false,
        description: 'Ngày bắt đầu (YYYY-MM-DD)',
        example: '2024-12-01',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        description: 'Ngày kết thúc (YYYY-MM-DD)',
        example: '2024-12-28',
    })
    @ApiResponse({
        status: 200,
        description: 'Thống kê traffic',
    })
    async getTrafficAnalytics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        // Mặc định endDate là hôm nay
        const today = new Date();
        const defaultEndDate = today.toISOString().split('T')[0];

        // Mặc định startDate từ env CLOUDFLARE_START_ANALYTICS_DATE
        const defaultStartDate = this.configService.get<string>(
            'CLOUDFLARE_START_ANALYTICS_DATE',
        );

        const result = await this.cloudflareAnalyticsService.getTrafficAnalytics(
            startDate || defaultStartDate || '2024-01-01',
            endDate || defaultEndDate,
        );

        return new OkResponse(ResponseCode.ANALYTICS_TRAFFIC_SUCCESS, result, 'ok');
    }
}
