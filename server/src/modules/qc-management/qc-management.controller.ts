import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { QCManagementService } from './qc-management.service';
import { AssignUserToWarehouseDto, AssignUserToRowDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import { GetResponse, CreatedResponse, DeletedResponse } from '../../common/responses';

@ApiTags('QC Management')
@ApiBearerAuth()
@Controller('qc-management')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class QCManagementController {
    constructor(private readonly qcManagementService: QCManagementService) { }

    // ============ QC WAREHOUSES ============

    @Get('warehouses')
    @RequirePermission('qc-management.list')
    @ApiOperation({ summary: 'Lấy danh sách QC Warehouses' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async getWarehouses(
        @Query('limit') limit: number = 20,
        @Query('offset') offset: number = 0,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getQCWarehouses(limit, offset);
        return new GetResponse('qc-management.list.success', data, 'Lấy danh sách QC Warehouses thành công');
    }

    @Get('warehouses/:id')
    @RequirePermission('qc-management.read')
    @ApiOperation({ summary: 'Lấy chi tiết QC Warehouse' })
    @ApiParam({ name: 'id', description: 'ID QC Warehouse' })
    async getWarehouseById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getQCWarehouseById(id, lang);
        return new GetResponse('qc-management.read.success', data, 'Lấy chi tiết QC Warehouse thành công');
    }

    @Get('warehouses/:id/rows')
    @RequirePermission('qc-management.list')
    @ApiOperation({ summary: 'Lấy danh sách QC Rows của warehouse' })
    @ApiParam({ name: 'id', description: 'ID QC Warehouse' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async getRowsByWarehouse(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getQCRowsByWarehouseId(id, limit, offset);
        return new GetResponse('qc-management.list.success', data, 'Lấy danh sách QC Rows thành công');
    }

    // ============ PERMISSIONS ============

    @Get('permissions')
    @RequirePermission('qc-management.list')
    @ApiOperation({ summary: 'Lấy danh sách QC Permissions' })
    async getPermissions(@I18nLang() lang: string) {
        const data = await this.qcManagementService.getAllPermissions();
        return new GetResponse('qc-management.permissions.success', data, 'Lấy danh sách QC Permissions thành công');
    }

    // ============ WAREHOUSE ASSIGNMENTS ============

    @Post('warehouses/:id/assignments')
    @RequirePermission('qc-management.assign')
    @ApiOperation({ summary: 'Gán user vào QC Warehouse' })
    @ApiParam({ name: 'id', description: 'ID QC Warehouse' })
    @ApiBody({ type: AssignUserToWarehouseDto })
    async assignUserToWarehouse(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AssignUserToWarehouseDto,
        @CurrentUser('userId') currentUserId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.assignUserToWarehouse(
            id,
            dto.user_id,
            dto.permission_ids || [],
            currentUserId,
            lang,
        );
        return new CreatedResponse('qc-management.assign.success', data, 'Gán user thành công');
    }

    @Delete('warehouses/assignments/:assignmentId')
    @RequirePermission('qc-management.assign')
    @ApiOperation({ summary: 'Xóa phân công warehouse' })
    @ApiParam({ name: 'assignmentId', description: 'ID Assignment' })
    async removeWarehouseAssignment(
        @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
        @CurrentUser('userId') currentUserId: string,
        @I18nLang() lang: string,
    ) {
        await this.qcManagementService.removeWarehouseAssignment(assignmentId, currentUserId, lang);
        return new DeletedResponse('qc-management.remove.success', null, 'Xóa phân công thành công');
    }

    // ============ ROW ASSIGNMENTS ============

    @Post('rows/:id/assignments')
    @RequirePermission('qc-management.assign')
    @ApiOperation({ summary: 'Gán user vào QC Row' })
    @ApiParam({ name: 'id', description: 'ID QC Row' })
    @ApiBody({ type: AssignUserToRowDto })
    async assignUserToRow(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AssignUserToRowDto,
        @CurrentUser('userId') currentUserId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.assignUserToRow(
            id,
            dto.user_id,
            dto.permission_ids || [],
            currentUserId,
            lang,
        );
        return new CreatedResponse('qc-management.assign.success', data, 'Gán user thành công');
    }

    @Delete('rows/assignments/:assignmentId')
    @RequirePermission('qc-management.assign')
    @ApiOperation({ summary: 'Xóa phân công row' })
    @ApiParam({ name: 'assignmentId', description: 'ID Assignment' })
    async removeRowAssignment(
        @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
        @CurrentUser('userId') currentUserId: string,
        @I18nLang() lang: string,
    ) {
        await this.qcManagementService.removeRowAssignment(assignmentId, currentUserId, lang);
        return new DeletedResponse('qc-management.remove.success', null, 'Xóa phân công thành công');
    }
}
