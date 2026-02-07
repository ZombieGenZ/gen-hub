import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiQuery,
    ApiParam,
} from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, ApiAuthResponses } from '../../common/decorators';
import { GetResourcesDto } from './dto';

/**
 * Resources Controller
 * API endpoints để lấy resource metrics
 */
@ApiTags('Resources')
@Controller('admin/resources')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class ResourcesController {
    constructor(private readonly resourcesService: ResourcesService) { }

    @Get('overview')
    @RequirePermission('resources.admin')
    @ApiOperation({
        summary: 'Get resources overview',
        description: 'Lấy tổng quan resources của tất cả services bao gồm: CPU, Memory, Disk usage. Yêu cầu quyền `resources.admin`.',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Resources overview retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        cpu: { type: 'number', example: 45.5, description: 'CPU usage %' },
                        memory: { type: 'number', example: 2048, description: 'Memory usage MB' },
                        disk: { type: 'number', example: 50.2, description: 'Disk usage %' },
                        uptime: { type: 'number', example: 86400, description: 'Uptime in seconds' },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    async getOverview() {
        const overview = await this.resourcesService.getResourcesOverview();
        return {
            success: true,
            data: overview,
        };
    }

    @Get('stats')
    @RequirePermission('resources.admin')
    @ApiOperation({
        summary: 'Get all services metrics',
        description: 'Lấy chi tiết metrics của tất cả services hoặc filter theo danh sách services. Yêu cầu quyền `resources.admin`.',
    })
    @ApiQuery({ name: 'services', required: false, isArray: true, type: String, description: 'Lọc theo danh sách services' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Services metrics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        services: { type: 'array', items: { type: 'object' } },
                        overview: { type: 'object' },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    async getStats(@Query() query: GetResourcesDto) {
        const [services, overview] = await Promise.all([
            this.resourcesService.getAllServicesMetrics(query.services),
            this.resourcesService.getResourcesOverview(),
        ]);

        return {
            success: true,
            data: {
                services,
                overview,
            },
        };
    }

    @Get('service/:serviceName')
    @RequirePermission('resources.admin')
    @ApiOperation({
        summary: 'Get specific service metrics',
        description: 'Lấy metrics của một service cụ thể: Redis, Prisma, Coze, Discord, etc. Yêu cầu quyền `resources.admin`.',
    })
    @ApiParam({ name: 'serviceName', description: 'Tên service', example: 'redis' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Service metrics retrieved successfully',
    })
    @ApiAuthResponses()
    async getServiceMetrics(@Param('serviceName') serviceName: string) {
        const metrics = await this.resourcesService.getServiceMetrics(serviceName as any);
        return {
            success: true,
            data: metrics,
        };
    }
}
