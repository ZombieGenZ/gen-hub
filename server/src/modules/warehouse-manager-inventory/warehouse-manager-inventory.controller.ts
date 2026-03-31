import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { WarehouseManagerInventoryService } from './warehouse-manager-inventory.service';
import {
    ApproveInboundDto, ApproveOutboundDto, AssignWorkersDto, CompleteShipmentDto, ConfirmCheckingDto,
    ConfirmPickingDto, ConfirmPutawayDto, ConfirmReceivingDto, QueryPendingInboundDto, QueryPendingOutboundDto,
    RejectInboundDto, RejectOutboundDto, StartReceivingDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WarehouseManagerPermissionGuard } from '../../common/guards/warehouse-manager-permission.guard';
import { ApiAuthResponses, ApiValidationErrorResponse, CurrentUser, RequirePermission } from '../../common/decorators';
import { GetResponse, UpdatedResponse } from '../../common/responses/success.response';

const INBOUND_ID = '550e8400-e29b-41d4-a716-446655440010';
const OUTBOUND_ID = '550e8400-e29b-41d4-a716-446655440020';
const WAREHOUSE_ID = '550e8400-e29b-41d4-a716-446655440003';
const okSchema = (code: string, message: string, id = INBOUND_ID, status = 'COMPLETED') => ({
    type: 'object',
    properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
        success: { type: 'boolean', example: true },
        data: { type: 'object', example: { id, status, updated_at: '2026-03-13T08:00:00.000Z' } },
    },
});
const badRequest = { type: 'object', properties: { code: { type: 'string', example: 'inventory-request.invalid_status' }, message: { type: 'string', example: 'Phiếu hiện tại không hợp lệ để thực hiện thao tác này' }, success: { type: 'boolean', example: false } } };
const notFound = { type: 'object', properties: { code: { type: 'string', example: 'inventory-request.not_found' }, message: { type: 'string', example: 'Không tìm thấy phiếu nhập/xuất kho' }, success: { type: 'boolean', example: false } } };

const inboundDetailSchema = {
    type: 'object',
    properties: {
        code: { type: 'string', example: 'inventory-request.get_inbound' },
        message: { type: 'string', example: 'Lấy chi tiết phiếu nhập thành công' },
        success: { type: 'boolean', example: true },
        data: {
            type: 'object',
            example: {
                id: INBOUND_ID,
                code: 'PN-2026-0001',
                status: 'PENDING',
                warehouse_id: WAREHOUSE_ID,
                partner_name: 'Công ty Vận tải Sao Bắc',
                created_at: '2026-03-31T02:15:00.000Z',
                details: [
                    {
                        detail_id: '550e8400-e29b-41d4-a716-446655440101',
                        product_name: 'Thùng carton A1',
                        expected_qty: 100,
                        actual_qty: null,
                    },
                ],
            },
        },
    },
};
const outboundDetailSchema = {
    type: 'object',
    properties: {
        code: { type: 'string', example: 'inventory-request.get_outbound' },
        message: { type: 'string', example: 'Lấy chi tiết phiếu xuất thành công' },
        success: { type: 'boolean', example: true },
        data: {
            type: 'object',
            example: {
                id: OUTBOUND_ID,
                code: 'PX-2026-0001',
                status: 'PENDING',
                warehouse_id: WAREHOUSE_ID,
                partner_name: 'Công ty ABC Logistics',
                created_at: '2026-03-31T03:30:00.000Z',
                details: [
                    {
                        detail_id: '550e8400-e29b-41d4-a716-446655440201',
                        product_name: 'Kệ thép 3 tầng',
                        quantity: 20,
                        allocated_qty: 18,
                        shortage_qty: 2,
                    },
                ],
            },
        },
    },
};
const splitOutboundSchema = {
    type: 'object',
    properties: {
        code: { type: 'string', example: 'inventory-request.split_outbound' },
        message: { type: 'string', example: 'Tách phiếu xuất thành công' },
        success: { type: 'boolean', example: true },
        data: {
            type: 'object',
            example: {
                original_request_id: OUTBOUND_ID,
                retained_request_id: OUTBOUND_ID,
                split_request_id: '550e8400-e29b-41d4-a716-446655440021',
                retained_items: 2,
                split_items: 1,
            },
        },
    },
};

@ApiTags('Warehouse Manager - Inventory (Collapsed)')
@ApiBearerAuth('JWT-auth')
@Controller('warehouse-manager/inventory')
@UseGuards(JwtAuthGuard, WarehouseManagerPermissionGuard)
export class WarehouseManagerInventoryController {
    constructor(private readonly warehouseManagerInventoryService: WarehouseManagerInventoryService) { }

    @Get('inbound')
    @RequirePermission('warehouse-manager.inventory.inbound.list')
    @ApiOperation({ summary: 'Danh sách yêu cầu nhập kho chờ xử lý', description: 'Lấy danh sách phiếu nhập đang chờ xử lý cho các kho mà Warehouse Manager quản lý. Yêu cầu quyền `warehouse-manager.inventory.inbound.list`.' })
    @ApiQuery({ name: 'warehouse_id', required: false, type: String, description: 'ID kho cần lọc', example: WAREHOUSE_ID })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm', example: 'PN-2026' })
    @ApiQuery({ name: 'status', required: false, type: String, description: 'Lọc trạng thái phiếu nhập. Bỏ trống để lấy toàn bộ', example: 'PENDING' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số bản ghi trên trang', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu', example: 0 })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công', schema: { type: 'object', properties: { code: { type: 'string', example: 'inventory-request.list_pending_inbound' }, message: { type: 'string', example: 'Lấy danh sách yêu cầu nhập chờ xử lý thành công' }, success: { type: 'boolean', example: true }, data: { type: 'object', example: { items: [{ id: INBOUND_ID, code: 'PN-2026-0001', status: 'PENDING' }], total: 12, limit: 10, offset: 0, hasMore: true } } } } })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async findPendingInbound(@Query() query: QueryPendingInboundDto, @Request() req: any, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.findPendingInbound(req.warehouseIds || [], query, lang);
        return new GetResponse('inventory-request.list_pending_inbound', result, lang === 'vi' ? 'Lấy danh sách yêu cầu nhập chờ xử lý thành công' : 'Pending inbound requests fetched successfully');
    }

    @Get('inbound/:id')
    @ApiResponse({ status: 200, description: 'Lấy chi tiết phiếu nhập thành công', schema: inboundDetailSchema })
    @RequirePermission('warehouse-manager.inventory.inbound.list')
    @ApiOperation({ summary: 'Chi tiết phiếu nhập kho', description: 'Lấy chi tiết phiếu nhập theo phạm vi kho mà Warehouse Manager được phân quyền.' })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', example: INBOUND_ID })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết phiếu nhập thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async findInboundById(@Param('id', ParseUUIDPipe) id: string, @Request() req: any, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.getInboundById(id, req.warehouseIds || [], lang);
        return new GetResponse('inventory-request.get_inbound', result, lang === 'vi' ? 'Lấy chi tiết phiếu nhập thành công' : 'Inbound detail fetched successfully');
    }

    @Post('inbound/:id/approve')
    @RequirePermission('warehouse-manager.inventory.inbound.approve')
    @ApiOperation({ summary: 'Xác nhận nhập kho', description: 'Xác nhận phiếu nhập `PENDING`, có thể cập nhật số lượng thực tế trước khi hệ thống fill hàng vào kho. Yêu cầu quyền `warehouse-manager.inventory.inbound.approve`.' })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', example: INBOUND_ID })
    @ApiBody({ type: ApproveInboundDto, description: 'Thông tin xác nhận nhập kho', examples: { basic: { summary: 'Xác nhận cơ bản', value: { notes: 'Đã kiểm tra và xác nhận nhập kho' } }, actual_qty: { summary: 'Có số lượng thực tế', value: { actual_quantities: [{ detail_id: '550e8400-e29b-41d4-a716-446655440100', actual_qty: 95 }], notes: 'Thiếu 5 sản phẩm' } } } })
    @ApiResponse({ status: 200, description: 'Xác nhận nhập kho thành công', schema: okSchema('inventory-request.approve_inbound', 'Xác nhận nhập kho thành công') })
    @ApiResponse({ status: 400, description: 'Phiếu nhập không ở trạng thái hợp lệ', schema: badRequest })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async approveInbound(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveInboundDto, @Request() req: any, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.approveInbound(id, req.warehouseIds || [], dto, userId, lang);
        return new UpdatedResponse('inventory-request.approve_inbound', result, lang === 'vi' ? 'Xác nhận nhập kho thành công' : 'Inbound approved successfully');
    }

    @Post('inbound/:id/assign-workers')
    @RequirePermission('warehouse-manager.inventory.inbound.approve')
    @ApiOperation({ summary: 'Phân công nhân viên cho phiếu nhập', description: 'Phân công checker hoặc worker cho phiếu nhập mà không thay đổi trạng thái. Yêu cầu quyền `warehouse-manager.inventory.inbound.approve`.' })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', example: INBOUND_ID })
    @ApiBody({ type: AssignWorkersDto, description: 'Thông tin checker/worker', examples: { assign: { summary: 'Phân công checker và worker', value: { checker_id: '550e8400-e29b-41d4-a716-446655440111', worker_id: '550e8400-e29b-41d4-a716-446655440112' } } } })
    @ApiResponse({ status: 200, description: 'Phân công thành công', schema: okSchema('inventory-request.assign_workers', 'Phân công nhân viên thành công') })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async assignWorkers(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignWorkersDto, @Request() req: any, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.assignWorkers(id, req.warehouseIds || [], dto, userId, lang);
        return new UpdatedResponse('inventory-request.assign_workers', result, lang === 'vi' ? 'Phân công nhân viên thành công' : 'Workers assigned successfully');
    }

    @Post('inbound/:id/start-receiving')
    @RequirePermission('warehouse-manager.inventory.inbound.receive')
    @ApiOperation({ summary: 'Bắt đầu kiểm đếm nhập kho', description: 'Chuyển phiếu nhập từ `APPROVED` sang `RECEIVING` và có thể chỉ định checker. Yêu cầu quyền `warehouse-manager.inventory.inbound.receive`.' })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', example: INBOUND_ID })
    @ApiBody({ type: StartReceivingDto, description: 'Thông tin checker thực hiện', examples: { checker: { summary: 'Chỉ định checker', value: { checker_id: '550e8400-e29b-41d4-a716-446655440111' } } } })
    @ApiResponse({ status: 200, description: 'Bắt đầu kiểm đếm thành công', schema: okSchema('inventory-request.start_receiving', 'Bắt đầu kiểm đếm thành công') })
    @ApiResponse({ status: 400, description: 'Phiếu nhập không ở trạng thái APPROVED', schema: badRequest })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async startReceiving(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StartReceivingDto, @Request() req: any, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.startReceiving(id, req.warehouseIds || [], dto, userId, lang);
        return new UpdatedResponse('inventory-request.start_receiving', result, lang === 'vi' ? 'Bắt đầu kiểm đếm thành công' : 'Receiving started successfully');
    }

    @Post('inbound/:id/confirm-receiving')
    @RequirePermission('warehouse-manager.inventory.inbound.receive')
    @ApiOperation({ summary: 'Xác nhận kiểm đếm nhập kho', description: 'Xác nhận số lượng thực tế của phiếu nhập ở trạng thái `RECEIVING` và chuyển sang `PROCESSING`. Yêu cầu quyền `warehouse-manager.inventory.inbound.receive`.' })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', example: INBOUND_ID })
    @ApiBody({ type: ConfirmReceivingDto, description: 'Chi tiết kiểm đếm', examples: { full: { summary: 'Kết quả kiểm đếm', value: { details: [{ detail_id: '550e8400-e29b-41d4-a716-446655440101', actual_qty: 100 }], notes: 'Đủ số lượng' } } } })
    @ApiResponse({ status: 200, description: 'Xác nhận kiểm đếm thành công', schema: okSchema('inventory-request.confirm_receiving', 'Xác nhận kiểm đếm thành công', INBOUND_ID, 'PROCESSING') })
    @ApiResponse({ status: 400, description: 'Phiếu nhập không ở trạng thái RECEIVING', schema: badRequest })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async confirmReceiving(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConfirmReceivingDto, @Request() req: any, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.confirmReceiving(id, req.warehouseIds || [], dto, userId, lang);
        return new UpdatedResponse('inventory-request.confirm_receiving', result, lang === 'vi' ? 'Xác nhận kiểm đếm thành công' : 'Receiving confirmed successfully');
    }

    @Post('inbound/:id/confirm-putaway')
    @RequirePermission('warehouse-manager.inventory.inbound.putaway')
    @ApiOperation({ summary: 'Xác nhận cất hàng vào kho', description: 'Xác nhận hoàn tất putaway cho phiếu nhập ở trạng thái `PROCESSING` và cập nhật tồn kho. Yêu cầu quyền `warehouse-manager.inventory.inbound.putaway`.' })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', example: INBOUND_ID })
    @ApiBody({ type: ConfirmPutawayDto, description: 'Chi tiết putaway', examples: { putaway: { summary: 'Hoàn tất cất hàng', value: { details: [{ putaway_detail_id: '550e8400-e29b-41d4-a716-446655440103', actual_qty: 50 }], notes: 'Đã cất đủ' } } } })
    @ApiResponse({ status: 200, description: 'Xác nhận cất hàng thành công', schema: okSchema('inventory-request.confirm_putaway', 'Xác nhận cất hàng thành công') })
    @ApiResponse({ status: 400, description: 'Phiếu nhập không ở trạng thái PROCESSING', schema: badRequest })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async confirmPutaway(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConfirmPutawayDto, @Request() req: any, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.confirmPutaway(id, req.warehouseIds || [], dto, userId, lang);
        return new UpdatedResponse('inventory-request.confirm_putaway', result, lang === 'vi' ? 'Xác nhận cất hàng thành công' : 'Putaway confirmed successfully');
    }

    @Post('inbound/:id/reject')
    @RequirePermission('warehouse-manager.inventory.inbound.reject')
    @ApiOperation({ summary: 'Từ chối yêu cầu nhập kho', description: 'Từ chối phiếu nhập đang ở trạng thái `PENDING`. Yêu cầu quyền `warehouse-manager.inventory.inbound.reject`.' })
    @ApiParam({ name: 'id', description: 'ID phiếu nhập', example: INBOUND_ID })
    @ApiBody({ type: RejectInboundDto, description: 'Lý do từ chối', examples: { reject: { summary: 'Từ chối do lỗi chất lượng', value: { reason: 'Hàng không đúng chất lượng' } } } })
    @ApiResponse({ status: 200, description: 'Từ chối thành công', schema: okSchema('inventory-request.reject_inbound', 'Từ chối yêu cầu nhập kho thành công', INBOUND_ID, 'REJECTED') })
    @ApiResponse({ status: 400, description: 'Phiếu nhập không ở trạng thái PENDING', schema: badRequest })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async rejectInbound(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectInboundDto, @Request() req: any, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.rejectInbound(id, req.warehouseIds || [], dto, userId, lang);
        return new UpdatedResponse('inventory-request.reject_inbound', result, lang === 'vi' ? 'Từ chối yêu cầu nhập kho thành công' : 'Inbound request rejected successfully');
    }

    @Get('outbound')
    @RequirePermission('warehouse-manager.inventory.outbound.list')
    @ApiOperation({ summary: 'Danh sách yêu cầu xuất kho chờ xử lý', description: 'Lấy danh sách phiếu xuất kho `PENDING` cho các kho mà Warehouse Manager quản lý. Yêu cầu quyền `warehouse-manager.inventory.outbound.list`.' })
    @ApiQuery({ name: 'warehouse_id', required: false, type: String, description: 'ID kho cần lọc', example: WAREHOUSE_ID })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm', example: 'PX-2026' })
    @ApiQuery({ name: 'status', required: false, type: String, description: 'Lọc trạng thái phiếu xuất. Bỏ trống để lấy toàn bộ', example: 'PENDING' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số bản ghi trên trang', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu', example: 0 })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công', schema: { type: 'object', properties: { code: { type: 'string', example: 'inventory-request.list_pending_outbound' }, message: { type: 'string', example: 'Lấy danh sách yêu cầu xuất chờ xử lý thành công' }, success: { type: 'boolean', example: true }, data: { type: 'object', example: { items: [{ id: OUTBOUND_ID, code: 'PX-2026-0001', status: 'PENDING' }], total: 6, limit: 10, offset: 0, hasMore: false } } } } })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async findPendingOutbound(@Query() query: QueryPendingOutboundDto, @Request() req: any, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.findPendingOutbound(req.warehouseIds || [], query, lang);
        return new GetResponse('inventory-request.list_pending_outbound', result, lang === 'vi' ? 'Lấy danh sách yêu cầu xuất chờ xử lý thành công' : 'Pending outbound requests fetched successfully');
    }

    @Get('outbound/:id')
    @ApiResponse({ status: 200, description: 'Lấy chi tiết phiếu xuất thành công', schema: outboundDetailSchema })
    @RequirePermission('warehouse-manager.inventory.outbound.list')
    @ApiOperation({ summary: 'Chi tiết phiếu xuất kho', description: 'Lấy chi tiết phiếu xuất theo phạm vi kho mà Warehouse Manager được phân quyền.' })
    @ApiParam({ name: 'id', description: 'ID phiếu xuất', example: OUTBOUND_ID })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết phiếu xuất thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async findOutboundById(@Param('id', ParseUUIDPipe) id: string, @Request() req: any, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.getOutboundById(id, req.warehouseIds || [], lang);
        return new GetResponse('inventory-request.get_outbound', result, lang === 'vi' ? 'Lấy chi tiết phiếu xuất thành công' : 'Outbound detail fetched successfully');
    }

    @Post('outbound/:id/approve')
    @RequirePermission('warehouse-manager.inventory.outbound.approve')
    @ApiOperation({ summary: 'Xác nhận xuất kho', description: 'Xác nhận phiếu xuất `PENDING`, chọn chiến lược picking và thực hiện trừ tồn kho. Yêu cầu quyền `warehouse-manager.inventory.outbound.approve`.' })
    @ApiParam({ name: 'id', description: 'ID phiếu xuất', example: OUTBOUND_ID })
    @ApiBody({ type: ApproveOutboundDto, description: 'Thông tin xác nhận xuất kho', examples: { fefo: { summary: 'Xuất theo FEFO', value: { picking_strategy: 'FEFO', notes: 'Ưu tiên lô gần hết hạn' } }, fifo: { summary: 'Xuất theo FIFO', value: { picking_strategy: 'FIFO', notes: 'Khách hàng yêu cầu FIFO' } } } })
    @ApiResponse({ status: 200, description: 'Xác nhận xuất kho thành công', schema: okSchema('inventory-request.approve_outbound', 'Xác nhận xuất kho thành công', OUTBOUND_ID, 'SHIPPED') })
    @ApiResponse({ status: 400, description: 'Phiếu xuất không ở trạng thái PENDING', schema: badRequest })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async approveOutbound(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveOutboundDto, @Request() req: any, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.approveOutbound(id, req.warehouseIds || [], dto, userId, lang);
        return new UpdatedResponse('inventory-request.approve_outbound', result, lang === 'vi' ? 'Xác nhận xuất kho thành công' : 'Outbound approved successfully');
    }

    @Post('outbound/:id/split')
    @ApiResponse({ status: 200, description: 'Tách phiếu xuất thành công', schema: splitOutboundSchema })
    @RequirePermission('warehouse-manager.inventory.outbound.approve')
    @ApiOperation({ summary: 'Tách phiếu xuất kho thiếu hàng', description: 'Tách phiếu xuất `PENDING` thành 2 phiếu: phiếu hiện tại giữ lại các dòng đủ tồn kho, phiếu mới chứa các dòng thiếu tồn kho để xử lý sau. Yêu cầu quyền `warehouse-manager.inventory.outbound.approve`.' })
    @ApiParam({ name: 'id', description: 'ID phiếu xuất cần tách', example: OUTBOUND_ID })
    @ApiResponse({ status: 200, description: 'Tách phiếu xuất thành công' })
    @ApiResponse({ status: 400, description: 'Không thể tách phiếu do trạng thái hoặc dữ liệu không phù hợp', schema: badRequest })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async splitOutbound(@Param('id', ParseUUIDPipe) id: string, @Request() req: any, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.splitOutbound(id, req.warehouseIds || [], userId, lang);
        return new UpdatedResponse('inventory-request.split_outbound', result, lang === 'vi' ? 'Tách phiếu xuất thành công' : 'Outbound request split successfully');
    }

    @Post('outbound/:id/confirm-picking')
    @RequirePermission('warehouse-manager.inventory.outbound.pick')
    @ApiOperation({ summary: 'Xác nhận nhặt hàng', description: 'Xác nhận hoàn tất picking cho phiếu xuất ở trạng thái `PICKING` và chuyển sang `CHECKING`. Yêu cầu quyền `warehouse-manager.inventory.outbound.pick`.' })
    @ApiParam({ name: 'id', description: 'ID phiếu xuất', example: OUTBOUND_ID })
    @ApiBody({ type: ConfirmPickingDto, description: 'Chi tiết nhặt hàng', examples: { picking: { summary: 'Đã nhặt hàng', value: { details: [{ pick_list_detail_id: '550e8400-e29b-41d4-a716-446655440201', picked_qty: 20 }] } } } })
    @ApiResponse({ status: 200, description: 'Xác nhận nhặt hàng thành công', schema: okSchema('inventory-request.confirm_picking', 'Xác nhận nhặt hàng thành công', OUTBOUND_ID, 'CHECKING') })
    @ApiResponse({ status: 400, description: 'Phiếu xuất không ở trạng thái PICKING', schema: badRequest })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async confirmPicking(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConfirmPickingDto, @Request() req: any, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.confirmPicking(id, req.warehouseIds || [], dto, userId, lang);
        return new UpdatedResponse('inventory-request.confirm_picking', result, lang === 'vi' ? 'Xác nhận nhặt hàng thành công' : 'Picking confirmed successfully');
    }

    @Post('outbound/:id/confirm-checking')
    @RequirePermission('warehouse-manager.inventory.outbound.check')
    @ApiOperation({ summary: 'Xác nhận kiểm tra xuất kho', description: 'Xác nhận bước kiểm tra cho phiếu xuất ở trạng thái `CHECKING` và chuyển sang `PACKED`. Yêu cầu quyền `warehouse-manager.inventory.outbound.check`.' })
    @ApiParam({ name: 'id', description: 'ID phiếu xuất', example: OUTBOUND_ID })
    @ApiBody({ type: ConfirmCheckingDto, description: 'Chi tiết kiểm tra hàng', examples: { checking: { summary: 'Kiểm tra đạt', value: { details: [{ export_detail_id: '550e8400-e29b-41d4-a716-446655440202', checked_qty: 20, passed: true }] } } } })
    @ApiResponse({ status: 200, description: 'Xác nhận kiểm tra thành công', schema: okSchema('inventory-request.confirm_checking', 'Xác nhận kiểm tra thành công', OUTBOUND_ID, 'PACKED') })
    @ApiResponse({ status: 400, description: 'Phiếu xuất không ở trạng thái CHECKING', schema: badRequest })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async confirmChecking(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConfirmCheckingDto, @Request() req: any, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.confirmChecking(id, req.warehouseIds || [], dto, userId, lang);
        return new UpdatedResponse('inventory-request.confirm_checking', result, lang === 'vi' ? 'Xác nhận kiểm tra thành công' : 'Checking confirmed successfully');
    }

    @Post('outbound/:id/complete-shipment')
    @RequirePermission('warehouse-manager.inventory.outbound.ship')
    @ApiOperation({ summary: 'Hoàn tất xuất kho', description: 'Hoàn tất bàn giao cho phiếu xuất ở trạng thái `PACKED` và cập nhật trạng thái `SHIPPED`. Yêu cầu quyền `warehouse-manager.inventory.outbound.ship`.' })
    @ApiParam({ name: 'id', description: 'ID phiếu xuất', example: OUTBOUND_ID })
    @ApiBody({ type: CompleteShipmentDto, description: 'Thông tin bàn giao', examples: { shipment: { summary: 'Có mã vận đơn', value: { tracking_number: 'GHN123456789VN', notes: 'Đã bàn giao cho đơn vị vận chuyển' } } } })
    @ApiResponse({ status: 200, description: 'Hoàn tất xuất kho thành công', schema: okSchema('inventory-request.complete_shipment', 'Hoàn tất xuất kho thành công', OUTBOUND_ID, 'SHIPPED') })
    @ApiResponse({ status: 400, description: 'Phiếu xuất không ở trạng thái PACKED', schema: badRequest })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async completeShipment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteShipmentDto, @Request() req: any, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.completeShipment(id, req.warehouseIds || [], dto, userId, lang);
        return new UpdatedResponse('inventory-request.complete_shipment', result, lang === 'vi' ? 'Hoàn tất xuất kho thành công' : 'Shipment completed successfully');
    }

    @Post('outbound/:id/reject')
    @RequirePermission('warehouse-manager.inventory.outbound.reject')
    @ApiOperation({ summary: 'Từ chối yêu cầu xuất kho', description: 'Từ chối phiếu xuất đang ở trạng thái `PENDING`. Yêu cầu quyền `warehouse-manager.inventory.outbound.reject`.' })
    @ApiParam({ name: 'id', description: 'ID phiếu xuất', example: OUTBOUND_ID })
    @ApiBody({ type: RejectOutboundDto, description: 'Lý do từ chối', examples: { reject: { summary: 'Từ chối do thiếu tồn', value: { reason: 'Không đủ tồn kho' } } } })
    @ApiResponse({ status: 200, description: 'Từ chối thành công', schema: okSchema('inventory-request.reject_outbound', 'Từ chối yêu cầu xuất kho thành công', OUTBOUND_ID, 'REJECTED') })
    @ApiResponse({ status: 400, description: 'Phiếu xuất không ở trạng thái PENDING', schema: badRequest })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất', schema: notFound })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async rejectOutbound(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectOutboundDto, @Request() req: any, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const result = await this.warehouseManagerInventoryService.rejectOutbound(id, req.warehouseIds || [], dto, userId, lang);
        return new UpdatedResponse('inventory-request.reject_outbound', result, lang === 'vi' ? 'Từ chối yêu cầu xuất kho thành công' : 'Outbound request rejected successfully');
    }
}
