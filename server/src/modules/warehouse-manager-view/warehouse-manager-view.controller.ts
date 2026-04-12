import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
  RequireWMPermission,
} from '../../common/decorators';
import { CombinedAuthGuard, PermissionGuard } from '../../common/guards';
import { WarehouseManagerViewService } from './warehouse-manager-view.service';
import { QueryWarehouseManagerViewDto } from './dto/query-warehouse-manager-view.dto';

/**
 * Controller cho Warehouse Manager View APIs
 * Sử dụng hệ thống permission riêng của Warehouse Manager
 * Route pattern: /warehouse-managers/templates/:templateId/...
 */
@ApiTags('Warehouse Manager View')
@Controller('warehouse-managers/templates')
@UseGuards(CombinedAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class WarehouseManagerViewController {
  constructor(
    private readonly warehouseManagerViewService: WarehouseManagerViewService,
  ) {}

  @Get(':templateId/warehouses')
  @RequireWMPermission('warehouse.view')
  @ApiOperation({
    summary: 'Lấy danh sách kho thực tế theo template',
    description:
      'Lấy danh sách các kho thực tế được tạo từ template mà manager được gán. Yêu cầu permission `warehouse.view` trong hệ thống Warehouse Manager.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({
    name: 'templateId',
    type: 'string',
    description: 'ID của kho mẫu (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Số lượng record mỗi trang (mặc định: 10)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    example: 0,
    description: 'Vị trí bắt đầu (mặc định: 0)',
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Tìm kiếm theo tên hoặc mô tả',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái hoạt động',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách kho thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse_manager.warehouse_view_list_success',
        },
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
                  name: { type: 'string', example: 'Kho A1' },
                  code: { type: 'string', example: 'WH-A1' },
                  description: { type: 'string' },
                  address_detail: { type: 'string' },
                  width: { type: 'number' },
                  length: { type: 'number' },
                  is_active: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' },
            hasMore: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getWarehouses(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Query() query: QueryWarehouseManagerViewDto,
    @Request() req: any,
  ) {
    const lang = req.headers['accept-language'] || 'vi';
    const userId = req.user.userId;
    return this.warehouseManagerViewService.findWarehousesByTemplate(
      templateId,
      query,
      userId,
      lang,
    );
  }

  @Get(':templateId/warehouses/:warehouseId')
  @RequireWMPermission('warehouse.view')
  @ApiOperation({
    summary: 'Lấy chi tiết kho thực tế',
    description: 'Lấy thông tin chi tiết của một kho thực tế theo ID.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({
    name: 'templateId',
    type: 'string',
    description: 'ID của kho mẫu (UUID)',
  })
  @ApiParam({
    name: 'warehouseId',
    type: 'string',
    description: 'ID của kho thực tế (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết kho thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse_manager.warehouse_view_detail_success',
        },
        message: { type: 'string', example: 'Lấy chi tiết kho thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Kho A1' },
            description: { type: 'string' },
            width: { type: 'number' },
            length: { type: 'number' },
            address_detail: { type: 'string' },
            ward_id: { type: 'string', format: 'uuid' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            is_active: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getWarehouseDetail(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Request() req: any,
  ) {
    const lang = req.headers['accept-language'] || 'vi';
    const userId = req.user.userId;
    return this.warehouseManagerViewService.findWarehouseDetail(
      templateId,
      warehouseId,
      userId,
      lang,
    );
  }

  @Get(':templateId/warehouses/:warehouseId/rows')
  @RequireWMPermission('warehouse.view')
  @ApiOperation({
    summary: 'Lấy danh sách dãy trong kho',
    description: 'Lấy danh sách các dãy (rows) trong kho thực tế.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({
    name: 'templateId',
    type: 'string',
    description: 'ID của kho mẫu (UUID)',
  })
  @ApiParam({
    name: 'warehouseId',
    type: 'string',
    description: 'ID của kho thực tế (UUID)',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'keywords', required: false, type: String })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách dãy thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse_manager.row_view_list_success',
        },
        message: { type: 'string', example: 'Lấy danh sách dãy thành công' },
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
                  name: { type: 'string', example: 'Dãy A' },
                  code: { type: 'string', example: 'ROW-A' },
                  position_x: { type: 'number' },
                  position_y: { type: 'number' },
                  is_rented: { type: 'boolean' },
                  is_active: { type: 'boolean' },
                },
              },
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' },
            hasMore: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getRows(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Query() query: QueryWarehouseManagerViewDto,
    @Request() req: any,
  ) {
    const lang = req.headers['accept-language'] || 'vi';
    const userId = req.user.userId;
    return this.warehouseManagerViewService.findRowsByWarehouse(
      templateId,
      warehouseId,
      query,
      userId,
      lang,
    );
  }

  @Get(':templateId/warehouses/:warehouseId/rows/:rowId')
  @RequireWMPermission('warehouse.view')
  @ApiOperation({
    summary: 'Lấy chi tiết dãy',
    description: 'Lấy thông tin chi tiết của một dãy (row).',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({
    name: 'templateId',
    type: 'string',
    description: 'ID của kho mẫu (UUID)',
  })
  @ApiParam({
    name: 'warehouseId',
    type: 'string',
    description: 'ID của kho thực tế (UUID)',
  })
  @ApiParam({ name: 'rowId', type: 'string', description: 'ID của dãy (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết dãy thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse_manager.row_view_detail_success',
        },
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
            is_active: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getRowDetail(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Request() req: any,
  ) {
    const lang = req.headers['accept-language'] || 'vi';
    const userId = req.user.userId;
    return this.warehouseManagerViewService.findRowDetail(
      templateId,
      warehouseId,
      rowId,
      userId,
      lang,
    );
  }

  @Get(':templateId/warehouses/:warehouseId/rows/:rowId/racks')
  @RequireWMPermission('warehouse.view')
  @ApiOperation({
    summary: 'Lấy danh sách kệ trong dãy',
    description: 'Lấy danh sách các kệ (racks) trong dãy.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({
    name: 'templateId',
    type: 'string',
    description: 'ID của kho mẫu (UUID)',
  })
  @ApiParam({
    name: 'warehouseId',
    type: 'string',
    description: 'ID của kho thực tế (UUID)',
  })
  @ApiParam({ name: 'rowId', type: 'string', description: 'ID của dãy (UUID)' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'keywords', required: false, type: String })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách kệ thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse_manager.rack_view_list_success',
        },
        message: { type: 'string', example: 'Lấy danh sách kệ thành công' },
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
                  name: { type: 'string', example: 'Kệ 01' },
                  code: { type: 'string', example: 'RACK-01' },
                  position_x: { type: 'number' },
                  position_y: { type: 'number' },
                  total_height: { type: 'number' },
                  is_active: { type: 'boolean' },
                },
              },
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' },
            hasMore: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getRacks(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Query() query: QueryWarehouseManagerViewDto,
    @Request() req: any,
  ) {
    const lang = req.headers['accept-language'] || 'vi';
    const userId = req.user.userId;
    return this.warehouseManagerViewService.findRacksByRow(
      templateId,
      warehouseId,
      rowId,
      query,
      userId,
      lang,
    );
  }

  @Get(':templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId')
  @RequireWMPermission('warehouse.view')
  @ApiOperation({
    summary: 'Lấy chi tiết kệ',
    description: 'Lấy thông tin chi tiết của một kệ (rack).',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({ name: 'templateId', type: 'string' })
  @ApiParam({ name: 'warehouseId', type: 'string' })
  @ApiParam({ name: 'rowId', type: 'string' })
  @ApiParam({ name: 'rackId', type: 'string', description: 'ID của kệ (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết kệ thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse_manager.rack_view_detail_success',
        },
        message: { type: 'string', example: 'Lấy chi tiết kệ thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Kệ 01' },
            code: { type: 'string', example: 'RACK-01' },
            dimensions_width: { type: 'number' },
            dimensions_depth: { type: 'number' },
            dimensions_height: { type: 'number' },
            total_weight_capacity: { type: 'number' },
            is_active: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getRackDetail(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Request() req: any,
  ) {
    const lang = req.headers['accept-language'] || 'vi';
    const userId = req.user.userId;
    return this.warehouseManagerViewService.findRackDetail(
      templateId,
      warehouseId,
      rowId,
      rackId,
      userId,
      lang,
    );
  }

  @Get(':templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId/shelves')
  @RequireWMPermission('warehouse.view')
  @ApiOperation({
    summary: 'Lấy danh sách tầng trong kệ',
    description: 'Lấy danh sách các tầng (shelves) trong kệ.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({ name: 'templateId', type: 'string' })
  @ApiParam({ name: 'warehouseId', type: 'string' })
  @ApiParam({ name: 'rowId', type: 'string' })
  @ApiParam({ name: 'rackId', type: 'string' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'keywords', required: false, type: String })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách tầng thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse_manager.shelf_view_list_success',
        },
        message: { type: 'string', example: 'Lấy danh sách tầng thành công' },
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
                  name: { type: 'string', example: 'Tầng 1' },
                  code: { type: 'string', example: 'SHELF-1' },
                  height: { type: 'number' },
                  assigned_product_id: { type: 'string', format: 'uuid' },
                  is_active: { type: 'boolean' },
                },
              },
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' },
            hasMore: { type: 'boolean' },
          },
        },
      },
    },
  })
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
    return this.warehouseManagerViewService.findShelvesByRack(
      templateId,
      warehouseId,
      rowId,
      rackId,
      query,
      userId,
      lang,
    );
  }

  @Get(
    ':templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId/shelves/:shelfId',
  )
  @RequireWMPermission('warehouse.view')
  @ApiOperation({
    summary: 'Lấy chi tiết tầng',
    description:
      'Lấy thông tin chi tiết của một tầng bao gồm sản phẩm được gán.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({ name: 'templateId', type: 'string' })
  @ApiParam({ name: 'warehouseId', type: 'string' })
  @ApiParam({ name: 'rowId', type: 'string' })
  @ApiParam({ name: 'rackId', type: 'string' })
  @ApiParam({
    name: 'shelfId',
    type: 'string',
    description: 'ID của tầng (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết tầng thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse_manager.shelf_view_detail_success',
        },
        message: { type: 'string', example: 'Lấy chi tiết tầng thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Tầng 1' },
            code: { type: 'string', example: 'SHELF-1' },
            height: { type: 'number' },
            total_weight_capacity: { type: 'number' },
            assigned_product_id: { type: 'string', format: 'uuid' },
            is_active: { type: 'boolean' },
          },
        },
      },
    },
  })
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
    return this.warehouseManagerViewService.findShelfDetail(
      templateId,
      warehouseId,
      rowId,
      rackId,
      shelfId,
      userId,
      lang,
    );
  }

  @Get(
    ':templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks',
  )
  @RequireWMPermission('warehouse.view')
  @ApiOperation({
    summary: 'Lấy danh sách ô trong tầng',
    description: 'Lấy danh sách các ô (blocks) trong tầng.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({ name: 'templateId', type: 'string' })
  @ApiParam({ name: 'warehouseId', type: 'string' })
  @ApiParam({ name: 'rowId', type: 'string' })
  @ApiParam({ name: 'rackId', type: 'string' })
  @ApiParam({ name: 'shelfId', type: 'string' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'keywords', required: false, type: String })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách ô thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse_manager.block_view_list_success',
        },
        message: { type: 'string', example: 'Lấy danh sách ô thành công' },
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
                  name: { type: 'string', example: 'Ô 1' },
                  code: { type: 'string', example: 'BLOCK-1' },
                  position_x: { type: 'number' },
                  position_y: { type: 'number' },
                  is_overloaded: { type: 'boolean' },
                  is_active: { type: 'boolean' },
                },
              },
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' },
            hasMore: { type: 'boolean' },
          },
        },
      },
    },
  })
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
    return this.warehouseManagerViewService.findBlocksByShelf(
      templateId,
      warehouseId,
      rowId,
      rackId,
      shelfId,
      query,
      userId,
      lang,
    );
  }

  @Get(
    ':templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks/:blockId',
  )
  @RequireWMPermission('warehouse.view')
  @ApiOperation({
    summary: 'Lấy chi tiết ô',
    description: 'Lấy thông tin chi tiết của một ô bao gồm thông tin tồn kho.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({ name: 'templateId', type: 'string' })
  @ApiParam({ name: 'warehouseId', type: 'string' })
  @ApiParam({ name: 'rowId', type: 'string' })
  @ApiParam({ name: 'rackId', type: 'string' })
  @ApiParam({ name: 'shelfId', type: 'string' })
  @ApiParam({ name: 'blockId', type: 'string', description: 'ID của ô (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết ô thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse_manager.block_view_detail_success',
        },
        message: { type: 'string', example: 'Lấy chi tiết ô thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Ô 1' },
            code: { type: 'string', example: 'BLOCK-1' },
            dimensions_width: { type: 'number' },
            dimensions_height: { type: 'number' },
            max_weight_capacity: { type: 'number' },
            is_overloaded: { type: 'boolean' },
            is_active: { type: 'boolean' },
          },
        },
      },
    },
  })
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
    return this.warehouseManagerViewService.findBlockDetail(
      templateId,
      warehouseId,
      rowId,
      rackId,
      shelfId,
      blockId,
      userId,
      lang,
    );
  }
}
