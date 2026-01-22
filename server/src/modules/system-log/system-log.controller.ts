import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiQuery,
    ApiExtraModels,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import {
    RequirePermission,
    ApiAuthResponses,
    ApiValidationErrorResponse,
} from '../../common/decorators';
import {
    GetResponse,
    ResponseCode,
} from '../../common/responses';
import { LogLevel } from '@prisma/client';
import { SystemLogService } from './system-log.service';
import { QuerySystemLogDto } from './dto';
import { ISystemLogPaginated, ISystemLogStats } from './interfaces';

/**
 * System Logs Controller
 * Provides endpoints for viewing system logs in admin panel
 */
@ApiTags('System Logs')
@ApiBearerAuth('JWT-auth')
@Controller('admin/system-logs')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('systemlogs.admin')
@ApiExtraModels(QuerySystemLogDto)
export class SystemLogController {
    constructor(private readonly systemLogService: SystemLogService) { }

    /**
     * Get system logs with pagination and filtering
     */
    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách system logs',
        description:
            'Lấy danh sách các system logs với phân trang và bộ lọc. Hỗ trợ lọc theo level, module, search keyword và khoảng thời gian. Yêu cầu quyền `systemlogs.admin`.',
    })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Số trang (bắt đầu từ 1)',
        example: 1,
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Số lượng items mỗi trang (1-100)',
        example: 50,
    })
    @ApiQuery({
        name: 'level',
        required: false,
        enum: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
        description: 'Lọc theo mức độ log',
        example: 'ERROR',
    })
    @ApiQuery({
        name: 'module',
        required: false,
        type: String,
        description: 'Lọc theo tên module (case-insensitive)',
        example: 'auth',
    })
    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Tìm kiếm trong message và action (case-insensitive)',
        example: 'login',
    })
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Ngày bắt đầu lọc (ISO 8601 format)',
        example: '2026-01-01T00:00:00.000Z',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'Ngày kết thúc lọc (ISO 8601 format)',
        example: '2026-01-31T23:59:59.999Z',
    })
    @ApiResponse({
        status: 200,
        description: 'Trả về danh sách logs với thông tin phân trang',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'system_log.list_success' },
                message: { type: 'string', example: 'Lấy dữ liệu thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        data: { type: 'array', items: { type: 'object' } },
                        meta: {
                            type: 'object',
                            properties: {
                                total: { type: 'number', example: 1250 },
                                page: { type: 'number', example: 1 },
                                limit: { type: 'number', example: 50 },
                                totalPages: { type: 'number', example: 25 },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async getLogs(
        @Query() query: QuerySystemLogDto,
    ): Promise<GetResponse<ISystemLogPaginated>> {
        const result = await this.systemLogService.getLogs(query);
        return new GetResponse(ResponseCode.SYSTEM_LOG_LIST_SUCCESS, result);
    }

    /**
     * Get logs statistics
     */
    @Get('stats')
    @ApiOperation({
        summary: 'Lấy thống kê system logs',
        description:
            'Lấy thống kê tổng quan về system logs bao gồm tổng số logs, số logs trong 24h gần nhất và phân bổ theo level. Yêu cầu quyền `systemlogs.admin`.',
    })
    @ApiResponse({
        status: 200,
        description: 'Trả về thống kê tổng quan của system logs',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'system_log.stats_success' },
                message: { type: 'string', example: 'Lấy dữ liệu thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        total: { type: 'number', example: 15420 },
                        recentCount: { type: 'number', example: 523 },
                        byLevel: {
                            type: 'object',
                            properties: {
                                INFO: { type: 'number', example: 12000 },
                                WARN: { type: 'number', example: 2500 },
                                ERROR: { type: 'number', example: 800 },
                                DEBUG: { type: 'number', example: 120 },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    async getStats(): Promise<GetResponse<ISystemLogStats>> {
        const result = await this.systemLogService.getStats();
        return new GetResponse(ResponseCode.SYSTEM_LOG_STATS_SUCCESS, result);
    }

    /**
     * Get unique modules list
     */
    @Get('modules')
    @ApiOperation({
        summary: 'Lấy danh sách modules',
        description:
            'Lấy danh sách tất cả các module đã tạo logs trong hệ thống. Dùng để hiển thị dropdown filter trong admin panel. Yêu cầu quyền `systemlogs.admin`.',
    })
    @ApiResponse({
        status: 200,
        description: 'Trả về danh sách tên các modules đã ghi log',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'system_log.modules_success' },
                message: { type: 'string', example: 'Lấy dữ liệu thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['auth', 'http', 'organization', 'payment', 'server', 'user'],
                },
            },
        },
    })
    @ApiAuthResponses()
    async getModules(): Promise<GetResponse<string[]>> {
        const result = await this.systemLogService.getModules();
        return new GetResponse(ResponseCode.SYSTEM_LOG_MODULES_SUCCESS, result);
    }

    /**
     * Get enum values for LogLevel
     */
    @Get('levels')
    @ApiOperation({
        summary: 'Lấy danh sách log levels',
        description:
            'Lấy danh sách tất cả các log level có sẵn trong hệ thống. Dùng để hiển thị dropdown filter trong admin panel. Yêu cầu quyền `systemlogs.admin`.',
    })
    @ApiResponse({
        status: 200,
        description: 'Trả về danh sách các log levels',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'system_log.levels_success' },
                message: { type: 'string', example: 'Lấy dữ liệu thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: { type: 'string', enum: ['INFO', 'WARN', 'ERROR', 'DEBUG'] },
                    example: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
                },
            },
        },
    })
    @ApiAuthResponses()
    getLogLevels(): GetResponse<string[]> {
        const levels = Object.values(LogLevel);
        return new GetResponse(ResponseCode.SYSTEM_LOG_LEVELS_SUCCESS, levels);
    }
}
