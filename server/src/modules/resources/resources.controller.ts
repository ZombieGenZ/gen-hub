import {
    Controller,
    Get,
    Query,
    UseGuards,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { GetResourcesDto } from './dto';

/**
 * Resources Controller
 * API endpoints để lấy resource metrics
 */
@ApiTags('Admin - Resources')
@Controller('admin/resources')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class ResourcesController {
    constructor(private readonly resourcesService: ResourcesService) { }

    /**
     * Lấy tổng quan resources của tất cả services
     */
    @Get('overview')
    @RequirePermission('resources.admin')
    @ApiOperation({ summary: 'Get resources overview' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Resources overview retrieved successfully',
    })
    async getOverview() {
        const overview = await this.resourcesService.getResourcesOverview();
        return {
            success: true,
            data: overview,
        };
    }

    /**
     * Lấy chi tiết metrics của tất cả services
     */
    @Get('stats')
    @RequirePermission('resources.admin')
    @ApiOperation({ summary: 'Get all services metrics' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Services metrics retrieved successfully',
    })
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

    /**
     * Lấy metrics của một service cụ thể
     */
    @Get('service/:serviceName')
    @RequirePermission('resources.admin')
    @ApiOperation({ summary: 'Get specific service metrics' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Service metrics retrieved successfully',
    })
    async getServiceMetrics(@Query('serviceName') serviceName: string) {
        const metrics = await this.resourcesService.getServiceMetrics(serviceName as any);
        return {
            success: true,
            data: metrics,
        };
    }
}
