import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiBody,
    ApiBearerAuth,
    ApiSecurity,
    ApiResponse,
} from '@nestjs/swagger';
import { I18nLang, I18nService } from 'nestjs-i18n';

import { InventoryRequestService } from './inventory-request.service';
import {
    CreateInboundRequestDto,
    CreateOutboundRequestDto,
    QueryInboundRequestDto,
    QueryOutboundRequestDto,
    ApproveRequestDto,
    RejectRequestDto,
    StartReceivingDto,
    ConfirmReceivingDto,
    ConfirmPutawayDto,
    ConfirmPickingDto,
    ConfirmCheckingDto,
    CompleteShipmentDto,
} from './dto';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';
import { OrgPermissionGuard } from '../../common/guards/org-permission.guard';
import { RequireOrgPermission } from '../../common/decorators/require-org-permission.decorator';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { CreatedResponse, GetResponse, UpdatedResponse } from '../../common/responses/success.response';

@ApiTags('Inventory Request (Organization) (Collapsed)')
@ApiBearerAuth()
@ApiSecurity('api-key')
@Controller('organizations/:orgId/inventory')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
export class InventoryRequestController {
    constructor(
        private readonly inventoryRequestService: InventoryRequestService,
        private readonly i18n: I18nService,
    ) { }

    @Get('warehouses')
    @RequireOrgPermission('org.inventory.inbound.list')
    @ApiOperation({
        summary: 'Danh sách kho của tổ chức',
        description: 'Lấy danh sách kho mà tổ chức đang có hợp đồng thuê đang hoạt động.',
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách kho thành công' })
    async listOrgWarehouses(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @I18nLang() lang: string,
    ) {
        const warehouses = await this.inventoryRequestService.listOrgWarehouses(orgId);
        return new GetResponse(
            'inventory-request.list_warehouses',
            warehouses,
            await this.i18n.translate('inventory-request.success.list_inbound', { lang }),
        );
    }

    @Get('stock')
    @RequireOrgPermission('org.inventory.inbound.list')
    @ApiOperation({
        summary: 'Danh sách tồn kho',
        description: 'Lấy danh sách tồn kho thực tế của tổ chức, có thể lọc theo kho.',
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách tồn kho thành công' })
    async listStock(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query('warehouse_id') warehouseId: string | undefined,
        @Query('keywords') keywords: string | undefined,
        @I18nLang() lang: string,
    ) {
        const items = await this.inventoryRequestService.listInventoryStock(orgId, warehouseId, keywords);
        return new GetResponse(
            'inventory-request.list_stock',
            items,
            lang === 'vi' ? 'Lấy danh sách tồn kho thành công' : 'Stock list retrieved',
        );
    }

    @Post('inbound')
    @RequireOrgPermission('org.inventory.inbound.create')
    @ApiOperation({
        summary: 'Tạo yêu cầu nhập kho',
        description: `
Tạo phiếu yêu cầu nhập kho mới cho tổ chức.

**Quy trình:**
1. Member org tạo yêu cầu với danh sách sản phẩm cần nhập
2. Phiếu được tạo với status \`PENDING\`
3. Warehouse Manager xử lý (approve/reject)

**Permissions:** \`org.inventory.inbound.create\`

**Lưu ý:**
- Warehouse phải thuộc tổ chức (có hợp đồng thuê)
- Có thể tạo batch mới hoặc sử dụng batch hiện có
- Partner (nhà cung cấp) là optional
        `,
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string', format: 'uuid' })
    @ApiBody({ type: CreateInboundRequestDto })
    @ApiResponse({
        status: 201,
        description: 'Tạo yêu cầu nhập kho thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'inventory-request.create_inbound' },
                message: { type: 'string', example: 'Tạo yêu cầu nhập kho thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        code: { type: 'string', example: 'PN-202602-0001' },
                        status: { type: 'string', example: 'PENDING' },
                        warehouse: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string' },
                            },
                        },
                        details: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    product_id: { type: 'string', format: 'uuid' },
                                    expected_qty: { type: 'number' },
                                },
                            },
                        },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    })
    async createInbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: CreateInboundRequestDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const receipt = await this.inventoryRequestService.createInbound(orgId, dto, actorId, lang);
        return new CreatedResponse(
            'inventory-request.create_inbound',
            receipt,
            await this.i18n.translate('inventory-request.success.create_inbound', { lang }),
        );
    }

    @Get('inbound')
    @RequireOrgPermission('org.inventory.inbound.list')
    @ApiOperation({
        summary: 'Danh sách yêu cầu nhập kho',
        description: `
Lấy danh sách phiếu nhập kho của tổ chức.

**Filters:**
- \`warehouse_id\`: Lọc theo kho
- \`status\`: Lọc theo trạng thái (PENDING, PROCESSING, COMPLETED, CANCELLED)
- \`keywords\`: Tìm theo mã phiếu hoặc mã đơn mua

**Permissions:** \`org.inventory.inbound.list\`
        `,
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string', format: 'uuid' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'inventory-request.list_inbound' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: { type: 'array', items: { type: 'object' } },
                        total: { type: 'number', example: 50 },
                        limit: { type: 'number', example: 10 },
                        offset: { type: 'number', example: 0 },
                        hasMore: { type: 'boolean', example: true },
                    },
                },
            },
        },
    })
    async findAllInbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryInboundRequestDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.findAllInbound(orgId, query, lang);
        return new GetResponse(
            'inventory-request.list_inbound',
            result,
            await this.i18n.translate('inventory-request.success.list_inbound', { lang }),
        );
    }

    @Get('inbound/:id')
    @RequireOrgPermission('org.inventory.inbound.list')
    @ApiOperation({
        summary: 'Chi tiết yêu cầu nhập kho',
        description: `
Lấy chi tiết một phiếu nhập kho.

**Permissions:** \`org.inventory.inbound.list\`
        `,
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', description: 'ID của phiếu nhập', type: 'string', format: 'uuid' })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết thành công',
    })
    async findInboundById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const receipt = await this.inventoryRequestService.findInboundById(orgId, id, lang);
        return new GetResponse(
            'inventory-request.get_inbound',
            receipt,
            await this.i18n.translate('inventory-request.success.get_inbound', { lang }),
        );
    }

    @Post('outbound')
    @RequireOrgPermission('org.inventory.outbound.create')
    @ApiOperation({
        summary: 'Tạo yêu cầu xuất kho',
        description: `
Tạo phiếu yêu cầu xuất kho mới cho tổ chức.

**Quy trình:**
1. Member org tạo yêu cầu với danh sách sản phẩm cần xuất
2. Phiếu được tạo với status \`PENDING\`
3. Warehouse Manager xử lý (approve/reject)

**Chiến lược xuất kho:**
- \`FEFO\` (mặc định): First Expired First Out - Hạn sử dụng gần hết xuất trước
- \`FIFO\`: First In First Out - Nhập trước xuất trước

**Permissions:** \`org.inventory.outbound.create\`
        `,
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string', format: 'uuid' })
    @ApiBody({ type: CreateOutboundRequestDto })
    @ApiResponse({
        status: 201,
        description: 'Tạo yêu cầu xuất kho thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'inventory-request.create_outbound' },
                message: { type: 'string', example: 'Tạo yêu cầu xuất kho thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        code: { type: 'string', example: 'PX-202602-0001' },
                        status: { type: 'string', example: 'PENDING' },
                    },
                },
            },
        },
    })
    async createOutbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: CreateOutboundRequestDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const exportRecord = await this.inventoryRequestService.createOutbound(orgId, dto, actorId, lang);
        return new CreatedResponse(
            'inventory-request.create_outbound',
            exportRecord,
            await this.i18n.translate('inventory-request.success.create_outbound', { lang }),
        );
    }

    @Get('outbound')
    @RequireOrgPermission('org.inventory.outbound.list')
    @ApiOperation({
        summary: 'Danh sách yêu cầu xuất kho',
        description: `
Lấy danh sách phiếu xuất kho của tổ chức.

**Filters:**
- \`warehouse_id\`: Lọc theo kho
- \`status\`: Lọc theo trạng thái (PENDING, PICKING, PACKED, SHIPPED, CANCELLED)
- \`keywords\`: Tìm theo mã phiếu hoặc mã đơn bán

**Permissions:** \`org.inventory.outbound.list\`
        `,
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string', format: 'uuid' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
    })
    async findAllOutbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryOutboundRequestDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.findAllOutbound(orgId, query, lang);
        return new GetResponse(
            'inventory-request.list_outbound',
            result,
            await this.i18n.translate('inventory-request.success.list_outbound', { lang }),
        );
    }

    @Get('outbound/:id')
    @RequireOrgPermission('org.inventory.outbound.list')
    @ApiOperation({
        summary: 'Chi tiết yêu cầu xuất kho',
        description: `
Lấy chi tiết một phiếu xuất kho.

**Permissions:** \`org.inventory.outbound.list\`
        `,
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', description: 'ID của phiếu xuất', type: 'string', format: 'uuid' })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết thành công',
    })
    async findOutboundById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const exportRecord = await this.inventoryRequestService.findOutboundById(orgId, id, lang);
        return new GetResponse(
            'inventory-request.get_outbound',
            exportRecord,
            await this.i18n.translate('inventory-request.success.get_outbound', { lang }),
        );
    }

    @Patch('inbound/:id/approve')
    @RequireOrgPermission('org.inventory.inbound.approve')
    @ApiOperation({
        summary: 'Duyệt phiếu nhập kho',
        description: `
Duyệt phiếu nhập kho từ trạng thái \`PENDING\` sang \`APPROVED\`.

**Permissions:** \`org.inventory.inbound.approve\`
        `,
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', description: 'ID của phiếu nhập', type: 'string', format: 'uuid' })
    @ApiBody({ type: ApproveRequestDto })
    @ApiResponse({ status: 200, description: 'Duyệt phiếu nhập thành công' })
    async approveInbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ApproveRequestDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const receipt = await this.inventoryRequestService.approveInbound(orgId, id, actorId, lang, dto.notes);
        return new GetResponse(
            'inventory-request.approve_receipt',
            receipt,
            await this.i18n.translate('inventory-request.success.approve_receipt', { lang }),
        );
    }

    @Patch('inbound/:id/reject')
    @RequireOrgPermission('org.inventory.inbound.approve')
    @ApiOperation({
        summary: 'Từ chối phiếu nhập kho',
        description: `
Từ chối phiếu nhập kho từ trạng thái \`PENDING\` sang \`CANCELLED\`.

**Permissions:** \`org.inventory.inbound.approve\`
        `,
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', description: 'ID của phiếu nhập', type: 'string', format: 'uuid' })
    @ApiBody({ type: RejectRequestDto })
    @ApiResponse({ status: 200, description: 'Từ chối phiếu nhập thành công' })
    async rejectInbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RejectRequestDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const receipt = await this.inventoryRequestService.rejectInbound(orgId, id, actorId, lang, dto.reason);
        return new GetResponse(
            'inventory-request.reject_inbound',
            receipt,
            await this.i18n.translate('inventory-request.success.reject_inbound', { lang }),
        );
    }

    @Patch('outbound/:id/approve')
    @RequireOrgPermission('org.inventory.outbound.approve')
    @ApiOperation({
        summary: 'Duyệt phiếu xuất kho',
        description: `
Duyệt phiếu xuất kho từ trạng thái \`PENDING\` sang \`PICKING\`.

**Permissions:** \`org.inventory.outbound.approve\`
        `,
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', description: 'ID của phiếu xuất', type: 'string', format: 'uuid' })
    @ApiBody({ type: ApproveRequestDto })
    @ApiResponse({ status: 200, description: 'Duyệt phiếu xuất thành công' })
    async approveOutbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ApproveRequestDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const exportRecord = await this.inventoryRequestService.approveOutbound(orgId, id, actorId, lang, dto.notes, dto.picking_strategy || 'FEFO');
        return new GetResponse(
            'inventory-request.approve_outbound',
            exportRecord,
            await this.i18n.translate('inventory-request.success.approve_outbound', { lang }),
        );
    }

    @Patch('outbound/:id/reject')
    @RequireOrgPermission('org.inventory.outbound.approve')
    @ApiOperation({
        summary: 'Từ chối phiếu xuất kho',
        description: `
Từ chối phiếu xuất kho từ trạng thái \`PENDING\` sang \`CANCELLED\`.

**Permissions:** \`org.inventory.outbound.approve\`
        `,
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', description: 'ID của phiếu xuất', type: 'string', format: 'uuid' })
    @ApiBody({ type: RejectRequestDto })
    @ApiResponse({ status: 200, description: 'Từ chối phiếu xuất thành công' })
    async rejectOutbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RejectRequestDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const exportRecord = await this.inventoryRequestService.rejectOutbound(orgId, id, actorId, lang, dto.reason);
        return new GetResponse(
            'inventory-request.reject_outbound',
            exportRecord,
            await this.i18n.translate('inventory-request.success.reject_outbound', { lang }),
        );
    }

    // ==================== INBOUND WORKFLOW STEPS ====================

    @Patch('inbound/:id/start-receiving')
    @RequireOrgPermission('org.inventory.inbound.approve')
    @ApiOperation({ summary: 'Bắt đầu kiểm đếm phiếu nhập (APPROVED → RECEIVING)' })
    @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiBody({ type: StartReceivingDto })
    async startReceiving(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: StartReceivingDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.startReceiving(orgId, id, actorId, lang, dto);
        return new UpdatedResponse('inventory-request.start_receiving', result,
            lang === 'vi' ? 'Đã bắt đầu kiểm đếm' : 'Receiving started');
    }

    @Patch('inbound/:id/confirm-receiving')
    @RequireOrgPermission('org.inventory.inbound.approve')
    @ApiOperation({ summary: 'Xác nhận kiểm đếm (RECEIVING → PROCESSING)' })
    @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiBody({ type: ConfirmReceivingDto })
    async confirmReceiving(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmReceivingDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.confirmReceiving(orgId, id, actorId, lang, dto);
        return new UpdatedResponse('inventory-request.confirm_receiving', result,
            lang === 'vi' ? 'Đã xác nhận kiểm đếm' : 'Receiving confirmed');
    }

    @Patch('inbound/:id/confirm-putaway')
    @RequireOrgPermission('org.inventory.inbound.approve')
    @ApiOperation({ summary: 'Xác nhận cất hàng — hoàn tất phiếu nhập (PROCESSING → COMPLETED)' })
    @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiBody({ type: ConfirmPutawayDto })
    async confirmPutaway(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmPutawayDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.confirmPutaway(orgId, id, actorId, lang, dto);
        return new UpdatedResponse('inventory-request.confirm_putaway', result,
            lang === 'vi' ? 'Đã xác nhận cất hàng — hoàn tất nhập kho' : 'Putaway confirmed — inbound completed');
    }

    @Patch('inbound/:id/refill-inventory')
    @RequireOrgPermission('org.inventory.inbound.approve')
    @ApiOperation({
        summary: 'Bổ sung tồn kho cho phiếu nhập đã hoàn tất',
        description: 'Dùng khi phiếu nhập đã COMPLETED nhưng tồn kho chưa được tạo (do thiếu cấu trúc kho tại thời điểm xử lý)',
    })
    @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    async refillInventory(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.refillInventory(orgId, id, actorId, lang);
        return new UpdatedResponse('inventory-request.refill_inventory', result,
            lang === 'vi' ? 'Đã bổ sung tồn kho thành công' : 'Inventory refilled successfully');
    }

    // ==================== OUTBOUND WORKFLOW STEPS ====================

    @Patch('outbound/:id/confirm-picking')
    @RequireOrgPermission('org.inventory.outbound.approve')
    @ApiOperation({ summary: 'Xác nhận nhặt hàng (PICKING → CHECKING)' })
    @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiBody({ type: ConfirmPickingDto })
    async confirmPicking(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmPickingDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.confirmPicking(orgId, id, actorId, lang, dto);
        return new UpdatedResponse('inventory-request.confirm_picking', result,
            lang === 'vi' ? 'Đã xác nhận nhặt hàng' : 'Picking confirmed');
    }

    @Patch('outbound/:id/confirm-checking')
    @RequireOrgPermission('org.inventory.outbound.approve')
    @ApiOperation({ summary: 'Xác nhận kiểm tra xuất (CHECKING → PACKED)' })
    @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiBody({ type: ConfirmCheckingDto })
    async confirmChecking(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmCheckingDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.confirmChecking(orgId, id, actorId, lang, dto);
        return new UpdatedResponse('inventory-request.confirm_checking', result,
            lang === 'vi' ? 'Đã xác nhận kiểm tra' : 'Checking confirmed');
    }

    @Patch('outbound/:id/complete-shipment')
    @RequireOrgPermission('org.inventory.outbound.approve')
    @ApiOperation({ summary: 'Hoàn tất xuất kho (PACKED → SHIPPED)' })
    @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiBody({ type: CompleteShipmentDto })
    async completeShipment(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CompleteShipmentDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.completeShipment(orgId, id, actorId, lang, dto);
        return new UpdatedResponse('inventory-request.complete_shipment', result,
            lang === 'vi' ? 'Hoàn tất xuất kho' : 'Shipment completed');
    }
}
