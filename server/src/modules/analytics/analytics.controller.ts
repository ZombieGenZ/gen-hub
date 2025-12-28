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
import { JwtAuthGuard } from '../../common/guards';
import { OkResponse, ResponseCode } from '../../common/responses';

/**
 * Analytics Controller
 * API endpoints cho thống kê traffic
 */
@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
    constructor(
        private readonly cloudflareAnalyticsService: CloudflareAnalyticsService,
    ) { }

    @Get('traffic')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
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
        // Mặc định lấy 7 ngày gần nhất
        const today = new Date();
        const defaultEndDate = today.toISOString().split('T')[0];
        const defaultStartDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        const result = await this.cloudflareAnalyticsService.getTrafficAnalytics(
            startDate || defaultStartDate,
            endDate || defaultEndDate,
        );

        return new OkResponse(ResponseCode.ANALYTICS_TRAFFIC_SUCCESS, result, 'ok');
    }
}
