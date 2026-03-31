import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    ParseUUIDPipe,
    UseGuards,
    Res,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiSecurity,
    ApiTags,
} from '@nestjs/swagger';
import { I18nLang, I18nService } from 'nestjs-i18n';

import { InventoryRequestService } from './inventory-request.service';
import {
    ApproveRequestDto,
    CompleteShipmentDto,
    ConfirmCheckingDto,
    ConfirmPickingDto,
    ConfirmPutawayDto,
    ConfirmReceivingDto,
    CreateInboundRequestDto,
    CreateOutboundRequestDto,
    QueryInboundRequestDto,
    QueryOutboundRequestDto,
    RejectRequestDto,
    StartReceivingDto,
    QueryTransactionDto,
} from './dto';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';
import { OrgPermissionGuard } from '../../common/guards/org-permission.guard';
import { RequireOrgPermission } from '../../common/decorators/require-org-permission.decorator';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import { CreatedResponse, GetResponse, UpdatedResponse } from '../../common/responses/success.response';
import {
    buildErrorResponseSchema,
    buildPaginationDataSchema,
    buildSuccessResponseSchema,
} from '../../common/swagger/swagger-response.helper';

const ORG_ID = '550e8400-e29b-41d4-a716-446655440001';
const WAREHOUSE_ID = '550e8400-e29b-41d4-a716-446655440003';
const PARTNER_ID = '550e8400-e29b-41d4-a716-446655440004';
const INBOUND_ID = '550e8400-e29b-41d4-a716-446655440010';
const OUTBOUND_ID = '550e8400-e29b-41d4-a716-446655440020';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440030';
const UNIT_ID = '550e8400-e29b-41d4-a716-446655440040';
const DETAIL_ID = '550e8400-e29b-41d4-a716-446655440050';
const PICK_DETAIL_ID = '550e8400-e29b-41d4-a716-446655440060';
const CHECKER_ID = '550e8400-e29b-41d4-a716-446655440070';

const warehouseItemSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: WAREHOUSE_ID },
        code: { type: 'string', example: 'WH-Q7-01' },
        name: { type: 'string', example: 'Kho lạnh Quận 7' },
        address: { type: 'string', example: '123 Nguyễn Văn Linh, Quận 7, TP.HCM' },
        status: { type: 'string', example: 'ACTIVE' },
    },
};

const workflowResultSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: INBOUND_ID },
        code: { type: 'string', example: 'PN-202603-0001' },
        status: { type: 'string', example: 'COMPLETED' },
        updated_at: { type: 'string', format: 'date-time', example: '2026-03-13T11:15:00.000Z' },
    },
};

const inboundListItemSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: INBOUND_ID },
        code: { type: 'string', example: 'PN-202603-0001' },
        status: { type: 'string', example: 'PENDING' },
        warehouse_name: { type: 'string', example: 'Kho lạnh Quận 7' },
        purchase_order_code: { type: 'string', example: 'PO-2026-001' },
        expected_arrival: { type: 'string', format: 'date-time', example: '2026-03-15T10:00:00.000Z' },
        total_items: { type: 'number', example: 2 },
        created_at: { type: 'string', format: 'date-time', example: '2026-03-13T08:00:00.000Z' },
    },
};

const outboundListItemSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: OUTBOUND_ID },
        code: { type: 'string', example: 'PX-202603-0001' },
        status: { type: 'string', example: 'PENDING' },
        warehouse_name: { type: 'string', example: 'Kho lạnh Quận 7' },
        sales_order_code: { type: 'string', example: 'SO-2026-015' },
        required_date: { type: 'string', format: 'date-time', example: '2026-03-16T08:30:00.000Z' },
        total_items: { type: 'number', example: 3 },
        created_at: { type: 'string', format: 'date-time', example: '2026-03-13T09:15:00.000Z' },
    },
};

const inboundDetailSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: INBOUND_ID },
        code: { type: 'string', example: 'PN-202603-0001' },
        status: { type: 'string', example: 'APPROVED' },
        notes: { type: 'string', example: 'Nhập hàng bổ sung tháng 3' },
        warehouse: warehouseItemSchema,
        partner: {
            type: 'object',
            nullable: true,
            properties: {
                id: { type: 'string', format: 'uuid', example: PARTNER_ID },
                name: { type: 'string', example: 'Công ty Nông Sản ABC' },
            },
        },
        details: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', example: DETAIL_ID },
                    product_id: { type: 'string', format: 'uuid', example: PRODUCT_ID },
                    product_name: { type: 'string', example: 'Táo Envy New Zealand' },
                    expected_qty: { type: 'number', example: 100 },
                    actual_qty: { type: 'number', example: 98, nullable: true },
                    unit_name: { type: 'string', example: 'Thùng' },
                    batch_code: { type: 'string', example: 'LOT-2026-001', nullable: true },
                },
            },
        },
        created_at: { type: 'string', format: 'date-time', example: '2026-03-13T08:00:00.000Z' },
        updated_at: { type: 'string', format: 'date-time', example: '2026-03-13T10:30:00.000Z' },
    },
};

const outboundDetailSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: OUTBOUND_ID },
        code: { type: 'string', example: 'PX-202603-0001' },
        status: { type: 'string', example: 'CHECKING' },
        notes: { type: 'string', example: 'Xuất hàng giao khách trong ngày' },
        warehouse: warehouseItemSchema,
        partner: {
            type: 'object',
            nullable: true,
            properties: {
                id: { type: 'string', format: 'uuid', example: PARTNER_ID },
                name: { type: 'string', example: 'Công ty Phân Phối XYZ' },
            },
        },
        picking_strategy: { type: 'string', example: 'FEFO' },
        details: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', example: DETAIL_ID },
                    product_id: { type: 'string', format: 'uuid', example: PRODUCT_ID },
                    product_name: { type: 'string', example: 'Táo Envy New Zealand' },
                    quantity: { type: 'number', example: 50 },
                    checked_qty: { type: 'number', example: 50, nullable: true },
                    unit_name: { type: 'string', example: 'Thùng' },
                },
            },
        },
        created_at: { type: 'string', format: 'date-time', example: '2026-03-13T09:15:00.000Z' },
        updated_at: { type: 'string', format: 'date-time', example: '2026-03-13T11:00:00.000Z' },
    },
};

const stockItemSchema = {
    type: 'object',
    properties: {
        product_id: { type: 'string', format: 'uuid', example: PRODUCT_ID },
        product_code: { type: 'string', example: 'SP-001' },
        product_name: { type: 'string', example: 'Táo Envy New Zealand' },
        warehouse_id: { type: 'string', format: 'uuid', example: WAREHOUSE_ID },
        warehouse_name: { type: 'string', example: 'Kho lạnh Quận 7' },
        available_qty: { type: 'number', example: 245 },
        reserved_qty: { type: 'number', example: 30 },
        unit_name: { type: 'string', example: 'Thùng' },
    },
};

const badRequestSchema = buildErrorResponseSchema({
    code: 'inventory-request.invalid_operation',
    message: 'Phiếu hiện tại không hợp lệ để thực hiện thao tác này',
});

const notFoundSchema = buildErrorResponseSchema({
    code: 'inventory-request.not_found',
    message: 'Không tìm thấy phiếu nhập/xuất kho hoặc dữ liệu liên quan',
});

const conflictSchema = buildErrorResponseSchema({
    code: 'inventory-request.conflict',
    message: 'Dữ liệu nghiệp vụ đang xung đột, vui lòng kiểm tra lại trạng thái phiếu hoặc tồn kho',
});

function workflowResponse(code: string, message: string, id: string, codeValue: string, status: string) {
    return buildSuccessResponseSchema({
        code,
        message,
        dataSchema: workflowResultSchema,
        dataExample: {
            id,
            code: codeValue,
            status,
            updated_at: '2026-03-13T11:15:00.000Z',
        },
    });
}

@ApiTags('Inventory Request (Organization) (Collapsed)')
@ApiBearerAuth('JWT-auth')
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
        description: 'Lấy danh sách kho mà tổ chức đang có hợp đồng thuê còn hiệu lực để tạo và theo dõi các phiếu nhập/xuất kho. Yêu cầu quyền `org.inventory.inbound.list`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức cần lấy danh sách kho', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiResponse({
        status: 200,
        description: 'Trả về danh sách kho mà tổ chức có thể sử dụng cho nghiệp vụ tồn kho',
        schema: buildSuccessResponseSchema({
            code: 'inventory-request.list_warehouses',
            message: 'Lấy danh sách kho thành công',
            dataSchema: { type: 'array', items: warehouseItemSchema },
            dataExample: [{ id: WAREHOUSE_ID, code: 'WH-Q7-01', name: 'Kho lạnh Quận 7', address: '123 Nguyễn Văn Linh, Quận 7, TP.HCM', status: 'ACTIVE' }],
        }),
    })
    @ApiAuthResponses()
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
        description: 'Lấy danh sách tồn kho thực tế của tổ chức theo từng sản phẩm trong kho. Có thể lọc theo kho hoặc từ khóa sản phẩm. Yêu cầu quyền `org.inventory.inbound.list`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức cần xem tồn kho', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiQuery({ name: 'warehouse_id', required: false, type: String, description: 'ID kho cần lọc. Bỏ trống để lấy toàn bộ kho thuộc tổ chức.', example: WAREHOUSE_ID })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm theo mã hoặc tên sản phẩm', example: 'SP-001' })
    @ApiResponse({
        status: 200,
        description: 'Trả về danh sách tồn kho theo điều kiện lọc',
        schema: buildSuccessResponseSchema({
            code: 'inventory-request.list_stock',
            message: 'Lấy danh sách tồn kho thành công',
            dataSchema: { type: 'array', items: stockItemSchema },
            dataExample: [{ product_id: PRODUCT_ID, product_code: 'SP-001', product_name: 'Táo Envy New Zealand', warehouse_id: WAREHOUSE_ID, warehouse_name: 'Kho lạnh Quận 7', available_qty: 245, reserved_qty: 30, unit_name: 'Thùng' }],
        }),
    })
    @ApiAuthResponses()
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
        description: 'Tạo mới một phiếu nhập kho cho tổ chức với trạng thái khởi tạo `PENDING`. Endpoint hỗ trợ nhập hàng từ nhà cung cấp, thêm thông tin lô mới hoặc tham chiếu lô hiện có. Yêu cầu quyền `org.inventory.inbound.create`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức tạo phiếu nhập', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBody({
        type: CreateInboundRequestDto,
        description: 'Dữ liệu tạo phiếu nhập kho, bao gồm kho nhận hàng và danh sách dòng sản phẩm cần nhập',
        examples: {
            basic_inbound: {
                summary: 'Tạo phiếu nhập cơ bản',
                description: 'Nhập hàng cho một sản phẩm và tạo lô mới trong quá trình nhập',
                value: {
                    warehouse_id: WAREHOUSE_ID,
                    partner_id: PARTNER_ID,
                    purchase_order_code: 'PO-2026-001',
                    notes: 'Nhập hàng bổ sung tháng 3',
                    expected_arrival: '2026-03-15T10:00:00Z',
                    vehicle_info: 'Xe tải lạnh 51C-123.45',
                    details: [{ product_id: PRODUCT_ID, expected_qty: 100, unit_id: UNIT_ID, batch_code: 'LOT-2026-001', manufacturing_date: '2026-02-01', expiry_date: '2027-02-01', import_price: 50000 }],
                },
            },
            mixed_batch_inbound: {
                summary: 'Nhập nhiều dòng sản phẩm',
                description: 'Kết hợp nhập vào lô hiện có và tạo lô mới trong cùng một phiếu nhập',
                value: {
                    warehouse_id: WAREHOUSE_ID,
                    notes: 'Nhập bổ sung cho chương trình khuyến mãi',
                    details: [
                        { product_id: PRODUCT_ID, batch_id: '550e8400-e29b-41d4-a716-446655440031', expected_qty: 30, unit_id: UNIT_ID },
                        { product_id: '550e8400-e29b-41d4-a716-446655440032', expected_qty: 45, unit_id: UNIT_ID, batch_code: 'LOT-2026-045', manufacturing_date: '2026-02-10', expiry_date: '2027-02-10', import_price: 62000 },
                    ],
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Trả về phiếu nhập vừa được tạo ở trạng thái `PENDING`',
        schema: buildSuccessResponseSchema({
            code: 'inventory-request.create_inbound',
            message: 'Tạo yêu cầu nhập kho thành công',
            dataSchema: inboundDetailSchema,
            dataExample: {
                id: INBOUND_ID,
                code: 'PN-202603-0001',
                status: 'PENDING',
                notes: 'Nhập hàng bổ sung tháng 3',
                warehouse: { id: WAREHOUSE_ID, code: 'WH-Q7-01', name: 'Kho lạnh Quận 7', address: '123 Nguyễn Văn Linh, Quận 7, TP.HCM', status: 'ACTIVE' },
                partner: { id: PARTNER_ID, name: 'Công ty Nông Sản ABC' },
                details: [{ id: DETAIL_ID, product_id: PRODUCT_ID, product_name: 'Táo Envy New Zealand', expected_qty: 100, actual_qty: null, unit_name: 'Thùng', batch_code: 'LOT-2026-001' }],
                created_at: '2026-03-13T08:00:00.000Z',
                updated_at: '2026-03-13T08:00:00.000Z',
            },
        }),
    })
    @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào sai định dạng hoặc không hợp lệ theo nghiệp vụ', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy kho, đối tác, sản phẩm hoặc đơn vị tính được tham chiếu', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Phát sinh xung đột dữ liệu như mã lô trùng hoặc kho không thuộc tổ chức', schema: conflictSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
        description: 'Lấy danh sách phiếu nhập kho của tổ chức có hỗ trợ phân trang, tìm kiếm theo mã phiếu hoặc đơn mua, và lọc theo kho/trạng thái. Yêu cầu quyền `org.inventory.inbound.list`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức cần xem danh sách phiếu nhập', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiQuery({ name: 'warehouse_id', required: false, type: String, description: 'ID kho cần lọc', example: WAREHOUSE_ID })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm theo mã phiếu hoặc mã đơn mua', example: 'PN-2026' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'RECEIVING', 'PROCESSING', 'COMPLETED', 'CANCELLED'], description: 'Lọc theo trạng thái phiếu nhập', example: 'PENDING' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bản ghi trên mỗi trang', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu để phân trang', example: 0 })
    @ApiResponse({
        status: 200,
        description: 'Trả về danh sách phiếu nhập và thông tin phân trang',
        schema: buildSuccessResponseSchema({
            code: 'inventory-request.list_inbound',
            message: 'Lấy danh sách yêu cầu nhập kho thành công',
            dataSchema: buildPaginationDataSchema(inboundListItemSchema),
            dataExample: { items: [{ id: INBOUND_ID, code: 'PN-202603-0001', status: 'PENDING', warehouse_name: 'Kho lạnh Quận 7', purchase_order_code: 'PO-2026-001', expected_arrival: '2026-03-15T10:00:00.000Z', total_items: 2, created_at: '2026-03-13T08:00:00.000Z' }], total: 12, limit: 10, offset: 0, hasMore: true },
        }),
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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

    @Get('inbound/export')
    @RequireOrgPermission('org.inventory.inbound.export')
    @ApiOperation({
        summary: 'Xuất Excel danh sách yêu cầu nhập kho',
        description: 'Tạo và tải về file Excel danh sách các phiếu nhập kho dựa trên bộ lọc hiện tại. Yêu cầu quyền `org.inventory.inbound.export`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    async exportInbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryInboundRequestDto,
        @Res() res: Response,
    ) {
        const result = await this.inventoryRequestService.exportInbound(orgId, query);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${result.fileName}"`,
            'Content-Length': result.buffer.length,
        });
        res.end(result.buffer);
    }

    @Get('inbound/:id')
    @RequireOrgPermission('org.inventory.inbound.list')
    @ApiOperation({
        summary: 'Chi tiết yêu cầu nhập kho',
        description: 'Lấy thông tin chi tiết của một phiếu nhập kho, bao gồm kho nhận hàng, đối tác, trạng thái hiện tại và danh sách dòng sản phẩm. Yêu cầu quyền `org.inventory.inbound.list`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu nhập', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID của phiếu nhập kho cần xem chi tiết', example: INBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiResponse({
        status: 200,
        description: 'Trả về chi tiết đầy đủ của phiếu nhập kho',
        schema: buildSuccessResponseSchema({
            code: 'inventory-request.get_inbound',
            message: 'Lấy chi tiết phiếu nhập kho thành công',
            dataSchema: inboundDetailSchema,
            dataExample: {
                id: INBOUND_ID,
                code: 'PN-202603-0001',
                status: 'APPROVED',
                notes: 'Nhập hàng bổ sung tháng 3',
                warehouse: { id: WAREHOUSE_ID, code: 'WH-Q7-01', name: 'Kho lạnh Quận 7', address: '123 Nguyễn Văn Linh, Quận 7, TP.HCM', status: 'ACTIVE' },
                partner: { id: PARTNER_ID, name: 'Công ty Nông Sản ABC' },
                details: [{ id: DETAIL_ID, product_id: PRODUCT_ID, product_name: 'Táo Envy New Zealand', expected_qty: 100, actual_qty: 98, unit_name: 'Thùng', batch_code: 'LOT-2026-001' }],
                created_at: '2026-03-13T08:00:00.000Z',
                updated_at: '2026-03-13T10:30:00.000Z',
            },
        }),
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập kho thuộc tổ chức hiện tại', schema: notFoundSchema })
    @ApiAuthResponses()
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
        description: 'Tạo mới một phiếu xuất kho cho tổ chức để chuẩn bị nhặt hàng, kiểm tra và bàn giao. Endpoint hỗ trợ chọn chiến lược xuất kho `FEFO` hoặc `FIFO`. Yêu cầu quyền `org.inventory.outbound.create`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức tạo phiếu xuất', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBody({
        type: CreateOutboundRequestDto,
        description: 'Dữ liệu tạo phiếu xuất kho gồm kho xuất, thông tin khách hàng và danh sách sản phẩm cần xuất',
        examples: {
            fefo_outbound: {
                summary: 'Xuất kho theo FEFO',
                description: 'Ưu tiên lô gần hết hạn trước khi giao khách',
                value: { warehouse_id: WAREHOUSE_ID, partner_id: PARTNER_ID, sales_order_code: 'SO-2026-015', notes: 'Xuất hàng giao khách trong ngày', required_date: '2026-03-16', vehicle_info: 'Xe tải 51D-678.90', picking_strategy: 'FEFO', details: [{ product_id: PRODUCT_ID, quantity: 50, unit_id: UNIT_ID }] },
            },
            specific_batch_outbound: {
                summary: 'Xuất theo lô chỉ định',
                description: 'Khách hàng yêu cầu xuất đúng lô hàng cụ thể',
                value: { warehouse_id: WAREHOUSE_ID, sales_order_code: 'SO-2026-016', picking_strategy: 'FIFO', details: [{ product_id: PRODUCT_ID, quantity: 20, unit_id: UNIT_ID, required_batch_id: '550e8400-e29b-41d4-a716-446655440031' }] },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Trả về phiếu xuất vừa được tạo ở trạng thái `PENDING`',
        schema: buildSuccessResponseSchema({
            code: 'inventory-request.create_outbound',
            message: 'Tạo yêu cầu xuất kho thành công',
            dataSchema: outboundDetailSchema,
            dataExample: {
                id: OUTBOUND_ID,
                code: 'PX-202603-0001',
                status: 'PENDING',
                notes: 'Xuất hàng giao khách trong ngày',
                warehouse: { id: WAREHOUSE_ID, code: 'WH-Q7-01', name: 'Kho lạnh Quận 7', address: '123 Nguyễn Văn Linh, Quận 7, TP.HCM', status: 'ACTIVE' },
                partner: { id: PARTNER_ID, name: 'Công ty Phân Phối XYZ' },
                picking_strategy: 'FEFO',
                details: [{ id: DETAIL_ID, product_id: PRODUCT_ID, product_name: 'Táo Envy New Zealand', quantity: 50, checked_qty: null, unit_name: 'Thùng' }],
                created_at: '2026-03-13T09:15:00.000Z',
                updated_at: '2026-03-13T09:15:00.000Z',
            },
        }),
    })
    @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào sai định dạng hoặc không hợp lệ theo nghiệp vụ', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy kho, sản phẩm, đơn vị tính hoặc lô hàng được tham chiếu', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Tồn kho không đủ hoặc phát sinh xung đột dữ liệu xuất kho', schema: conflictSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
        description: 'Lấy danh sách phiếu xuất kho của tổ chức có hỗ trợ phân trang, tìm kiếm theo mã phiếu hoặc mã đơn bán, và lọc theo kho/trạng thái. Yêu cầu quyền `org.inventory.outbound.list`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức cần xem danh sách phiếu xuất', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiQuery({ name: 'warehouse_id', required: false, type: String, description: 'ID kho cần lọc', example: WAREHOUSE_ID })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm theo mã phiếu hoặc mã đơn bán', example: 'PX-2026' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PICKING', 'CHECKING', 'PACKED', 'SHIPPED', 'CANCELLED'], description: 'Lọc theo trạng thái phiếu xuất', example: 'PENDING' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bản ghi trên mỗi trang', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu để phân trang', example: 0 })
    @ApiResponse({
        status: 200,
        description: 'Trả về danh sách phiếu xuất và thông tin phân trang',
        schema: buildSuccessResponseSchema({
            code: 'inventory-request.list_outbound',
            message: 'Lấy danh sách yêu cầu xuất kho thành công',
            dataSchema: buildPaginationDataSchema(outboundListItemSchema),
            dataExample: { items: [{ id: OUTBOUND_ID, code: 'PX-202603-0001', status: 'PENDING', warehouse_name: 'Kho lạnh Quận 7', sales_order_code: 'SO-2026-015', required_date: '2026-03-16T08:30:00.000Z', total_items: 3, created_at: '2026-03-13T09:15:00.000Z' }], total: 8, limit: 10, offset: 0, hasMore: false },
        }),
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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

    @Get('outbound/export')
    @RequireOrgPermission('org.inventory.outbound.export')
    @ApiOperation({
        summary: 'Xuất Excel danh sách yêu cầu xuất kho',
        description: 'Tạo và tải về file Excel danh sách các phiếu xuất kho dựa trên bộ lọc hiện tại. Yêu cầu quyền `org.inventory.outbound.export`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    async exportOutbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryOutboundRequestDto,
        @Res() res: Response,
    ) {
        const result = await this.inventoryRequestService.exportOutbound(orgId, query);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${result.fileName}"`,
            'Content-Length': result.buffer.length,
        });
        res.end(result.buffer);
    }

    @Get('outbound/:id')
    @RequireOrgPermission('org.inventory.outbound.list')
    @ApiOperation({
        summary: 'Chi tiết yêu cầu xuất kho',
        description: 'Lấy thông tin chi tiết của một phiếu xuất kho, bao gồm chiến lược xuất, đối tác nhận hàng và các dòng sản phẩm cần xử lý. Yêu cầu quyền `org.inventory.outbound.list`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu xuất', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID của phiếu xuất kho cần xem chi tiết', example: OUTBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiResponse({
        status: 200,
        description: 'Trả về chi tiết đầy đủ của phiếu xuất kho',
        schema: buildSuccessResponseSchema({
            code: 'inventory-request.get_outbound',
            message: 'Lấy chi tiết phiếu xuất kho thành công',
            dataSchema: outboundDetailSchema,
            dataExample: {
                id: OUTBOUND_ID,
                code: 'PX-202603-0001',
                status: 'CHECKING',
                notes: 'Xuất hàng giao khách trong ngày',
                warehouse: { id: WAREHOUSE_ID, code: 'WH-Q7-01', name: 'Kho lạnh Quận 7', address: '123 Nguyễn Văn Linh, Quận 7, TP.HCM', status: 'ACTIVE' },
                partner: { id: PARTNER_ID, name: 'Công ty Phân Phối XYZ' },
                picking_strategy: 'FEFO',
                details: [{ id: DETAIL_ID, product_id: PRODUCT_ID, product_name: 'Táo Envy New Zealand', quantity: 50, checked_qty: 50, unit_name: 'Thùng' }],
                created_at: '2026-03-13T09:15:00.000Z',
                updated_at: '2026-03-13T11:00:00.000Z',
            },
        }),
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất kho thuộc tổ chức hiện tại', schema: notFoundSchema })
    @ApiAuthResponses()
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
        description: 'Duyệt phiếu nhập kho từ trạng thái `PENDING` sang `APPROVED`. Có thể ghi chú nội bộ khi duyệt để bộ phận kho theo dõi. Yêu cầu quyền `org.inventory.inbound.approve`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu nhập', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID phiếu nhập cần duyệt', example: INBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBody({
        type: ApproveRequestDto,
        description: 'Thông tin duyệt phiếu nhập',
        examples: {
            approve_basic: {
                summary: 'Duyệt cơ bản',
                description: 'Duyệt phiếu nhập với ghi chú kiểm tra hợp lệ',
                value: { notes: 'Đã kiểm tra chứng từ và xác nhận hợp lệ' },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Phiếu nhập được duyệt thành công', schema: workflowResponse('inventory-request.approve_receipt', 'Duyệt phiếu nhập kho thành công', INBOUND_ID, 'PN-202603-0001', 'APPROVED') })
    @ApiResponse({ status: 400, description: 'Phiếu nhập không ở trạng thái có thể duyệt', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập cần duyệt', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Phiếu nhập đang được xử lý bởi thao tác khác hoặc phát sinh xung đột trạng thái', schema: conflictSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async approveInbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ApproveRequestDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const receipt = await this.inventoryRequestService.approveInbound(orgId, id, actorId, lang, dto.notes);
        return new GetResponse('inventory-request.approve_receipt', receipt, await this.i18n.translate('inventory-request.success.approve_receipt', { lang }));
    }

    @Patch('inbound/:id/reject')
    @RequireOrgPermission('org.inventory.inbound.approve')
    @ApiOperation({
        summary: 'Từ chối phiếu nhập kho',
        description: 'Từ chối phiếu nhập kho từ trạng thái `PENDING` sang `CANCELLED`. Nên ghi rõ lý do để tổ chức có căn cứ xử lý và tạo lại phiếu khi cần. Yêu cầu quyền `org.inventory.inbound.approve`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu nhập', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID phiếu nhập cần từ chối', example: INBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBody({
        type: RejectRequestDto,
        description: 'Thông tin từ chối phiếu nhập',
        examples: {
            reject_quality: {
                summary: 'Từ chối do chứng từ không hợp lệ',
                description: 'Ví dụ từ chối vì dữ liệu sản phẩm hoặc chứng từ nhập kho chưa đầy đủ',
                value: { reason: 'Thông tin sản phẩm không khớp với chứng từ giao hàng' },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Phiếu nhập được từ chối thành công', schema: workflowResponse('inventory-request.reject_inbound', 'Từ chối phiếu nhập kho thành công', INBOUND_ID, 'PN-202603-0001', 'CANCELLED') })
    @ApiResponse({ status: 400, description: 'Phiếu nhập không ở trạng thái có thể từ chối', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập cần từ chối', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Phiếu nhập đang được xử lý đồng thời bởi thao tác khác', schema: conflictSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async rejectInbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RejectRequestDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const receipt = await this.inventoryRequestService.rejectInbound(orgId, id, actorId, lang, dto.reason);
        return new GetResponse('inventory-request.reject_inbound', receipt, await this.i18n.translate('inventory-request.success.reject_inbound', { lang }));
    }

    @Patch('outbound/:id/approve')
    @RequireOrgPermission('org.inventory.outbound.approve')
    @ApiOperation({
        summary: 'Duyệt phiếu xuất kho',
        description: 'Duyệt phiếu xuất kho từ trạng thái `PENDING` sang `PICKING`. Có thể chọn chiến lược nhặt hàng `FEFO` hoặc `FIFO` ngay tại bước duyệt. Yêu cầu quyền `org.inventory.outbound.approve`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu xuất', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID phiếu xuất cần duyệt', example: OUTBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBody({
        type: ApproveRequestDto,
        description: 'Thông tin duyệt phiếu xuất',
        examples: {
            approve_fefo: { summary: 'Duyệt theo FEFO', description: 'Chiến lược mặc định ưu tiên lô gần hết hạn', value: { notes: 'Ưu tiên xuất lô gần hết hạn', picking_strategy: 'FEFO' } },
            approve_fifo: { summary: 'Duyệt theo FIFO', description: 'Dùng khi khách hàng yêu cầu xuất theo thứ tự nhập trước', value: { notes: 'Khách yêu cầu FIFO', picking_strategy: 'FIFO' } },
        },
    })
    @ApiResponse({ status: 200, description: 'Phiếu xuất được duyệt thành công', schema: workflowResponse('inventory-request.approve_outbound', 'Duyệt phiếu xuất kho thành công', OUTBOUND_ID, 'PX-202603-0001', 'PICKING') })
    @ApiResponse({ status: 400, description: 'Phiếu xuất không ở trạng thái có thể duyệt', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất cần duyệt', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Tồn kho hoặc trạng thái phiếu đang xung đột với thao tác hiện tại', schema: conflictSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async approveOutbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ApproveRequestDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const exportRecord = await this.inventoryRequestService.approveOutbound(orgId, id, actorId, lang, dto.notes, dto.picking_strategy || 'FEFO');
        return new GetResponse('inventory-request.approve_outbound', exportRecord, await this.i18n.translate('inventory-request.success.approve_outbound', { lang }));
    }

    @Patch('outbound/:id/reject')
    @RequireOrgPermission('org.inventory.outbound.approve')
    @ApiOperation({
        summary: 'Từ chối phiếu xuất kho',
        description: 'Từ chối phiếu xuất kho từ trạng thái `PENDING` sang `CANCELLED`. Nên ghi rõ lý do để bộ phận bán hàng hoặc vận hành có căn cứ xử lý tiếp. Yêu cầu quyền `org.inventory.outbound.approve`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu xuất', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID phiếu xuất cần từ chối', example: OUTBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBody({
        type: RejectRequestDto,
        description: 'Thông tin từ chối phiếu xuất',
        examples: {
            reject_stock: { summary: 'Từ chối do không đủ tồn kho', description: 'Ví dụ từ chối vì tồn kho thực tế không đủ để xuất', value: { reason: 'Không đủ tồn kho khả dụng để chuẩn bị đơn hàng' } },
        },
    })
    @ApiResponse({ status: 200, description: 'Phiếu xuất được từ chối thành công', schema: workflowResponse('inventory-request.reject_outbound', 'Từ chối phiếu xuất kho thành công', OUTBOUND_ID, 'PX-202603-0001', 'CANCELLED') })
    @ApiResponse({ status: 400, description: 'Phiếu xuất không ở trạng thái có thể từ chối', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất cần từ chối', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Phiếu xuất đang được thao tác đồng thời bởi quy trình khác', schema: conflictSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async rejectOutbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RejectRequestDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const exportRecord = await this.inventoryRequestService.rejectOutbound(orgId, id, actorId, lang, dto.reason);
        return new GetResponse('inventory-request.reject_outbound', exportRecord, await this.i18n.translate('inventory-request.success.reject_outbound', { lang }));
    }

    @Patch('inbound/:id/start-receiving')
    @RequireOrgPermission('org.inventory.inbound.approve')
    @ApiOperation({
        summary: 'Bắt đầu kiểm đếm phiếu nhập',
        description: 'Chuyển phiếu nhập từ trạng thái `APPROVED` sang `RECEIVING` để bắt đầu kiểm đếm hàng thực tế tại kho. Có thể chỉ định checker phụ trách ở bước này. Yêu cầu quyền `org.inventory.inbound.approve`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu nhập', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID phiếu nhập bắt đầu kiểm đếm', example: INBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBody({ type: StartReceivingDto, description: 'Thông tin checker thực hiện bước kiểm đếm', examples: { with_checker: { summary: 'Bắt đầu kiểm đếm có chỉ định checker', description: 'Phân công checker phụ trách xử lý phiếu nhập', value: { checker_id: CHECKER_ID } } } })
    @ApiResponse({ status: 200, description: 'Phiếu nhập được chuyển sang trạng thái kiểm đếm', schema: workflowResponse('inventory-request.start_receiving', 'Bắt đầu kiểm đếm phiếu nhập thành công', INBOUND_ID, 'PN-202603-0001', 'RECEIVING') })
    @ApiResponse({ status: 400, description: 'Phiếu nhập không ở trạng thái `APPROVED` hoặc không đủ điều kiện bắt đầu kiểm đếm', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập hoặc checker được chỉ định', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Phiếu nhập đang bị khóa bởi một quy trình khác', schema: conflictSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async startReceiving(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: StartReceivingDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.startReceiving(orgId, id, actorId, lang, dto);
        return new UpdatedResponse('inventory-request.start_receiving', result, lang === 'vi' ? 'Đã bắt đầu kiểm đếm' : 'Receiving started');
    }

    @Patch('inbound/:id/confirm-receiving')
    @RequireOrgPermission('org.inventory.inbound.approve')
    @ApiOperation({
        summary: 'Xác nhận kiểm đếm phiếu nhập',
        description: 'Ghi nhận số lượng kiểm đếm thực tế cho từng dòng sản phẩm và chuyển phiếu nhập từ `RECEIVING` sang `PROCESSING`. Yêu cầu quyền `org.inventory.inbound.approve`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu nhập', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID phiếu nhập cần xác nhận kiểm đếm', example: INBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBody({ type: ConfirmReceivingDto, description: 'Danh sách chi tiết kiểm đếm thực tế cho từng dòng sản phẩm', examples: { full_receive: { summary: 'Kiểm đếm đủ số lượng', description: 'Xác nhận đủ số lượng thực tế và thêm ghi chú kiểm đếm', value: { details: [{ detail_id: DETAIL_ID, actual_qty: 98 }], notes: 'Thiếu 2 thùng so với dự kiến' } } } })
    @ApiResponse({ status: 200, description: 'Phiếu nhập được xác nhận kiểm đếm thành công', schema: workflowResponse('inventory-request.confirm_receiving', 'Xác nhận kiểm đếm phiếu nhập thành công', INBOUND_ID, 'PN-202603-0001', 'PROCESSING') })
    @ApiResponse({ status: 400, description: 'Phiếu nhập không ở trạng thái `RECEIVING` hoặc dữ liệu kiểm đếm không phù hợp', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập hoặc chi tiết phiếu nhập cần kiểm đếm', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Dữ liệu kiểm đếm xung đột với trạng thái hiện tại của phiếu', schema: conflictSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async confirmReceiving(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmReceivingDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.confirmReceiving(orgId, id, actorId, lang, dto);
        return new UpdatedResponse('inventory-request.confirm_receiving', result, lang === 'vi' ? 'Đã xác nhận kiểm đếm' : 'Receiving confirmed');
    }

    @Patch('inbound/:id/confirm-putaway')
    @RequireOrgPermission('org.inventory.inbound.approve')
    @ApiOperation({
        summary: 'Xác nhận cất hàng',
        description: 'Hoàn tất bước cất hàng cho phiếu nhập đang ở trạng thái `PROCESSING`, đồng thời cập nhật tồn kho và đóng phiếu nhập sang trạng thái `COMPLETED`. Yêu cầu quyền `org.inventory.inbound.approve`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu nhập', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID phiếu nhập cần xác nhận cất hàng', example: INBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBody({ type: ConfirmPutawayDto, description: 'Thông tin ghi chú khi hoàn tất cất hàng vào kho', examples: { putaway_done: { summary: 'Xác nhận cất hàng hoàn tất', description: 'Xác nhận toàn bộ hàng đã được đưa vào vị trí lưu trữ', value: { notes: 'Đã cất hàng vào dãy A, kệ 03' } } } })
    @ApiResponse({ status: 200, description: 'Phiếu nhập được hoàn tất thành công sau bước cất hàng', schema: workflowResponse('inventory-request.confirm_putaway', 'Xác nhận cất hàng thành công', INBOUND_ID, 'PN-202603-0001', 'COMPLETED') })
    @ApiResponse({ status: 400, description: 'Phiếu nhập không ở trạng thái `PROCESSING` hoặc chưa hoàn tất kiểm đếm', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập cần xác nhận cất hàng', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Tồn kho hoặc cấu trúc lưu trữ đang xung đột với thao tác cất hàng', schema: conflictSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async confirmPutaway(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmPutawayDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.confirmPutaway(orgId, id, actorId, lang, dto);
        return new UpdatedResponse('inventory-request.confirm_putaway', result, lang === 'vi' ? 'Đã xác nhận cất hàng — hoàn tất nhập kho' : 'Putaway confirmed — inbound completed');
    }

    @Patch('inbound/:id/refill-inventory')
    @RequireOrgPermission('org.inventory.inbound.approve')
    @ApiOperation({
        summary: 'Bổ sung tồn kho cho phiếu nhập đã hoàn tất',
        description: 'Dùng khi phiếu nhập đã ở trạng thái `COMPLETED` nhưng tồn kho chưa được tạo ra do thiếu cấu trúc kho hoặc dữ liệu phụ trợ tại thời điểm xử lý trước đó. Yêu cầu quyền `org.inventory.inbound.approve`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu nhập', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID phiếu nhập cần bổ sung tồn kho', example: INBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiResponse({ status: 200, description: 'Đã tạo bổ sung tồn kho thành công cho phiếu nhập hoàn tất', schema: workflowResponse('inventory-request.refill_inventory', 'Bổ sung tồn kho thành công', INBOUND_ID, 'PN-202603-0001', 'COMPLETED') })
    @ApiResponse({ status: 400, description: 'Phiếu nhập chưa hoàn tất hoặc không cần bổ sung tồn kho', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu nhập cần bổ sung tồn kho', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Tồn kho đã được tạo trước đó hoặc cấu trúc kho vẫn chưa sẵn sàng', schema: conflictSchema })
    @ApiAuthResponses()
    async refillInventory(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.refillInventory(orgId, id, actorId, lang);
        return new UpdatedResponse('inventory-request.refill_inventory', result, lang === 'vi' ? 'Đã bổ sung tồn kho thành công' : 'Inventory refilled successfully');
    }

    @Patch('outbound/:id/confirm-picking')
    @RequireOrgPermission('org.inventory.outbound.approve')
    @ApiOperation({
        summary: 'Xác nhận nhặt hàng',
        description: 'Ghi nhận kết quả nhặt hàng cho phiếu xuất đang ở trạng thái `PICKING` và chuyển sang bước `CHECKING`. Yêu cầu quyền `org.inventory.outbound.approve`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu xuất', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID phiếu xuất cần xác nhận nhặt hàng', example: OUTBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBody({ type: ConfirmPickingDto, description: 'Danh sách chi tiết đã nhặt theo từng dòng pick list', examples: { picking_done: { summary: 'Xác nhận nhặt hàng đầy đủ', description: 'Ví dụ nhặt đủ số lượng cho một dòng pick list', value: { details: [{ pick_list_detail_id: PICK_DETAIL_ID, picked_qty: 20 }] } } } })
    @ApiResponse({ status: 200, description: 'Phiếu xuất được chuyển sang bước kiểm tra', schema: workflowResponse('inventory-request.confirm_picking', 'Xác nhận nhặt hàng thành công', OUTBOUND_ID, 'PX-202603-0001', 'CHECKING') })
    @ApiResponse({ status: 400, description: 'Phiếu xuất không ở trạng thái `PICKING` hoặc dữ liệu nhặt hàng không hợp lệ', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất hoặc chi tiết pick list cần xác nhận', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Dữ liệu nhặt hàng xung đột với trạng thái hiện tại của phiếu xuất', schema: conflictSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async confirmPicking(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmPickingDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.confirmPicking(orgId, id, actorId, lang, dto);
        return new UpdatedResponse('inventory-request.confirm_picking', result, lang === 'vi' ? 'Đã xác nhận nhặt hàng' : 'Picking confirmed');
    }

    @Patch('outbound/:id/confirm-checking')
    @RequireOrgPermission('org.inventory.outbound.approve')
    @ApiOperation({
        summary: 'Xác nhận kiểm tra xuất',
        description: 'Xác nhận kết quả kiểm tra trước khi đóng gói cho phiếu xuất đang ở trạng thái `CHECKING`, sau đó chuyển sang `PACKED`. Yêu cầu quyền `org.inventory.outbound.approve`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu xuất', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID phiếu xuất cần xác nhận kiểm tra', example: OUTBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBody({ type: ConfirmCheckingDto, description: 'Danh sách kết quả kiểm tra theo từng dòng phiếu xuất', examples: { checking_passed: { summary: 'Tất cả dòng đạt yêu cầu', description: 'Ví dụ xác nhận kiểm tra đủ số lượng và đạt chất lượng', value: { details: [{ export_detail_id: DETAIL_ID, checked_qty: 20, passed: true }] } }, checking_issue: { summary: 'Có dòng không đạt', description: 'Ví dụ ghi nhận một dòng chưa đạt khi kiểm tra', value: { details: [{ export_detail_id: DETAIL_ID, checked_qty: 18, passed: false }] } } } })
    @ApiResponse({ status: 200, description: 'Phiếu xuất được chuyển sang trạng thái đóng gói', schema: workflowResponse('inventory-request.confirm_checking', 'Xác nhận kiểm tra xuất kho thành công', OUTBOUND_ID, 'PX-202603-0001', 'PACKED') })
    @ApiResponse({ status: 400, description: 'Phiếu xuất không ở trạng thái `CHECKING` hoặc dữ liệu kiểm tra không hợp lệ', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất hoặc chi tiết phiếu xuất cần kiểm tra', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Kết quả kiểm tra xung đột với trạng thái hiện tại của phiếu', schema: conflictSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async confirmChecking(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmCheckingDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.confirmChecking(orgId, id, actorId, lang, dto);
        return new UpdatedResponse('inventory-request.confirm_checking', result, lang === 'vi' ? 'Đã xác nhận kiểm tra' : 'Checking confirmed');
    }

    @Patch('outbound/:id/complete-shipment')
    @RequireOrgPermission('org.inventory.outbound.approve')
    @ApiOperation({
        summary: 'Hoàn tất xuất kho',
        description: 'Xác nhận bàn giao vận chuyển cho phiếu xuất đang ở trạng thái `PACKED` và hoàn tất quy trình sang `SHIPPED`. Có thể ghi nhận mã vận đơn và ghi chú giao hàng. Yêu cầu quyền `org.inventory.outbound.approve`.',
    })
    @ApiParam({ name: 'orgId', required: true, description: 'ID của tổ chức sở hữu phiếu xuất', example: ORG_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiParam({ name: 'id', required: true, description: 'ID phiếu xuất cần hoàn tất bàn giao', example: OUTBOUND_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBody({ type: CompleteShipmentDto, description: 'Thông tin hoàn tất giao hàng hoặc bàn giao cho đơn vị vận chuyển', examples: { shipment_with_tracking: { summary: 'Có mã vận đơn', description: 'Ví dụ hoàn tất bàn giao cho đơn vị vận chuyển và lưu tracking number', value: { tracking_number: 'GHN123456789VN', notes: 'Đã bàn giao cho đơn vị vận chuyển lúc 16:30' } } } })
    @ApiResponse({ status: 200, description: 'Phiếu xuất được hoàn tất thành công', schema: workflowResponse('inventory-request.complete_shipment', 'Hoàn tất xuất kho thành công', OUTBOUND_ID, 'PX-202603-0001', 'SHIPPED') })
    @ApiResponse({ status: 400, description: 'Phiếu xuất không ở trạng thái `PACKED` hoặc chưa đủ điều kiện bàn giao', schema: badRequestSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy phiếu xuất cần hoàn tất', schema: notFoundSchema })
    @ApiResponse({ status: 409, description: 'Phiếu xuất đang bị cập nhật bởi một tác vụ khác hoặc thông tin vận chuyển bị xung đột', schema: conflictSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async completeShipment(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CompleteShipmentDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.inventoryRequestService.completeShipment(orgId, id, actorId, lang, dto);
        return new UpdatedResponse('inventory-request.complete_shipment', result, lang === 'vi' ? 'Hoàn tất xuất kho' : 'Shipment completed');
    }


    @Get('stock/export')
    @RequireOrgPermission('org.inventory.inbound.list')
    @ApiOperation({ summary: 'Xuất báo cáo tồn kho ra Excel' })
    async exportStock(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query('warehouse_id') warehouseId: string | undefined,
        @Query('keywords') keywords: string | undefined,
        @Res() res: Response,
    ) {
        const result = await this.inventoryRequestService.exportStock(orgId, warehouseId, keywords);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${result.fileName}"`,
            'Content-Length': result.buffer.length,
        });
        res.end(result.buffer);
    }

    @Get('inbound/template')
    @RequireOrgPermission('org.inventory.inbound.create')
    @ApiOperation({ summary: 'Tải file mẫu nhập kho' })
    async getInboundTemplate(
        @Res() res: Response,
    ) {
        const buffer = await this.inventoryRequestService.getInboundTemplate();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=inbound-import-template.xlsx');
        res.send(buffer);
    }

    @Get('outbound/template')
    @RequireOrgPermission('org.inventory.outbound.create')
    @ApiOperation({ summary: 'Tải file mẫu xuất kho' })
    async getOutboundTemplate(
        @Res() res: Response,
    ) {
        const buffer = await this.inventoryRequestService.getOutboundTemplate();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=outbound-import-template.xlsx');
        res.send(buffer);
    }
    @Post('inbound/import')
    @RequireOrgPermission('org.inventory.inbound.create')
    @ApiOperation({ summary: 'Nhập dữ liệu nhập kho từ file Excel' })
    @UseInterceptors(FileInterceptor('file'))
    async importInbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @UploadedFile() file: Express.Multer.File,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        if (!file) throw new BadRequestException('File is required');
        const result = await this.inventoryRequestService.importInbound(orgId, file.buffer, actorId, lang);
        return new CreatedResponse('inventory-request.inbound-import', result, lang === 'vi' ? 'Nhập dữ liệu thành công' : 'Import successful');
    }

    @Post('outbound/import')
    @RequireOrgPermission('org.inventory.outbound.create')
    @ApiOperation({ summary: 'Nhập dữ liệu xuất kho từ file Excel' })
    @UseInterceptors(FileInterceptor('file'))
    async importOutbound(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @UploadedFile() file: Express.Multer.File,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        if (!file) throw new BadRequestException('File is required');
        const result = await this.inventoryRequestService.importOutbound(orgId, file.buffer, actorId, lang);
        return new CreatedResponse('inventory-request.outbound-import', result, lang === 'vi' ? 'Nhập dữ liệu thành công' : 'Import successful');
    }
}
