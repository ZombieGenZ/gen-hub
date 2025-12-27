import {
    Controller,
    Get,
    Put,
    Param,
    Body,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission } from '../../common/decorators';
import { FeatureFlagService } from './feature-flag.service';

@ApiTags('Feature Flags')
@ApiBearerAuth()
@Controller('admin/feature-flags')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('featureflag.admin')
export class FeatureFlagController {
    constructor(private readonly featureFlagService: FeatureFlagService) { }

    /**
     * Lấy danh sách tất cả feature flags
     */
    @Get()
    @ApiOperation({ summary: 'Get list of all feature flags' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'module', required: false, type: String })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
    @ApiQuery({ name: 'search', required: false, type: String })
    async getAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('module') module?: string,
        @Query('isActive') isActive?: string,
        @Query('search') search?: string,
    ) {
        return this.featureFlagService.getAll({
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            module,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            includeDeleted: includeDeleted === 'true',
            search,
        });
    }

    /**
     * Lấy danh sách các modules
     */
    @Get('modules')
    @ApiOperation({ summary: 'Get list of all modules' })
    async getModules() {
        return this.featureFlagService.getModules();
    }

    /**
     * Lấy thống kê feature flags
     */
    @Get('stats')
    @ApiOperation({ summary: 'Get feature flag statistics' })
    async getStats() {
        return this.featureFlagService.getStats();
    }

    /**
     * Lấy chi tiết một feature flag
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get feature flag by ID' })
    async getById(@Param('id') id: string) {
        return this.featureFlagService.getById(id);
    }

    /**
     * Lấy logs của một feature flag
     */
    @Get(':id/logs')
    @ApiOperation({ summary: 'Get feature flag logs' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getLogs(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.featureFlagService.getLogs(id, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    /**
     * Toggle feature flag on/off
     */
    @Put(':id')
    @ApiOperation({ summary: 'Toggle feature flag status' })
    async toggle(
        @Param('id') id: string,
        @Body() body: { is_active: boolean },
        @Req() req: Request,
    ) {
        const context = this.extractContext(req);
        return this.featureFlagService.toggle(id, body.is_active, context);
    }

    /**
     * Bulk toggle feature flags
     */
    @Put('bulk/toggle')
    @ApiOperation({ summary: 'Bulk toggle feature flags' })
    async bulkToggle(
        @Body() body: { ids: string[]; is_active: boolean },
        @Req() req: Request,
    ) {
        const context = this.extractContext(req);
        return this.featureFlagService.bulkToggle(body.ids, body.is_active, context);
    }

    /**
     * Force reload cache
     */
    @Put('cache/reload')
    @ApiOperation({ summary: 'Force reload feature flag cache' })
    async reloadCache() {
        await this.featureFlagService.invalidateCache();
        return { message: 'Cache reloaded successfully' };
    }

    /**
     * Extract context từ request
     */
    private extractContext(req: Request) {
        const user = req.user as any;
        return {
            userId: user?.userId,
            ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
            userAgent: req.headers['user-agent'],
        };
    }
}
