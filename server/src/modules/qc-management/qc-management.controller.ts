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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { QCManagementService } from './qc-management.service';
import { AssignUserToWarehouseDto, AssignUserToRowDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import {
  RequirePermission,
  CurrentUser,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import {
  GetResponse,
  CreatedResponse,
  DeletedResponse,
} from '../../common/responses';

@ApiTags('QC Management')
@ApiBearerAuth('JWT-auth')
@Controller('qc-management')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class QCManagementController {
  constructor(private readonly qcManagementService: QCManagementService) {}

  @Get('warehouses')
  @RequirePermission('qc-management.list')
  @ApiOperation({
    summary: 'Lấy danh sách QC Warehouses',
    description:
      'Lấy danh sách các QC Warehouse với hỗ trợ phân trang. Yêu cầu quyền `qc-management.list`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa (mặc định: 20)',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Số bản ghi bỏ qua (mặc định: 0)',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách QC Warehouses thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'qc-management.list.success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách QC Warehouses thành công',
        },
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
                  warehouse_template_id: { type: 'string', format: 'uuid' },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'number', example: 50 },
            limit: { type: 'number', example: 20 },
            offset: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  async getWarehouses(
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @I18nLang() lang: string,
  ) {
    const data = await this.qcManagementService.getQCWarehouses(limit, offset);
    return new GetResponse('qc-management.list.success', data);
  }

  @Get('warehouses/:qcWarehouseId')
  @RequirePermission('qc-management.read')
  @ApiOperation({
    summary: 'Lấy chi tiết QC Warehouse',
    description:
      'Lấy thông tin chi tiết của một QC Warehouse bao gồm các phân công user. Yêu cầu quyền `qc-management.read`.',
  })
  @ApiParam({
    name: 'qcWarehouseId',
    description: 'ID của QC Warehouse (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết QC Warehouse thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'qc-management.read.success' },
        message: {
          type: 'string',
          example: 'Lấy chi tiết QC Warehouse thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            warehouse_template_id: { type: 'string', format: 'uuid' },
            warehouse_template: { type: 'object' },
            user_assignments: { type: 'array' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy QC Warehouse',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'qc-management.errors.warehouse_not_found',
        },
        message: { type: 'string', example: 'Không tìm thấy QC Warehouse' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  async getQCWarehouseById(
    @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
    @I18nLang() lang: string,
  ) {
    const data = await this.qcManagementService.getQCWarehouseById(
      qcWarehouseId,
      lang,
    );
    return new GetResponse('qc-management.read.success', data);
  }

  @Get('warehouses/:qcWarehouseId/warehouses')
  @RequirePermission('qc-management.list')
  @ApiOperation({
    summary: 'Lấy danh sách Warehouses của QC Warehouse',
    description:
      'Lấy danh sách các Warehouse instance thuộc QC Warehouse. Yêu cầu quyền `qc-management.list`.',
  })
  @ApiParam({
    name: 'qcWarehouseId',
    description: 'ID của QC Warehouse (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Số bản ghi bỏ qua',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách Warehouses thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy QC Warehouse' })
  @ApiAuthResponses()
  async getWarehousesByQCWarehouse(
    @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @I18nLang() lang: string,
  ) {
    const data = await this.qcManagementService.getWarehousesByQCWarehouseId(
      qcWarehouseId,
      limit,
      offset,
      lang,
    );
    return new GetResponse('qc-management.list.success', data);
  }

  @Get('warehouses/:qcWarehouseId/warehouses/:warehouseId')
  @RequirePermission('qc-management.read')
  @ApiOperation({
    summary: 'Lấy chi tiết Warehouse',
    description:
      'Lấy thông tin chi tiết của một Warehouse instance. Yêu cầu quyền `qc-management.read`.',
  })
  @ApiParam({
    name: 'qcWarehouseId',
    description: 'ID của QC Warehouse (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'warehouseId',
    description: 'ID của Warehouse (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết Warehouse thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy Warehouse' })
  @ApiAuthResponses()
  async getWarehouseDetail(
    @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @I18nLang() lang: string,
  ) {
    const data = await this.qcManagementService.getWarehouseById(
      warehouseId,
      lang,
    );
    return new GetResponse('qc-management.read.success', data);
  }

  @Get('warehouses/:qcWarehouseId/rows')
  @RequirePermission('qc-management.list')
  @ApiOperation({
    summary: 'Lấy danh sách QC Rows của warehouse',
    description:
      'Lấy danh sách các QC Row thuộc QC Warehouse. Yêu cầu quyền `qc-management.list`.',
  })
  @ApiParam({
    name: 'qcWarehouseId',
    description: 'ID của QC Warehouse (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Số bản ghi bỏ qua',
    example: 0,
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách QC Rows thành công' })
  @ApiAuthResponses()
  async getQCRowsByWarehouse(
    @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @I18nLang() lang: string,
  ) {
    const data = await this.qcManagementService.getQCRowsByWarehouseId(
      qcWarehouseId,
      limit,
      offset,
    );
    return new GetResponse('qc-management.list.success', data);
  }

  @Get('warehouses/:qcWarehouseId/rows/:qcRowId/rows')
  @RequirePermission('qc-management.list')
  @ApiOperation({
    summary: 'Lấy danh sách Rows của QC Row',
    description:
      'Lấy danh sách các Row instance thuộc QC Row. Yêu cầu quyền `qc-management.list`.',
  })
  @ApiParam({
    name: 'qcWarehouseId',
    description: 'ID của QC Warehouse (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'qcRowId',
    description: 'ID của QC Row (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Lấy danh sách Rows thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy QC Row' })
  @ApiAuthResponses()
  async getRowsByQCRow(
    @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
    @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @I18nLang() lang: string,
  ) {
    const data = await this.qcManagementService.getRowsByQCRowId(
      qcRowId,
      limit,
      offset,
      lang,
    );
    return new GetResponse('qc-management.list.success', data);
  }

  @Get('warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId')
  @RequirePermission('qc-management.read')
  @ApiOperation({
    summary: 'Lấy chi tiết Row',
    description:
      'Lấy thông tin chi tiết của một Row. Yêu cầu quyền `qc-management.read`.',
  })
  @ApiParam({
    name: 'qcWarehouseId',
    description: 'ID QC Warehouse (UUID)',
    type: 'string',
  })
  @ApiParam({
    name: 'qcRowId',
    description: 'ID QC Row (UUID)',
    type: 'string',
  })
  @ApiParam({ name: 'rowId', description: 'ID Row (UUID)', type: 'string' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết Row thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy Row' })
  @ApiAuthResponses()
  async getRowDetail(
    @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
    @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @I18nLang() lang: string,
  ) {
    const data = await this.qcManagementService.getRowById(rowId, lang);
    return new GetResponse('qc-management.read.success', data);
  }

  @Get('warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId/racks')
  @RequirePermission('qc-management.list')
  @ApiOperation({
    summary: 'Lấy danh sách Racks của Row',
    description:
      'Lấy danh sách các Rack thuộc Row. Yêu cầu quyền `qc-management.list`.',
  })
  @ApiParam({
    name: 'qcWarehouseId',
    description: 'ID QC Warehouse (UUID)',
    type: 'string',
  })
  @ApiParam({
    name: 'qcRowId',
    description: 'ID QC Row (UUID)',
    type: 'string',
  })
  @ApiParam({ name: 'rowId', description: 'ID Row (UUID)', type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Lấy danh sách Racks thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy Row' })
  @ApiAuthResponses()
  async getRacksByRow(
    @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
    @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @I18nLang() lang: string,
  ) {
    const data = await this.qcManagementService.getRacksByRowId(
      rowId,
      limit,
      offset,
      lang,
    );
    return new GetResponse('qc-management.list.success', data);
  }

  @Get('warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId/racks/:rackId')
  @RequirePermission('qc-management.read')
  @ApiOperation({
    summary: 'Lấy chi tiết Rack',
    description:
      'Lấy thông tin chi tiết của một Rack. Yêu cầu quyền `qc-management.read`.',
  })
  @ApiParam({
    name: 'qcWarehouseId',
    description: 'ID QC Warehouse (UUID)',
    type: 'string',
  })
  @ApiParam({
    name: 'qcRowId',
    description: 'ID QC Row (UUID)',
    type: 'string',
  })
  @ApiParam({ name: 'rowId', description: 'ID Row (UUID)', type: 'string' })
  @ApiParam({ name: 'rackId', description: 'ID Rack (UUID)', type: 'string' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết Rack thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy Rack' })
  @ApiAuthResponses()
  async getRackDetail(
    @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
    @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @I18nLang() lang: string,
  ) {
    const data = await this.qcManagementService.getRackById(rackId, lang);
    return new GetResponse('qc-management.read.success', data);
  }

  @Get(
    'warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId/racks/:rackId/shelves',
  )
  @RequirePermission('qc-management.list')
  @ApiOperation({
    summary: 'Lấy danh sách Shelves của Rack',
    description:
      'Lấy danh sách các Shelf thuộc Rack. Yêu cầu quyền `qc-management.list`.',
  })
  @ApiParam({
    name: 'qcWarehouseId',
    description: 'ID QC Warehouse (UUID)',
    type: 'string',
  })
  @ApiParam({
    name: 'qcRowId',
    description: 'ID QC Row (UUID)',
    type: 'string',
  })
  @ApiParam({ name: 'rowId', description: 'ID Row (UUID)', type: 'string' })
  @ApiParam({ name: 'rackId', description: 'ID Rack (UUID)', type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Lấy danh sách Shelves thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy Rack' })
  @ApiAuthResponses()
  async getShelvesByRack(
    @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
    @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @I18nLang() lang: string,
  ) {
    const data = await this.qcManagementService.getShelvesByRackId(
      rackId,
      limit,
      offset,
      lang,
    );
    return new GetResponse('qc-management.list.success', data);
  }

  @Get(
    'warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId/racks/:rackId/shelves/:shelfId',
  )
  @RequirePermission('qc-management.read')
  @ApiOperation({
    summary: 'Lấy chi tiết Shelf',
    description:
      'Lấy thông tin chi tiết của một Shelf. Yêu cầu quyền `qc-management.read`.',
  })
  @ApiParam({
    name: 'qcWarehouseId',
    description: 'ID QC Warehouse (UUID)',
    type: 'string',
  })
  @ApiParam({
    name: 'qcRowId',
    description: 'ID QC Row (UUID)',
    type: 'string',
  })
  @ApiParam({ name: 'rowId', description: 'ID Row (UUID)', type: 'string' })
  @ApiParam({ name: 'rackId', description: 'ID Rack (UUID)', type: 'string' })
  @ApiParam({ name: 'shelfId', description: 'ID Shelf (UUID)', type: 'string' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết Shelf thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy Shelf' })
  @ApiAuthResponses()
  async getShelfDetail(
    @Param('qcWarehouseId', ParseUUIDPipe) qcWarehouseId: string,
    @Param('qcRowId', ParseUUIDPipe) qcRowId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Param('shelfId', ParseUUIDPipe) shelfId: string,
    @I18nLang() lang: string,
  ) {
    const data = await this.qcManagementService.getShelfById(shelfId, lang);
    return new GetResponse('qc-management.read.success', data);
  }

  @Get(
    'warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks',
  )
  @RequirePermission('qc-management.list')
  @ApiOperation({
    summary: 'Lấy danh sách Blocks của Shelf',
    description:
      'Lấy danh sách các Block thuộc Shelf. Yêu cầu quyền `qc-management.list`.',
  })
  @ApiParam({
    name: 'qcWarehouseId',
    description: 'ID QC Warehouse (UUID)',
    type: 'string',
  })
  @ApiParam({
    name: 'qcRowId',
    description: 'ID QC Row (UUID)',
    type: 'string',
  })
  @ApiParam({ name: 'rowId', description: 'ID Row (UUID)', type: 'string' })
  @ApiParam({ name: 'rackId', description: 'ID Rack (UUID)', type: 'string' })
  @ApiParam({ name: 'shelfId', description: 'ID Shelf (UUID)', type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Lấy danh sách Blocks thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy Shelf' })
  @ApiAuthResponses()
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
    const data = await this.qcManagementService.getBlocksByShelfId(
      shelfId,
      limit,
      offset,
      lang,
    );
    return new GetResponse('qc-management.list.success', data);
  }

  @Get(
    'warehouses/:qcWarehouseId/rows/:qcRowId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks/:blockId',
  )
  @RequirePermission('qc-management.read')
  @ApiOperation({
    summary: 'Lấy chi tiết Block',
    description:
      'Lấy thông tin chi tiết của một Block. Yêu cầu quyền `qc-management.read`.',
  })
  @ApiParam({
    name: 'qcWarehouseId',
    description: 'ID QC Warehouse (UUID)',
    type: 'string',
  })
  @ApiParam({
    name: 'qcRowId',
    description: 'ID QC Row (UUID)',
    type: 'string',
  })
  @ApiParam({ name: 'rowId', description: 'ID Row (UUID)', type: 'string' })
  @ApiParam({ name: 'rackId', description: 'ID Rack (UUID)', type: 'string' })
  @ApiParam({ name: 'shelfId', description: 'ID Shelf (UUID)', type: 'string' })
  @ApiParam({ name: 'blockId', description: 'ID Block (UUID)', type: 'string' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết Block thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy Block' })
  @ApiAuthResponses()
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
    return new GetResponse('qc-management.read.success', data);
  }

  @Get('permissions')
  @RequirePermission('qc-management.list')
  @ApiOperation({
    summary: 'Lấy danh sách QC Permissions',
    description:
      'Lấy tất cả các QC Permission có thể gán cho user. Yêu cầu quyền `qc-management.list`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách QC Permissions thành công',
  })
  @ApiAuthResponses()
  async getPermissions(@I18nLang() lang: string) {
    const data = await this.qcManagementService.getAllPermissions();
    return new GetResponse('qc-management.permissions.success', data);
  }

  @Post('warehouses/:id/assignments')
  @RequirePermission('qc-management.assign')
  @ApiOperation({
    summary: 'Gán user vào QC Warehouse',
    description:
      'Gán một user vào QC Warehouse với các permissions cụ thể. Yêu cầu quyền `qc-management.assign`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID QC Warehouse (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: AssignUserToWarehouseDto,
    description: 'Thông tin gán user vào warehouse',
    examples: {
      basic: {
        summary: 'Gán user cơ bản',
        value: { user_id: '550e8400-e29b-41d4-a716-446655440001' },
      },
      with_permissions: {
        summary: 'Gán user với permissions',
        value: {
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          permission_ids: ['perm-uuid-1', 'perm-uuid-2'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Gán user thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy QC Warehouse' })
  @ApiResponse({ status: 400, description: 'Permissions không hợp lệ' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
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
    return new CreatedResponse('qc-management.assign.success', data);
  }

  @Delete('warehouses/assignments/:assignmentId')
  @RequirePermission('qc-management.assign')
  @ApiOperation({
    summary: 'Xóa phân công warehouse',
    description:
      'Xóa phân công user khỏi QC Warehouse. Yêu cầu quyền `qc-management.assign`.',
  })
  @ApiParam({
    name: 'assignmentId',
    description: 'ID Assignment (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Xóa phân công thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phân công' })
  @ApiAuthResponses()
  async removeWarehouseAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser('userId') currentUserId: string,
    @I18nLang() lang: string,
  ) {
    await this.qcManagementService.removeWarehouseAssignment(
      assignmentId,
      currentUserId,
      lang,
    );
    return new DeletedResponse('qc-management.remove.success', null);
  }

  @Post('rows/:id/assignments')
  @RequirePermission('qc-management.assign')
  @ApiOperation({
    summary: 'Gán user vào QC Row',
    description:
      'Gán một user vào QC Row với các permissions cụ thể. Yêu cầu quyền `qc-management.assign`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID QC Row (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: AssignUserToRowDto,
    description: 'Thông tin gán user vào row',
    examples: {
      basic: {
        summary: 'Gán user cơ bản',
        value: { user_id: '550e8400-e29b-41d4-a716-446655440001' },
      },
      with_permissions: {
        summary: 'Gán user với permissions',
        value: {
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          permission_ids: ['perm-uuid-1', 'perm-uuid-2'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Gán user thành công' })
  @ApiResponse({ status: 400, description: 'Permissions không hợp lệ' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
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
    return new CreatedResponse('qc-management.assign.success', data);
  }

  @Delete('rows/assignments/:assignmentId')
  @RequirePermission('qc-management.assign')
  @ApiOperation({
    summary: 'Xóa phân công row',
    description:
      'Xóa phân công user khỏi QC Row. Yêu cầu quyền `qc-management.assign`.',
  })
  @ApiParam({
    name: 'assignmentId',
    description: 'ID Assignment (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Xóa phân công thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phân công' })
  @ApiAuthResponses()
  async removeRowAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser('userId') currentUserId: string,
    @I18nLang() lang: string,
  ) {
    await this.qcManagementService.removeRowAssignment(
      assignmentId,
      currentUserId,
      lang,
    );
    return new DeletedResponse('qc-management.remove.success', null);
  }
}
