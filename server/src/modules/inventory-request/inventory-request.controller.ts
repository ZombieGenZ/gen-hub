import {
    Controller,
    Get,
    Post,
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
} from './dto';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';
import { OrgPermissionGuard } from '../../common/guards/org-permission.guard';
import { RequireOrgPermission } from '../../common/decorators/require-org-permission.decorator';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import { CreatedResponse, GetResponse } from '../../common/responses/success.response';

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
}
