import { Controller, Get, Param, Query, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ApiAuthResponses } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WarehouseManagerPermissionGuard } from '../../common/guards/warehouse-manager-permission.guard';
import { RequireWMPermission } from '../../common/decorators/require-wm-permission.decorator';
import { WarehouseManagerViewService } from './warehouse-manager-view.service';
import { QueryWarehouseManagerViewDto } from './dto/query-warehouse-manager-view.dto';

/**
 * Controller cho Warehouse Manager View APIs
 * Sử dụng hệ thống permission riêng của Warehouse Manager
 * Route pattern: /warehouse-managers/templates/:templateId/...
 */
@ApiTags('Warehouse Manager View')
@Controller('warehouse-managers/templates')
@UseGuards(JwtAuthGuard, WarehouseManagerPermissionGuard)
@ApiBearerAuth('JWT-auth')
export class WarehouseManagerViewController {
    constructor(
        private readonly warehouseManagerViewService: WarehouseManagerViewService,
    ) { }

    @Get(':templateId/warehouses')
    @RequireWMPermission('warehouse.view')
    @ApiOperation({
        summary: 'Lấy danh sách kho thực tế theo template',
        description: 'Lấy danh sách các kho thực tế được tạo từ template mà manager được gán. Yêu cầu permission `warehouse.view` trong hệ thống Warehouse Manager.',
    })
    @ApiAuthResponses()
    @ApiParam({
        name: 'templateId',
        type: 'string',
        description: 'ID của kho mẫu (UUID)',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Số lượng record mỗi trang (mặc định: 10)' })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0, description: 'Vị trí bắt đầu (mặc định: 0)' })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Tìm kiếm theo tên hoặc mô tả' })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Lọc theo trạng thái hoạt động' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách kho thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager.warehouse_view_list_success' },
                message: { type: 'string', example: 'Lấy danh sách kho thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: { type: 'array' },
                        total: { type: 'number' },
                        limit: { type: 'number' },
                        offset: { type: 'number' },
                        hasMore: { type: 'boolean' },
                    }
                }
            }
        }
    })
    async getWarehouses(
        @Param('templateId', ParseUUIDPipe) templateId: string,
        @Query() query: QueryWarehouseManagerViewDto,
        @Request() req: any,
    ) {
        const lang = req.headers['accept-language'] || 'vi';
        const userId = req.user.userId;
        return this.warehouseManagerViewService.findWarehousesByTemplate(templateId, query, userId, lang);
    }

    @Get(':templateId/warehouses/:warehouseId')
    @RequireWMPermission('warehouse.view')
    @ApiOperation({
        summary: 'Lấy chi tiết kho thực tế',
        description: 'Lấy thông tin chi tiết của một kho thực tế theo ID.',
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'templateId', type: 'string', description: 'ID của kho mẫu (UUID)' })
    @ApiParam({ name: 'warehouseId', type: 'string', description: 'ID của kho thực tế (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết kho thành công',
    })
    async getWarehouseDetail(
        @Param('templateId', ParseUUIDPipe) templateId: string,
        @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
        @Request() req: any,
    ) {
        const lang = req.headers['accept-language'] || 'vi';
        const userId = req.user.userId;
        return this.warehouseManagerViewService.findWarehouseDetail(templateId, warehouseId, userId, lang);
    }

    @Get(':templateId/warehouses/:warehouseId/rows')
    @RequireWMPermission('warehouse.view')
    @ApiOperation({
        summary: 'Lấy danh sách dãy trong kho',
        description: 'Lấy danh sách các dãy (rows) trong kho thực tế.',
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'templateId', type: 'string', description: 'ID của kho mẫu (UUID)' })
    @ApiParam({ name: 'warehouseId', type: 'string', description: 'ID của kho thực tế (UUID)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Lấy danh sách dãy thành công' })
    async getRows(
        @Param('templateId', ParseUUIDPipe) templateId: string,
        @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
        @Query() query: QueryWarehouseManagerViewDto,
        @Request() req: any,
    ) {
        const lang = req.headers['accept-language'] || 'vi';
        const userId = req.user.userId;
        return this.warehouseManagerViewService.findRowsByWarehouse(templateId, warehouseId, query, userId, lang);
    }

    @Get(':templateId/warehouses/:warehouseId/rows/:rowId')
    @RequireWMPermission('warehouse.view')
    @ApiOperation({
        summary: 'Lấy chi tiết dãy',
        description: 'Lấy thông tin chi tiết của một dãy.',
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'templateId', type: 'string', description: 'ID của kho mẫu (UUID)' })
    @ApiParam({ name: 'warehouseId', type: 'string', description: 'ID của kho thực tế (UUID)' })
    @ApiParam({ name: 'rowId', type: 'string', description: 'ID của dãy (UUID)' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết dãy thành công' })
    async getRowDetail(
        @Param('templateId', ParseUUIDPipe) templateId: string,
        @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Request() req: any,
    ) {
        const lang = req.headers['accept-language'] || 'vi';
        const userId = req.user.userId;
        return this.warehouseManagerViewService.findRowDetail(templateId, warehouseId, rowId, userId, lang);
    }

    @Get(':templateId/warehouses/:warehouseId/rows/:rowId/racks')
    @RequireWMPermission('warehouse.view')
    @ApiOperation({
        summary: 'Lấy danh sách kệ trong dãy',
        description: 'Lấy danh sách các kệ (racks) trong dãy.',
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'templateId', type: 'string', description: 'ID của kho mẫu (UUID)' })
    @ApiParam({ name: 'warehouseId', type: 'string', description: 'ID của kho thực tế (UUID)' })
    @ApiParam({ name: 'rowId', type: 'string', description: 'ID của dãy (UUID)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Lấy danh sách kệ thành công' })
    async getRacks(
        @Param('templateId', ParseUUIDPipe) templateId: string,
        @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Query() query: QueryWarehouseManagerViewDto,
        @Request() req: any,
    ) {
        const lang = req.headers['accept-language'] || 'vi';
        const userId = req.user.userId;
        return this.warehouseManagerViewService.findRacksByRow(templateId, warehouseId, rowId, query, userId, lang);
    }

    @Get(':templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId')
    @RequireWMPermission('warehouse.view')
    @ApiOperation({
        summary: 'Lấy chi tiết kệ',
        description: 'Lấy thông tin chi tiết của một kệ.',
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'templateId', type: 'string', description: 'ID của kho mẫu (UUID)' })
    @ApiParam({ name: 'warehouseId', type: 'string', description: 'ID của kho thực tế (UUID)' })
    @ApiParam({ name: 'rowId', type: 'string', description: 'ID của dãy (UUID)' })
    @ApiParam({ name: 'rackId', type: 'string', description: 'ID của kệ (UUID)' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết kệ thành công' })
    async getRackDetail(
        @Param('templateId', ParseUUIDPipe) templateId: string,
        @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Request() req: any,
    ) {
        const lang = req.headers['accept-language'] || 'vi';
        const userId = req.user.userId;
        return this.warehouseManagerViewService.findRackDetail(templateId, warehouseId, rowId, rackId, userId, lang);
    }

    @Get(':templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId/shelves')
    @RequireWMPermission('warehouse.view')
    @ApiOperation({
        summary: 'Lấy danh sách tầng trong kệ',
        description: 'Lấy danh sách các tầng (shelves) trong kệ.',
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'templateId', type: 'string', description: 'ID của kho mẫu (UUID)' })
    @ApiParam({ name: 'warehouseId', type: 'string', description: 'ID của kho thực tế (UUID)' })
    @ApiParam({ name: 'rowId', type: 'string', description: 'ID của dãy (UUID)' })
    @ApiParam({ name: 'rackId', type: 'string', description: 'ID của kệ (UUID)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Lấy danh sách tầng thành công' })
    async getShelves(
        @Param('templateId', ParseUUIDPipe) templateId: string,
        @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Query() query: QueryWarehouseManagerViewDto,
        @Request() req: any,
    ) {
        const lang = req.headers['accept-language'] || 'vi';
        const userId = req.user.userId;
        return this.warehouseManagerViewService.findShelvesByRack(templateId, warehouseId, rowId, rackId, query, userId, lang);
    }

    @Get(':templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId/shelves/:shelfId')
    @RequireWMPermission('warehouse.view')
    @ApiOperation({
        summary: 'Lấy chi tiết tầng',
        description: 'Lấy thông tin chi tiết của một tầng bao gồm sản phẩm được gán.',
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'templateId', type: 'string', description: 'ID của kho mẫu (UUID)' })
    @ApiParam({ name: 'warehouseId', type: 'string', description: 'ID của kho thực tế (UUID)' })
    @ApiParam({ name: 'rowId', type: 'string', description: 'ID của dãy (UUID)' })
    @ApiParam({ name: 'rackId', type: 'string', description: 'ID của kệ (UUID)' })
    @ApiParam({ name: 'shelfId', type: 'string', description: 'ID của tầng (UUID)' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết tầng thành công' })
    async getShelfDetail(
        @Param('templateId', ParseUUIDPipe) templateId: string,
        @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @Request() req: any,
    ) {
        const lang = req.headers['accept-language'] || 'vi';
        const userId = req.user.userId;
        return this.warehouseManagerViewService.findShelfDetail(templateId, warehouseId, rowId, rackId, shelfId, userId, lang);
    }

    @Get(':templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks')
    @RequireWMPermission('warehouse.view')
    @ApiOperation({
        summary: 'Lấy danh sách ô trong tầng',
        description: 'Lấy danh sách các ô (blocks) trong tầng.',
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'templateId', type: 'string', description: 'ID của kho mẫu (UUID)' })
    @ApiParam({ name: 'warehouseId', type: 'string', description: 'ID của kho thực tế (UUID)' })
    @ApiParam({ name: 'rowId', type: 'string', description: 'ID của dãy (UUID)' })
    @ApiParam({ name: 'rackId', type: 'string', description: 'ID của kệ (UUID)' })
    @ApiParam({ name: 'shelfId', type: 'string', description: 'ID của tầng (UUID)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Lấy danh sách ô thành công' })
    async getBlocks(
        @Param('templateId', ParseUUIDPipe) templateId: string,
        @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @Query() query: QueryWarehouseManagerViewDto,
        @Request() req: any,
    ) {
        const lang = req.headers['accept-language'] || 'vi';
        const userId = req.user.userId;
        return this.warehouseManagerViewService.findBlocksByShelf(templateId, warehouseId, rowId, rackId, shelfId, query, userId, lang);
    }

    @Get(':templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks/:blockId')
    @RequireWMPermission('warehouse.view')
    @ApiOperation({
        summary: 'Lấy chi tiết ô',
        description: 'Lấy thông tin chi tiết của một ô bao gồm thông tin tồn kho.',
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'templateId', type: 'string', description: 'ID của kho mẫu (UUID)' })
    @ApiParam({ name: 'warehouseId', type: 'string', description: 'ID của kho thực tế (UUID)' })
    @ApiParam({ name: 'rowId', type: 'string', description: 'ID của dãy (UUID)' })
    @ApiParam({ name: 'rackId', type: 'string', description: 'ID của kệ (UUID)' })
    @ApiParam({ name: 'shelfId', type: 'string', description: 'ID của tầng (UUID)' })
    @ApiParam({ name: 'blockId', type: 'string', description: 'ID của ô (UUID)' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết ô thành công' })
    async getBlockDetail(
        @Param('templateId', ParseUUIDPipe) templateId: string,
        @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @Param('blockId', ParseUUIDPipe) blockId: string,
        @Request() req: any,
    ) {
        const lang = req.headers['accept-language'] || 'vi';
        const userId = req.user.userId;
        return this.warehouseManagerViewService.findBlockDetail(templateId, warehouseId, rowId, rackId, shelfId, blockId, userId, lang);
    }
}
