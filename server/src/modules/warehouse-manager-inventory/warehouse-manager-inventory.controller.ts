import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    Request,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiBody,
    ApiBearerAuth,
    ApiResponse,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { WarehouseManagerInventoryService } from './warehouse-manager-inventory.service';
import {
    QueryPendingInboundDto,
    QueryPendingOutboundDto,
    ApproveInboundDto,
    RejectInboundDto,
    ApproveOutboundDto,
    RejectOutboundDto,
    StartReceivingDto,
    ConfirmReceivingDto,
    ConfirmPutawayDto,
    ConfirmPickingDto,
    ConfirmCheckingDto,
    CompleteShipmentDto,
    AssignWorkersDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WarehouseManagerPermissionGuard } from '../../common/guards/warehouse-manager-permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetResponse, UpdatedResponse } from '../../common/responses/success.response';

@ApiTags('Warehouse Manager - Inventory (Collapsed)')
@ApiBearerAuth()
@Controller('warehouse-manager/inventory')
@UseGuards(JwtAuthGuard, WarehouseManagerPermissionGuard)
export class WarehouseManagerInventoryController {
    constructor(
        private readonly warehouseManagerInventoryService: WarehouseManagerInventoryService,
    ) { }

    // ==================== INBOUND (PHIẾU NHẬP) ====================

    @Get('inbound')
    @RequirePermission('warehouse-manager.inventory.inbound.list')
    @ApiOperation({
        summary: 'Danh sách yêu cầu nhập kho chờ xử lý',
        description: `
Lấy danh sách phiếu nhập kho đang chờ xử lý (status = PENDING) cho các kho mà Warehouse Manager quản lý.

**Permissions:** \`warehouse-manager.inventory.inbound.list\`
        `,
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'inventory-request.list_pending_inbound' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: { type: 'array', items: { type: 'object' } },
                        total: { type: 'number' },
                        limit: { type: 'number' },
                        offset: { type: 'number' },
                        hasMore: { type: 'boolean' },
                    },
                },
            },
        },
    })
    async findPendingInbound(
        @Query() query: QueryPendingInboundDto,
        @Request() req: any,
        @I18nLang() lang: string,
    ) {
        // req.warehouseIds được set bởi WarehouseManagerPermissionGuard
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.findPendingInbound(
            warehouseIds,
            query,
            lang,
        );
        return new GetResponse(
            'inventory-request.list_pending_inbound',
            result,
            lang === 'vi' ? 'Lấy danh sách yêu cầu nhập chờ xử lý thành công' : 'Pending inbound requests fetched successfully',
        );
    }

    @Post('inbound/:id/approve')
    @RequirePermission('warehouse-manager.inventory.inbound.approve')
    @ApiOperation({
        summary: 'Xác nhận nhập kho',
        description: `
Xác nhận và thực hiện nhập kho cho phiếu đang PENDING.

**Quy trình:**
1. Validate phiếu nhập
2. Cập nhật actual_qty (nếu có)
3. Chạy thuật toán fill hàng vào kho:
   - Ưu tiên shelves có assigned_product_id
   - Sắp xếp: Row ASC → Rack ASC → Shelf DESC → Block ASC
4. Tạo Inventory records và InventoryTransaction
5. Cập nhật status = COMPLETED

**Permissions:** \`warehouse-manager.inventory.inbound.approve\`
        `,
    })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', type: 'string', format: 'uuid' })
    @ApiBody({ type: ApproveInboundDto })
    @ApiResponse({
        status: 200,
        description: 'Xác nhận nhập kho thành công',
    })
    async approveInbound(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ApproveInboundDto,
        @Request() req: any,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.approveInbound(
            id,
            warehouseIds,
            dto,
            userId,
            lang,
        );
        return new UpdatedResponse(
            'inventory-request.approve_inbound',
            result,
            lang === 'vi' ? 'Xác nhận nhập kho thành công' : 'Inbound approved successfully',
        );
    }

    @Post('inbound/:id/reject')
    @RequirePermission('warehouse-manager.inventory.inbound.reject')
    @ApiOperation({
        summary: 'Từ chối yêu cầu nhập kho',
        description: `
Từ chối phiếu nhập kho đang PENDING.

**Permissions:** \`warehouse-manager.inventory.inbound.reject\`
        `,
    })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', type: 'string', format: 'uuid' })
    @ApiBody({ type: RejectInboundDto })
    @ApiResponse({
        status: 200,
        description: 'Từ chối thành công',
    })
    async rejectInbound(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RejectInboundDto,
        @Request() req: any,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.rejectInbound(
            id,
            warehouseIds,
            dto,
            userId,
            lang,
        );
        return new UpdatedResponse(
            'inventory-request.reject_inbound',
            result,
            lang === 'vi' ? 'Từ chối yêu cầu nhập kho thành công' : 'Inbound request rejected successfully',
        );
    }

    // ==================== OUTBOUND (PHIẾU XUẤT) ====================

    @Get('outbound')
    @RequirePermission('warehouse-manager.inventory.outbound.list')
    @ApiOperation({
        summary: 'Danh sách yêu cầu xuất kho chờ xử lý',
        description: `
Lấy danh sách phiếu xuất kho đang chờ xử lý (status = PENDING) cho các kho mà Warehouse Manager quản lý.

**Permissions:** \`warehouse-manager.inventory.outbound.list\`
        `,
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
    })
    async findPendingOutbound(
        @Query() query: QueryPendingOutboundDto,
        @Request() req: any,
        @I18nLang() lang: string,
    ) {
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.findPendingOutbound(
            warehouseIds,
            query,
            lang,
        );
        return new GetResponse(
            'inventory-request.list_pending_outbound',
            result,
            lang === 'vi' ? 'Lấy danh sách yêu cầu xuất chờ xử lý thành công' : 'Pending outbound requests fetched successfully',
        );
    }

    @Post('outbound/:id/approve')
    @RequirePermission('warehouse-manager.inventory.outbound.approve')
    @ApiOperation({
        summary: 'Xác nhận xuất kho',
        description: `
Xác nhận và thực hiện xuất kho cho phiếu đang PENDING.

**Quy trình:**
1. Validate phiếu xuất
2. Chạy thuật toán pick hàng từ kho:
   - FEFO: First Expired First Out (mặc định)
   - FIFO: First In First Out
3. Trừ Inventory và tạo InventoryTransaction
4. Cập nhật status = SHIPPED

**Permissions:** \`warehouse-manager.inventory.outbound.approve\`
        `,
    })
    @ApiParam({ name: 'id', description: 'ID phiếu xuất', type: 'string', format: 'uuid' })
    @ApiBody({ type: ApproveOutboundDto })
    @ApiResponse({
        status: 200,
        description: 'Xác nhận xuất kho thành công',
    })
    async approveOutbound(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ApproveOutboundDto,
        @Request() req: any,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.approveOutbound(
            id,
            warehouseIds,
            dto,
            userId,
            lang,
        );
        return new UpdatedResponse(
            'inventory-request.approve_outbound',
            result,
            lang === 'vi' ? 'Xác nhận xuất kho thành công' : 'Outbound approved successfully',
        );
    }

    @Post('outbound/:id/reject')
    @RequirePermission('warehouse-manager.inventory.outbound.reject')
    @ApiOperation({
        summary: 'Từ chối yêu cầu xuất kho',
        description: `
Từ chối phiếu xuất kho đang PENDING.

**Permissions:** \`warehouse-manager.inventory.outbound.reject\`
        `,
    })
    @ApiParam({ name: 'id', description: 'ID phiếu xuất', type: 'string', format: 'uuid' })
    @ApiBody({ type: RejectOutboundDto })
    @ApiResponse({
        status: 200,
        description: 'Từ chối thành công',
    })
    async rejectOutbound(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RejectOutboundDto,
        @Request() req: any,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.rejectOutbound(
            id,
            warehouseIds,
            dto,
            userId,
            lang,
        );
        return new UpdatedResponse(
            'inventory-request.reject_outbound',
            result,
            lang === 'vi' ? 'Từ chối yêu cầu xuất kho thành công' : 'Outbound request rejected successfully',
        );
    }

    // ==================== INBOUND WORKFLOW STEPS ====================

    @Post('inbound/:id/start-receiving')
    @RequirePermission('warehouse-manager.inventory.inbound.receive')
    @ApiOperation({
        summary: 'Bắt đầu kiểm đếm nhập kho',
        description: `
Bắt đầu quá trình kiểm đếm cho phiếu nhập đã được duyệt (status = APPROVED).

**Quy trình:**
1. Validate phiếu nhập có status APPROVED
2. Chỉ định Checker (nếu có)
3. Cập nhật status → RECEIVING

**Permissions:** \`warehouse-manager.inventory.inbound.receive\`
        `,
    })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', type: 'string', format: 'uuid' })
    @ApiBody({ type: StartReceivingDto })
    @ApiResponse({ status: 200, description: 'Bắt đầu kiểm đếm thành công' })
    async startReceiving(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: StartReceivingDto,
        @Request() req: any,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.startReceiving(
            id,
            warehouseIds,
            dto,
            userId,
            lang,
        );
        return new UpdatedResponse(
            'inventory-request.start_receiving',
            result,
            lang === 'vi' ? 'Bắt đầu kiểm đếm thành công' : 'Receiving started successfully',
        );
    }

    @Post('inbound/:id/confirm-receiving')
    @RequirePermission('warehouse-manager.inventory.inbound.receive')
    @ApiOperation({
        summary: 'Xác nhận kiểm đếm nhập kho',
        description: `
Xác nhận kết quả kiểm đếm cho phiếu nhập (status = RECEIVING).

**Quy trình:**
1. Validate phiếu nhập có status RECEIVING
2. Cập nhật actual_qty cho từng detail
3. Cập nhật status → PROCESSING

**Permissions:** \`warehouse-manager.inventory.inbound.receive\`
        `,
    })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', type: 'string', format: 'uuid' })
    @ApiBody({ type: ConfirmReceivingDto })
    @ApiResponse({ status: 200, description: 'Xác nhận kiểm đếm thành công' })
    async confirmReceiving(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmReceivingDto,
        @Request() req: any,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.confirmReceiving(
            id,
            warehouseIds,
            dto,
            userId,
            lang,
        );
        return new UpdatedResponse(
            'inventory-request.confirm_receiving',
            result,
            lang === 'vi' ? 'Xác nhận kiểm đếm thành công' : 'Receiving confirmed successfully',
        );
    }

    @Post('inbound/:id/confirm-putaway')
    @RequirePermission('warehouse-manager.inventory.inbound.putaway')
    @ApiOperation({
        summary: 'Xác nhận cất hàng vào kho',
        description: `
Xác nhận hoàn tất cất hàng vào kho (status = PROCESSING → COMPLETED).

**Quy trình:**
1. Validate phiếu nhập có status PROCESSING
2. Fill inventory theo thuật toán
3. Tạo ReceiptPutaway + InventoryTransaction
4. Cập nhật status → COMPLETED

**Permissions:** \`warehouse-manager.inventory.inbound.putaway\`
        `,
    })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', type: 'string', format: 'uuid' })
    @ApiBody({ type: ConfirmPutawayDto })
    @ApiResponse({ status: 200, description: 'Xác nhận cất hàng thành công' })
    async confirmPutaway(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmPutawayDto,
        @Request() req: any,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.confirmPutaway(
            id,
            warehouseIds,
            dto,
            userId,
            lang,
        );
        return new UpdatedResponse(
            'inventory-request.confirm_putaway',
            result,
            lang === 'vi' ? 'Xác nhận cất hàng thành công' : 'Putaway confirmed successfully',
        );
    }

    @Post('inbound/:id/assign-workers')
    @RequirePermission('warehouse-manager.inventory.inbound.approve')
    @ApiOperation({
        summary: 'Phân công nhân viên cho phiếu nhập',
        description: `
Phân công checker/worker cho phiếu nhập. Không thay đổi status.

**Permissions:** \`warehouse-manager.inventory.inbound.approve\`
        `,
    })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', type: 'string', format: 'uuid' })
    @ApiBody({ type: AssignWorkersDto })
    @ApiResponse({ status: 200, description: 'Phân công thành công' })
    async assignWorkers(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AssignWorkersDto,
        @Request() req: any,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.assignWorkers(
            id,
            warehouseIds,
            dto,
            userId,
            lang,
        );
        return new UpdatedResponse(
            'inventory-request.assign_workers',
            result,
            lang === 'vi' ? 'Phân công nhân viên thành công' : 'Workers assigned successfully',
        );
    }

    // ==================== OUTBOUND WORKFLOW STEPS ====================

    @Post('outbound/:id/confirm-picking')
    @RequirePermission('warehouse-manager.inventory.outbound.pick')
    @ApiOperation({
        summary: 'Xác nhận nhặt hàng',
        description: `
Xác nhận hoàn tất nhặt hàng (status = PICKING → CHECKING).

**Quy trình:**
1. Validate phiếu xuất có status PICKING
2. Cập nhật picked_qty cho pick list details
3. Cập nhật status → CHECKING

**Permissions:** \`warehouse-manager.inventory.outbound.pick\`
        `,
    })
    @ApiParam({ name: 'id', description: 'ID phiếu xuất', type: 'string', format: 'uuid' })
    @ApiBody({ type: ConfirmPickingDto })
    @ApiResponse({ status: 200, description: 'Xác nhận nhặt hàng thành công' })
    async confirmPicking(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmPickingDto,
        @Request() req: any,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.confirmPicking(
            id,
            warehouseIds,
            dto,
            userId,
            lang,
        );
        return new UpdatedResponse(
            'inventory-request.confirm_picking',
            result,
            lang === 'vi' ? 'Xác nhận nhặt hàng thành công' : 'Picking confirmed successfully',
        );
    }

    @Post('outbound/:id/confirm-checking')
    @RequirePermission('warehouse-manager.inventory.outbound.check')
    @ApiOperation({
        summary: 'Xác nhận kiểm tra xuất kho',
        description: `
Xác nhận kiểm tra hàng trước khi đóng gói (status = CHECKING → PACKED).

**Quy trình:**
1. Validate phiếu xuất có status CHECKING
2. Validate checked_qty
3. Cập nhật status → PACKED

**Permissions:** \`warehouse-manager.inventory.outbound.check\`
        `,
    })
    @ApiParam({ name: 'id', description: 'ID phiếu xuất', type: 'string', format: 'uuid' })
    @ApiBody({ type: ConfirmCheckingDto })
    @ApiResponse({ status: 200, description: 'Xác nhận kiểm tra thành công' })
    async confirmChecking(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmCheckingDto,
        @Request() req: any,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.confirmChecking(
            id,
            warehouseIds,
            dto,
            userId,
            lang,
        );
        return new UpdatedResponse(
            'inventory-request.confirm_checking',
            result,
            lang === 'vi' ? 'Xác nhận kiểm tra thành công' : 'Checking confirmed successfully',
        );
    }

    @Post('outbound/:id/complete-shipment')
    @RequirePermission('warehouse-manager.inventory.outbound.ship')
    @ApiOperation({
        summary: 'Hoàn tất xuất kho',
        description: `
Hoàn tất xuất kho và bàn giao (status = PACKED → SHIPPED).

**Quy trình:**
1. Validate phiếu xuất có status PACKED
2. Trừ inventory thật (quantity, on_hand, allocated)
3. Tạo InventoryTransaction
4. Cập nhật status → SHIPPED

**Permissions:** \`warehouse-manager.inventory.outbound.ship\`
        `,
    })
    @ApiParam({ name: 'id', description: 'ID phiếu xuất', type: 'string', format: 'uuid' })
    @ApiBody({ type: CompleteShipmentDto })
    @ApiResponse({ status: 200, description: 'Hoàn tất xuất kho thành công' })
    async completeShipment(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CompleteShipmentDto,
        @Request() req: any,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const warehouseIds = req.warehouseIds || [];
        const result = await this.warehouseManagerInventoryService.completeShipment(
            id,
            warehouseIds,
            dto,
            userId,
            lang,
        );
        return new UpdatedResponse(
            'inventory-request.complete_shipment',
            result,
            lang === 'vi' ? 'Hoàn tất xuất kho thành công' : 'Shipment completed successfully',
        );
    }
}
