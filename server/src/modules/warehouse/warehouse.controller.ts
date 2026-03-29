import {
    Controller,
    Get,
    Put,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiHeader, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { WarehouseService } from './warehouse.service';
import { UpdateWarehouseDto, QueryWarehouseDto, UpdateShelfDto, UpdateRowDto, UpdateRackDto, UpdateBlockDto } from './dto';
import { CombinedAuthGuard, OrgPermissionGuard } from '../../common/guards';
import { RequireOrgPermission, CurrentActor } from '../../common/decorators';
import { GetResponse, UpdatedResponse, ResponseCode } from '../../common/responses';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';

@ApiTags('Organization Warehouses')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'X-API-Key', description: 'API Key for authentication (alternative to JWT)', required: false })
@Controller('organizations/:orgId/warehouses')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
export class WarehouseController {
    constructor(private readonly warehouseService: WarehouseService) { }

    @Get()
    @RequireOrgPermission('warehouse.list')
    @ApiOperation({ summary: 'Lấy danh sách warehouse của tổ chức' })
    @ApiAuthResponses()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Số lượng record mỗi trang' })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0, description: 'Vị trí bắt đầu' })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Tìm kiếm theo tên hoặc mô tả' })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Lọc theo trạng thái hoạt động' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.list_success' },
                message: { type: 'string', example: 'Lấy danh sách kho thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    name: { type: 'string', example: 'Kho Chính' },
                                    description: { type: 'string' },
                                    address_detail: { type: 'string' },
                                    width: { type: 'number' },
                                    length: { type: 'number' },
                                    is_active: { type: 'boolean' },
                                    created_at: { type: 'string', format: 'date-time' },
                                }
                            }
                        },
                        total: { type: 'number' },
                        limit: { type: 'number' },
                        offset: { type: 'number' },
                    }
                }
            }
        }
    })
    async findMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryWarehouseDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.findMany(query, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_LIST_SUCCESS, data, 'Lấy danh sách kho thành công');
    }

    @Get(':id')
    @RequireOrgPermission('warehouse.read')
    @ApiOperation({ summary: 'Lấy chi tiết warehouse' })
    @ApiAuthResponses()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.read_success' },
                message: { type: 'string', example: 'Lấy thông tin kho thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Kho Chính' },
                        description: { type: 'string' },
                        width: { type: 'number' },
                        length: { type: 'number' },
                        address_detail: { type: 'string' },
                        ward_id: { type: 'string', format: 'uuid' },
                        latitude: { type: 'number' },
                        longitude: { type: 'number' },
                        is_active: { type: 'boolean' }
                    }
                }
            }
        }
    })
    async findById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.findById(id, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_READ_SUCCESS, data, 'Lấy thông tin kho thành công');
    }

    @Get(':id/layout')
    @RequireOrgPermission('warehouse.layout.view')
    @ApiOperation({ summary: 'Lấy layout warehouse' })
    @ApiAuthResponses()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy layout thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.layout_view_success' },
                message: { type: 'string', example: 'Lấy layout kho thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        width: { type: 'number' },
                        length: { type: 'number' },
                        rows: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    name: { type: 'string' },
                                    position_x: { type: 'number' },
                                    position_y: { type: 'number' },
                                    position_rotation: { type: 'number' },
                                    racks: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string', format: 'uuid' },
                                                name: { type: 'string' },
                                                position_x: { type: 'number' },
                                                position_y: { type: 'number' },
                                                shelves: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'string', format: 'uuid' },
                                                            name: { type: 'string' },
                                                            blocks: {
                                                                type: 'array',
                                                                items: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        id: { type: 'string', format: 'uuid' },
                                                                        name: { type: 'string' }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    async getLayout(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.getLayout(id, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_LAYOUT_SUCCESS, data, 'Lấy layout kho thành công');
    }

    @Get(':id/inventory-stock')
    @RequireOrgPermission('warehouse.read')
    @ApiOperation({
        summary: 'Lấy inventory stock của warehouse (cho 3D visualization)',
        description: 'Trả về danh sách tất cả inventory items trong warehouse, bao gồm thông tin sản phẩm, batch, vị trí (row/rack/shelf/block). Dùng để render boxes trong 3D warehouse scene.',
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy inventory stock thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.inventory_stock_success' },
                message: { type: 'string', example: 'Lấy tồn kho thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            product_id: { type: 'string', format: 'uuid' },
                            product_name: { type: 'string' },
                            sku: { type: 'string' },
                            image_url: { type: 'string', nullable: true },
                            batch_code: { type: 'string', nullable: true },
                            expiry_date: { type: 'string', nullable: true },
                            quantity: { type: 'number' },
                            quantity_on_hand: { type: 'number' },
                            quantity_allocated: { type: 'number' },
                            quantity_available: { type: 'number' },
                            warehouse_id: { type: 'string', format: 'uuid' },
                            warehouse_name: { type: 'string' },
                            block_id: { type: 'string', format: 'uuid' },
                            location: { type: 'string' },
                            row_code: { type: 'string' },
                            rack_code: { type: 'string' },
                            days_in_storage: { type: 'number' },
                            created_at: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
        },
    })
    async getInventoryStock(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.getInventoryStock(id, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_INVENTORY_STOCK_SUCCESS, data, 'Lấy tồn kho thành công');
    }

    @Patch(':id')
    @RequireOrgPermission('warehouse.update')
    @ApiOperation({ summary: 'Cập nhật warehouse' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiBody({
        type: UpdateWarehouseDto,
        description: 'Thông tin cập nhật kho',
        examples: {
            example1: {
                summary: 'Cập nhật tên và mô tả',
                value: {
                    name: 'Kho A - Mới',
                    description: 'Mô tả mới cho kho A'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.update_success' },
                message: { type: 'string', example: 'Cập nhật kho thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    async update(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateWarehouseDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.update(id, dto, actorId, orgId, lang);
        return new UpdatedResponse(ResponseCode.WAREHOUSE_UPDATE_SUCCESS, data, 'Cập nhật kho thành công');
    }

    @Get(':id/racks')
    @RequireOrgPermission('warehouse.read')
    @ApiOperation({ summary: 'Lấy danh sách racks của warehouse' })
    @ApiAuthResponses()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách kệ thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.racks_list_success' },
                message: { type: 'string', example: 'Lấy danh sách kệ thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string', example: 'Kệ 01' },
                            code: { type: 'string', example: 'RACK-01' },
                            position_x: { type: 'number' },
                            position_y: { type: 'number' },
                            is_active: { type: 'boolean' }
                        }
                    }
                }
            }
        }
    })
    async getRacks(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.getRacks(id, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_RACKS_SUCCESS, data, 'Lấy danh sách kệ thành công');
    }

    @Get(':id/racks/:rackId/shelves')
    @RequireOrgPermission('warehouse.read')
    @ApiOperation({ summary: 'Lấy danh sách shelves của rack' })
    @ApiAuthResponses()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiParam({ name: 'rackId', description: 'ID rack (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách tầng thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.shelves_list_success' },
                message: { type: 'string', example: 'Lấy danh sách tầng thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string', example: 'Tầng 1' },
                            code: { type: 'string', example: 'SHELF-1' },
                            height: { type: 'number' },
                            assigned_product_id: { type: 'string', format: 'uuid' },
                            is_active: { type: 'boolean' }
                        }
                    }
                }
            }
        }
    })
    async getShelves(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.getShelves(id, rackId, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_SHELVES_SUCCESS, data, 'Lấy danh sách tầng thành công');
    }

    @Get(':id/racks/:rackId/shelves/:shelfId/blocks')
    @RequireOrgPermission('warehouse.read')
    @ApiOperation({ summary: 'Lấy danh sách blocks của shelf' })
    @ApiAuthResponses()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiParam({ name: 'rackId', description: 'ID rack (UUID)' })
    @ApiParam({ name: 'shelfId', description: 'ID shelf (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách ô thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.blocks_list_success' },
                message: { type: 'string', example: 'Lấy danh sách ô thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string', example: 'Ô 1' },
                            code: { type: 'string', example: 'BLOCK-1' },
                            position_x: { type: 'number' },
                            position_y: { type: 'number' },
                            is_overloaded: { type: 'boolean' },
                            is_active: { type: 'boolean' }
                        }
                    }
                }
            }
        }
    })
    async getBlocks(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.getBlocks(id, shelfId, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_BLOCKS_SUCCESS, data, 'Lấy danh sách ô thành công');
    }

    @Get(':id/rows')
    @RequireOrgPermission('warehouse.read')
    @ApiOperation({ summary: 'Lấy danh sách rows của warehouse' })
    @ApiAuthResponses()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách dãy thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.rows_list_success' },
                message: { type: 'string', example: 'Lấy danh sách dãy thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string', example: 'Dãy A' },
                            code: { type: 'string', example: 'ROW-A' },
                            position_x: { type: 'number' },
                            position_y: { type: 'number' },
                            is_rented: { type: 'boolean' },
                            is_active: { type: 'boolean' }
                        }
                    }
                }
            }
        }
    })
    async getRows(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.getRows(id, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_ROWS_SUCCESS, data, 'Lấy danh sách dãy thành công');
    }

    @Get(':id/rows/:rowId')
    @RequireOrgPermission('warehouse.read')
    @ApiOperation({ summary: 'Lấy chi tiết row' })
    @ApiAuthResponses()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiParam({ name: 'rowId', description: 'ID row (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết dãy thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.row_detail_success' },
                message: { type: 'string', example: 'Lấy chi tiết dãy thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Dãy A' },
                        code: { type: 'string', example: 'ROW-A' },
                        description: { type: 'string' },
                        position_x: { type: 'number' },
                        position_y: { type: 'number' },
                        position_rotation: { type: 'number' },
                        total_weight_capacity: { type: 'number' },
                        is_active: { type: 'boolean' }
                    }
                }
            }
        }
    })
    async getRowById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.getRowById(id, rowId, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_ROW_SUCCESS, data, 'Lấy chi tiết dãy thành công');
    }

    @Get(':id/rows/:rowId/racks')
    @RequireOrgPermission('warehouse.read')
    @ApiOperation({ summary: 'Lấy danh sách racks theo row' })
    @ApiAuthResponses()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiParam({ name: 'rowId', description: 'ID row (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách kệ thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.racks_list_success' },
                message: { type: 'string', example: 'Lấy danh sách kệ thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string', example: 'Kệ 01' },
                            code: { type: 'string', example: 'RACK-01' },
                            position_x: { type: 'number' },
                            position_y: { type: 'number' },
                            total_height: { type: 'number' },
                            is_active: { type: 'boolean' }
                        }
                    }
                }
            }
        }
    })
    async getRacksByRow(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.getRacksByRow(id, rowId, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_RACKS_SUCCESS, data, 'Lấy danh sách kệ thành công');
    }

    @Patch(':id/shelves/:shelfId')
    @RequireOrgPermission('warehouse.update')
    @ApiOperation({ summary: 'Cập nhật shelf (name, description, assigned_product_id)' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiParam({ name: 'shelfId', description: 'ID shelf (UUID)' })
    @ApiBody({
        type: UpdateShelfDto,
        description: 'Thông tin cập nhật tầng',
        examples: {
            example1: {
                summary: 'Cập nhật tên và mô tả',
                value: {
                    name: 'Tầng 1 - Mới',
                    description: 'Mô tả mới'
                }
            },
            example2: {
                summary: 'Gán sản phẩm',
                value: {
                    assigned_product_id: 'product-uuid'
                }
            },
            example3: {
                summary: 'Bỏ gán sản phẩm',
                value: {
                    assigned_product_id: null
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật tầng thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.shelf_update_success' },
                message: { type: 'string', example: 'Cập nhật tầng thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        assigned_product_id: { type: 'string', format: 'uuid' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    async updateShelf(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @Body() dto: UpdateShelfDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.updateShelf(id, shelfId, dto, actorId, orgId, lang);
        return new UpdatedResponse(ResponseCode.WAREHOUSE_SHELF_UPDATE_SUCCESS, data, 'Cập nhật tầng thành công');
    }

    @Patch(':id/rows/:rowId')
    @RequireOrgPermission('warehouse.update')
    @ApiOperation({ summary: 'Cập nhật row (name, description)' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiParam({ name: 'rowId', description: 'ID row (UUID)' })
    @ApiBody({
        type: UpdateRowDto,
        description: 'Thông tin cập nhật dãy',
        examples: {
            example1: {
                summary: 'Cập nhật tên và mô tả',
                value: {
                    name: 'Dãy A - Mới',
                    description: 'Mô tả mới cho dãy A'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật dãy thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.row_update_success' },
                message: { type: 'string', example: 'Cập nhật dãy thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    async updateRow(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Body() dto: UpdateRowDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.updateRow(id, rowId, dto, actorId, orgId, lang);
        return new UpdatedResponse(ResponseCode.WAREHOUSE_ROW_UPDATE_SUCCESS, data, 'Cập nhật dãy thành công');
    }

    @Patch(':id/racks/:rackId')
    @RequireOrgPermission('warehouse.update')
    @ApiOperation({ summary: 'Cập nhật rack (name, description)' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiParam({ name: 'rackId', description: 'ID rack (UUID)' })
    @ApiBody({
        type: UpdateRackDto,
        description: 'Thông tin cập nhật kệ',
        examples: {
            example1: {
                summary: 'Cập nhật tên và mô tả',
                value: {
                    name: 'Kệ 01 - Mới',
                    description: 'Mô tả mới cho kệ 01'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật kệ thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.rack_update_success' },
                message: { type: 'string', example: 'Cập nhật kệ thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    async updateRack(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Body() dto: UpdateRackDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.updateRack(id, rackId, dto, actorId, orgId, lang);
        return new UpdatedResponse(ResponseCode.WAREHOUSE_RACK_UPDATE_SUCCESS, data, 'Cập nhật kệ thành công');
    }

    @Patch(':id/blocks/:blockId')
    @RequireOrgPermission('warehouse.update')
    @ApiOperation({ summary: 'Cập nhật block (name, description)' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID warehouse (UUID)' })
    @ApiParam({ name: 'blockId', description: 'ID block (UUID)' })
    @ApiBody({
        type: UpdateBlockDto,
        description: 'Thông tin cập nhật ô',
        examples: {
            example1: {
                summary: 'Cập nhật tên và mô tả',
                value: {
                    name: 'Ô 01 - Mới',
                    description: 'Mô tả mới cho ô 01'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật ô thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse.block_update_success' },
                message: { type: 'string', example: 'Cập nhật ô thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    async updateBlock(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('blockId', ParseUUIDPipe) blockId: string,
        @Body() dto: UpdateBlockDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.updateBlock(id, blockId, dto, actorId, orgId, lang);
        return new UpdatedResponse(ResponseCode.WAREHOUSE_BLOCK_UPDATE_SUCCESS, data, 'Cập nhật ô thành công');
    }
}
