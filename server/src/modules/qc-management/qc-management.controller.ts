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

    @Get('warehouses/:qcWarehouseId')
    @RequirePermission('qc-management.read')
    @ApiOperation({ summary: 'Lấy chi tiết QC Warehouse' })
    @ApiParam({ name: 'qcWarehouseId', description: 'ID QC Warehouse' })
    async getQCWarehouseById(
        @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getQCWarehouseById(qcWarehouseId, lang);
        return new GetResponse('qc-management.read.success', data, 'Lấy chi tiết QC Warehouse thành công');
    }

    @Get('warehouses/:qcWarehouseId/warehouses')
    @RequirePermission('qc-management.list')
    @ApiOperation({ summary: 'Lấy danh sách Warehouses của QC Warehouse' })
    @ApiParam({ name: 'qcWarehouseId', description: 'ID QC Warehouse' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async getWarehousesByQCWarehouse(
        @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getWarehousesByQCWarehouseId(qcWarehouseId, limit, offset, lang);
        return new GetResponse('qc-management.list.success', data, 'Lấy danh sách Warehouses thành công');
    }

    @Get('warehouses/:qcWarehouseId/warehouses/:warehouseId')
    @RequirePermission('qc-management.read')
    @ApiOperation({ summary: 'Lấy chi tiết Warehouse' })
    @ApiParam({ name: 'qcWarehouseId', description: 'ID QC Warehouse' })
    @ApiParam({ name: 'warehouseId', description: 'ID Warehouse' })
    async getWarehouseDetail(
        @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
        @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getWarehouseById(warehouseId, lang);
        return new GetResponse('qc-management.read.success', data, 'Lấy chi tiết Warehouse thành công');
    }

    @Get('warehouses/:qcWarehouseId/rows')
    @RequirePermission('qc-management.list')
    @ApiOperation({ summary: 'Lấy danh sách QC Rows của warehouse' })
    @ApiParam({ name: 'qcWarehouseId', description: 'ID QC Warehouse' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async getQCRowsByWarehouse(
        @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getQCRowsByWarehouseId(qcWarehouseId, limit, offset);
        return new GetResponse('qc-management.list.success', data, 'Lấy danh sách QC Rows thành công');
    }

    @Get('warehouses/:qcWarehouseId/rows/:qcRowId/rows')
    @RequirePermission('qc-management.list')
    @ApiOperation({ summary: 'Lấy danh sách Rows của QC Row' })
    @ApiParam({ name: 'qcWarehouseId', description: 'ID QC Warehouse' })
    @ApiParam({ name: 'qcRowId', description: 'ID QC Row' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async getRowsByQCRow(
        @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
        @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getRowsByQCRowId(qcRowId, limit, offset, lang);
        return new GetResponse('qc-management.list.success', data, 'Lấy danh sách Rows thành công');
    }

    @Get('warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId')
    @RequirePermission('qc-management.read')
    @ApiOperation({ summary: 'Lấy chi tiết Row' })
    @ApiParam({ name: 'qcWarehouseId', description: 'ID QC Warehouse' })
    @ApiParam({ name: 'qcRowId', description: 'ID QC Row' })
    @ApiParam({ name: 'rowId', description: 'ID Row' })
    async getRowDetail(
        @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
        @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getRowById(rowId, lang);
        return new GetResponse('qc-management.read.success', data, 'Lấy chi tiết Row thành công');
    }

    @Get('warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId/racks')
    @RequirePermission('qc-management.list')
    @ApiOperation({ summary: 'Lấy danh sách Racks của Row' })
    @ApiParam({ name: 'qcWarehouseId', description: 'ID QC Warehouse' })
    @ApiParam({ name: 'qcRowId', description: 'ID QC Row' })
    @ApiParam({ name: 'rowId', description: 'ID Row' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async getRacksByRow(
        @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
        @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getRacksByRowId(rowId, limit, offset, lang);
        return new GetResponse('qc-management.list.success', data, 'Lấy danh sách Racks thành công');
    }

    @Get('warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId/racks/:rackId')
    @RequirePermission('qc-management.read')
    @ApiOperation({ summary: 'Lấy chi tiết Rack' })
    @ApiParam({ name: 'qcWarehouseId', description: 'ID QC Warehouse' })
    @ApiParam({ name: 'qcRowId', description: 'ID QC Row' })
    @ApiParam({ name: 'rowId', description: 'ID Row' })
    @ApiParam({ name: 'rackId', description: 'ID Rack' })
    async getRackDetail(
        @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
        @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getRackById(rackId, lang);
        return new GetResponse('qc-management.read.success', data, 'Lấy chi tiết Rack thành công');
    }

    @Get('warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId/racks/:rackId/shelves')
    @RequirePermission('qc-management.list')
    @ApiOperation({ summary: 'Lấy danh sách Shelves của Rack' })
    @ApiParam({ name: 'qcWarehouseId', description: 'ID QC Warehouse' })
    @ApiParam({ name: 'qcRowId', description: 'ID QC Row' })
    @ApiParam({ name: 'rowId', description: 'ID Row' })
    @ApiParam({ name: 'rackId', description: 'ID Rack' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async getShelvesByRack(
        @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
        @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getShelvesByRackId(rackId, limit, offset, lang);
        return new GetResponse('qc-management.list.success', data, 'Lấy danh sách Shelves thành công');
    }

    @Get('warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId/racks/:rackId/shelves/:shelfId')
    @RequirePermission('qc-management.read')
    @ApiOperation({ summary: 'Lấy chi tiết Shelf' })
    @ApiParam({ name: 'qcWarehouseId', description: 'ID QC Warehouse' })
    @ApiParam({ name: 'qcRowId', description: 'ID QC Row' })
    @ApiParam({ name: 'rowId', description: 'ID Row' })
    @ApiParam({ name: 'rackId', description: 'ID Rack' })
    @ApiParam({ name: 'shelfId', description: 'ID Shelf' })
    async getShelfDetail(
        @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
        @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getShelfById(shelfId, lang);
        return new GetResponse('qc-management.read.success', data, 'Lấy chi tiết Shelf thành công');
    }

    @Get('warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks')
    @RequirePermission('qc-management.list')
    @ApiOperation({ summary: 'Lấy danh sách Blocks của Shelf' })
    @ApiParam({ name: 'qcWarehouseId', description: 'ID QC Warehouse' })
    @ApiParam({ name: 'qcRowId', description: 'ID QC Row' })
    @ApiParam({ name: 'rowId', description: 'ID Row' })
    @ApiParam({ name: 'rackId', description: 'ID Rack' })
    @ApiParam({ name: 'shelfId', description: 'ID Shelf' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async getBlocksByShelf(
        @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
        @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getBlocksByShelfId(shelfId, limit, offset, lang);
        return new GetResponse('qc-management.list.success', data, 'Lấy danh sách Blocks thành công');
    }

    @Get('warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks/:blockId')
    @RequirePermission('qc-management.read')
    @ApiOperation({ summary: 'Lấy chi tiết Block' })
    @ApiParam({ name: 'qcWarehouseId', description: 'ID QC Warehouse' })
    @ApiParam({ name: 'qcRowId', description: 'ID QC Row' })
    @ApiParam({ name: 'rowId', description: 'ID Row' })
    @ApiParam({ name: 'rackId', description: 'ID Rack' })
    @ApiParam({ name: 'shelfId', description: 'ID Shelf' })
    @ApiParam({ name: 'blockId', description: 'ID Block' })
    async getBlockDetail(
        @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
        @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @Param('blockId', ParseUUIDPipe) blockId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.qcManagementService.getBlockById(blockId, lang);
        return new GetResponse('qc-management.read.success', data, 'Lấy chi tiết Block thành công');
    }

    @Get('permissions')
    @RequirePermission('qc-management.list')
    @ApiOperation({ summary: 'Lấy danh sách QC Permissions' })
    async getPermissions(@I18nLang() lang: string) {
        const data = await this.qcManagementService.getAllPermissions();
        return new GetResponse('qc-management.permissions.success', data, 'Lấy danh sách QC Permissions thành công');
    }

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

