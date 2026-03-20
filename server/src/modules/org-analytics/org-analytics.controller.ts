import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { OrgAnalyticsService } from './services/org-analytics.service';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';
import { OrgPermissionGuard } from '../../common/guards/org-permission.guard';
import { RequireOrgPermission } from '../../common/decorators/require-org-permission.decorator';

@ApiTags('Organization Analytics')
@ApiBearerAuth()
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
@Controller('organizations/:orgId/analytics')
export class OrgAnalyticsController {
    constructor(private readonly analyticsService: OrgAnalyticsService) { }

    @Get('overview')
    @RequireOrgPermission('org.analytics.view', 'org.analytics.view.all')
    @ApiOperation({ summary: 'Lấy dữ liệu tổng quan KPI' })
    @ApiParam({ name: 'orgId', required: true, type: String })
    async getOverview(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.analyticsService.getOverview(orgId);
        return {
            success: true,
            data,
        };
    }

    @Get('stock-flow')
    @RequireOrgPermission('org.analytics.view', 'org.analytics.view.all')
    @ApiOperation({ summary: 'Lấy biểu đồ dòng hàng' })
    @ApiParam({ name: 'orgId', required: true, type: String })
    @ApiQuery({ name: 'days', required: false, type: Number, description: 'Số ngày thống kê (mặc định 7)' })
    async getStockFlow(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query('days') days: number = 7,
        @I18nLang() lang: string,
    ) {
        const parsedDays = Number(days) || 7;
        const data = await this.analyticsService.getStockFlow(orgId, parsedDays);
        return {
            success: true,
            data,
        };
    }

    @Get('top-products')
    @RequireOrgPermission('org.analytics.view', 'org.analytics.view.all')
    @ApiOperation({ summary: 'Lấy top sản phẩm' })
    @ApiParam({ name: 'orgId', required: true, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng sản phẩm (mặc định 5)' })
    async getTopProducts(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query('limit') limit: number = 5,
        @I18nLang() lang: string,
    ) {
        const parsedLimit = Number(limit) || 5;
        const data = await this.analyticsService.getTopProducts(orgId, parsedLimit);
        return {
            success: true,
            data,
        };
    }

    @Get('stock-alerts')
    @RequireOrgPermission('org.analytics.view', 'org.analytics.view.all')
    @ApiOperation({ summary: 'Lấy danh sách cảnh báo tồn kho' })
    @ApiParam({ name: 'orgId', required: true, type: String })
    async getStockAlerts(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.analyticsService.getStockAlerts(orgId);
        return {
            success: true,
            data,
        };
    }

    @Get('recent-shipments')
    @RequireOrgPermission('org.analytics.view', 'org.analytics.view.all')
    @ApiOperation({ summary: 'Lấy tiến độ vận đơn gần đây' })
    @ApiParam({ name: 'orgId', required: true, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng vận đơn (mặc định 5)' })
    async getRecentShipments(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query('limit') limit: number = 5,
        @I18nLang() lang: string,
    ) {
        const parsedLimit = Number(limit) || 5;
        const data = await this.analyticsService.getRecentShipments(orgId, parsedLimit);
        return {
            success: true,
            data,
        };
    }
}
