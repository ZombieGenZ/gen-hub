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
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiQuery,
    ApiParam,
    ApiBody,
    ApiResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import { FeatureFlagService } from './feature-flag.service';

@ApiTags('Feature Flags')
@ApiBearerAuth('JWT-auth')
@Controller('admin/feature-flags')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('featureflag.admin')
export class FeatureFlagController {
    constructor(private readonly featureFlagService: FeatureFlagService) { }

    @Get()
    @ApiOperation({
        summary: 'Get list of all feature flags',
        description: 'Lấy danh sách tất cả feature flags với phân trang và lọc. Yêu cầu quyền `featureflag.admin`.',
    })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang', example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng mỗi trang', example: 20 })
    @ApiQuery({ name: 'module', required: false, type: String, description: 'Lọc theo module' })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Lọc theo trạng thái' })
    @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean, description: 'Bao gồm đã xóa' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Tìm kiếm theo tên' })
    @ApiResponse({ status: 200, description: 'Danh sách feature flags' })
    @ApiAuthResponses()
    async getAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('module') module?: string,
        @Query('isActive') isActive?: string,
        @Query('includeDeleted') includeDeleted?: string,
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

    @Get('modules')
    @ApiOperation({
        summary: 'Get list of all modules',
        description: 'Lấy danh sách các module có feature flag. Yêu cầu quyền `featureflag.admin`.',
    })
    @ApiResponse({ status: 200, description: 'Danh sách modules' })
    @ApiAuthResponses()
    async getModules() {
        return this.featureFlagService.getModules();
    }

    @Get('stats')
    @ApiOperation({
        summary: 'Get feature flag statistics',
        description: 'Lấy thống kê tổng quan về feature flags: tổng số, active, inactive. Yêu cầu quyền `featureflag.admin`.',
    })
    @ApiResponse({ status: 200, description: 'Thống kê feature flags' })
    @ApiAuthResponses()
    async getStats() {
        return this.featureFlagService.getStats();
    }

    @Put('bulk/toggle')
    @ApiOperation({
        summary: 'Bulk toggle feature flags',
        description: 'Bật/tắt nhiều feature flags cùng lúc. Yêu cầu quyền `featureflag.admin`.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                ids: { type: 'array', items: { type: 'string' } },
                is_active: { type: 'boolean' },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Toggle thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async bulkToggle(
        @Body() body: { ids: string[]; is_active: boolean },
        @Req() req: Request,
    ) {
        const context = this.extractContext(req);
        return this.featureFlagService.bulkToggle(body.ids, body.is_active, context);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get feature flag by ID',
        description: 'Lấy chi tiết một feature flag. Yêu cầu quyền `featureflag.admin`.',
    })
    @ApiParam({ name: 'id', description: 'ID feature flag' })
    @ApiResponse({ status: 200, description: 'Chi tiết feature flag' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiAuthResponses()
    async getById(@Param('id') id: string) {
        return this.featureFlagService.getById(id);
    }

    @Get(':id/logs')
    @ApiOperation({
        summary: 'Get feature flag logs',
        description: 'Lấy lịch sử thay đổi của feature flag. Yêu cầu quyền `featureflag.admin`.',
    })
    @ApiParam({ name: 'id', description: 'ID feature flag' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Logs của feature flag' })
    @ApiAuthResponses()
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

    @Put(':id')
    @ApiOperation({
        summary: 'Toggle feature flag status',
        description: 'Bật/tắt một feature flag. Yêu cầu quyền `featureflag.admin`.',
    })
    @ApiParam({ name: 'id', description: 'ID feature flag' })
    @ApiBody({ schema: { type: 'object', properties: { is_active: { type: 'boolean' } } } })
    @ApiResponse({ status: 200, description: 'Toggle thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async toggle(
        @Param('id') id: string,
        @Body() body: { is_active: boolean },
        @Req() req: Request,
    ) {
        const context = this.extractContext(req);
        return this.featureFlagService.toggle(id, body.is_active, context);
    }

    private extractContext(req: Request) {
        const user = req.user as any;
        return {
            userId: user?.userId,
            ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
            userAgent: req.headers['user-agent'],
        };
    }
}
