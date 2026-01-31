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
    @ApiOperation({
        summary: 'Lấy thống kê traffic từ Cloudflare',
        description: 'Lấy dữ liệu thống kê traffic của website từ Cloudflare GraphQL API. Bao gồm số liệu về requests, bandwidth, threats, pageviews và unique visitors. Dữ liệu được cache trong Redis.',
    })
    @ApiResponse({
        status: 200,
        description: 'Thống kê traffic thành công',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        requests: {
                            type: 'object',
                            properties: {
                                all: { type: 'number', example: 15420, description: 'Tổng số requests' },
                                cached: { type: 'number', example: 12500, description: 'Số requests được cache' },
                                uncached: { type: 'number', example: 2920, description: 'Số requests không được cache (về origin)' },
                            },
                        },
                        bandwidth: {
                            type: 'object',
                            properties: {
                                all: { type: 'number', example: 524288000, description: 'Tổng băng thông (bytes)' },
                                cached: { type: 'number', example: 419430400, description: 'Băng thông được cache (bytes)' },
                                uncached: { type: 'number', example: 104857600, description: 'Băng thông không được cache (bytes)' },
                            },
                        },
                        threats: {
                            type: 'object',
                            properties: {
                                all: { type: 'number', example: 5, description: 'Tổng số mối đe dọa bị chặn' },
                            },
                        },
                        pageviews: {
                            type: 'object',
                            properties: {
                                all: { type: 'number', example: 8500, description: 'Tổng số lượt xem trang' },
                            },
                        },
                        uniques: {
                            type: 'object',
                            properties: {
                                all: { type: 'number', example: 3200, description: 'Số lượng khách truy cập duy nhất' },
                            },
                        },
                    },
                },
                period: {
                    type: 'object',
                    properties: {
                        startDate: { type: 'string', example: '2024-01-01', description: 'Ngày bắt đầu thống kê (YYYY-MM-DD)' },
                        endDate: { type: 'string', example: '2024-01-31', description: 'Ngày kết thúc thống kê (YYYY-MM-DD)' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 500,
        description: 'Lỗi server hoặc không thể kết nối Cloudflare API',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: false },
                errors: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['Failed to fetch data from Cloudflare'],
                },
                period: {
                    type: 'object',
                    properties: {
                        startDate: { type: 'string', example: '2024-01-01' },
                        endDate: { type: 'string', example: '2024-01-31' },
                    },
                },
            },
        },
    })
    async getTrafficAnalytics() {
        // endDate là thời gian hiện tại
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];

        // startDate từ env CLOUDFLARE_START_ANALYTICS_DATE
        const configuredStartDate = this.configService.get<string>(
            'CLOUDFLARE_START_ANALYTICS_DATE',
        ) || '2024-01-01';

        // Cloudflare có giới hạn tối đa 365 ngày (~31539600 giây)
        // Đảm bảo startDate không vượt quá 364 ngày từ hôm nay
        const maxDaysBack = 364;
        const maxStartDate = new Date(today);
        maxStartDate.setDate(maxStartDate.getDate() - maxDaysBack);
        const maxStartDateStr = maxStartDate.toISOString().split('T')[0];

        // Sử dụng ngày gần hơn (configured hoặc max allowed)
        const startDate = configuredStartDate > maxStartDateStr ? configuredStartDate : maxStartDateStr;

        const result = await this.cloudflareAnalyticsService.getTrafficAnalytics(
            startDate,
            endDate,
        );

        return new OkResponse(ResponseCode.ANALYTICS_TRAFFIC_SUCCESS, result, 'ok');
    }
}
