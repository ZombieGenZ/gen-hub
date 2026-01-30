import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { BlockTemplateService } from './block-template.service';
import {
  CreateBlockTemplateDto,
  UpdateBlockTemplateDto,
  QueryBlockTemplateDto,
} from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import {
  RequirePermission,
  RequireAnyPermission,
  CurrentUser,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatedResponse,
  UpdatedResponse,
  GetResponse,
  DeletedResponse,
} from '../../common/responses';

@ApiTags('Block Templates')
@Controller(
  'warehouse-templates/:warehouseTemplateId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks',
)
export class BlockTemplateController {
  constructor(
    private readonly service: BlockTemplateService,
    private readonly prisma: PrismaService,
  ) { }

  /**
   * Kiểm tra user có permission cụ thể không
   */
  private async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
        system_roles: {
          where: { is_deleted: false, is_active: true },
          include: {
            role: {
              include: {
                permissions: {
                  where: { is_deleted: false, is_active: true },
                  include: { permission: true },
                },
              },
            },
          },
        },
        system_permissions: {
          where: { is_deleted: false, is_active: true },
          include: { permission: true },
        },
      },
    });

    if (!user) return false;

    const hasDirectPerm = user.system_permissions.some(
      (p) => p.permission.key === permissionKey,
    );
    if (hasDirectPerm) return true;

    const hasRolePerm = user.system_roles.some((ur) =>
      ur.role.permissions.some((rp) => rp.permission.key === permissionKey),
    );
    return hasRolePerm;
  }

  @ApiOperation({
    summary: 'Tạo ô mới cho tầng',
    description:
      'Tạo một ô (block) mới trong tầng kệ. Ô là đơn vị nhỏ nhất trong cấu trúc kho hàng, dùng để chứa hàng hóa. Yêu cầu quyền `block-template.create`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    description: 'ID của dãy (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'rackId',
    description: 'ID của kệ (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiParam({
    name: 'shelfId',
    description: 'ID của tầng (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @ApiBody({
    type: CreateBlockTemplateDto,
    description: 'Dữ liệu tạo ô mới',
    examples: {
      basic: {
        summary: 'Tạo ô cơ bản',
        description: 'Tạo ô chỉ với thông tin bắt buộc',
        value: {
          name: 'Ô 1',
          code: 'BLOCK-1',
        },
      },
      full: {
        summary: 'Tạo ô đầy đủ thông tin',
        description: 'Tạo ô với tất cả thông tin',
        value: {
          name: 'Ô Premium A1',
          code: 'BLOCK-PREM-A1',
          description: 'Ô chứa hàng cao cấp, kiểm soát nhiệt độ',
          max_weight_capacity: 500,
          height: 120,
          position_x: 10,
          position_y: 5,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo ô thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'block-template.success.created' },
        message: { type: 'string', example: 'Tạo ô thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440099',
            },
            name: { type: 'string', example: 'Ô 1' },
            code: { type: 'string', example: 'BLOCK-1' },
            description: { type: 'string', example: 'Ô chứa hàng cao cấp' },
            max_weight_capacity: { type: 'number', example: 500 },
            height: { type: 'number', example: 120 },
            position_x: { type: 'number', example: 10 },
            position_y: { type: 'number', example: 5 },
            is_active: { type: 'boolean', example: true },
            shelf_template_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440003',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-24T00:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-24T00:00:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tầng',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'block-template.errors.shelf_template_not_found',
        },
        message: { type: 'string', example: 'Không tìm thấy tầng' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã ô đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'block-template.errors.code_exists' },
        message: { type: 'string', example: 'Mã ô đã tồn tại trong tầng này' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('block-template.create')
  @Post()
  async create(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Param('shelfId', ParseUUIDPipe) shelfId: string,
    @Body() dto: CreateBlockTemplateDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.create(shelfId, dto, userId, lang);
    return new CreatedResponse('block-template.success.created', result);
  }

  @ApiOperation({
    summary: 'Lấy danh sách ô của tầng',
    description:
      'Lấy danh sách các ô trong tầng kệ có hỗ trợ phân trang và bộ lọc. Yêu cầu quyền `block-template.list`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    description: 'ID của dãy (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'rackId',
    description: 'ID của kệ (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiParam({
    name: 'shelfId',
    description: 'ID của tầng (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Số lượng bản ghi tối đa (mặc định: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: 'number',
    description: 'Số bản ghi bỏ qua (mặc định: 0)',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: 'string',
    description: 'Từ khóa tìm kiếm (theo tên, mã, mô tả)',
    example: 'Ô A',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: 'boolean',
    description: 'Lọc theo trạng thái hoạt động',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách ô thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'block-template.success.fetched' },
        message: { type: 'string', example: 'Lấy dữ liệu ô thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    example: '550e8400-e29b-41d4-a716-446655440099',
                  },
                  name: { type: 'string', example: 'Ô 1' },
                  code: { type: 'string', example: 'BLOCK-1' },
                  description: { type: 'string', example: 'Ô chứa hàng' },
                  max_weight_capacity: { type: 'number', example: 500 },
                  height: { type: 'number', example: 120 },
                  is_active: { type: 'boolean', example: true },
                },
              },
            },
            total: { type: 'number', example: 50 },
            limit: { type: 'number', example: 10 },
            offset: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tầng',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'block-template.errors.shelf_template_not_found',
        },
        message: { type: 'string', example: 'Không tìm thấy tầng' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('block-template.list', 'block-template.list.all')
  @Get()
  async findMany(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Param('shelfId', ParseUUIDPipe) shelfId: string,
    @Query() query: QueryBlockTemplateDto,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.findMany(shelfId, query, lang);
    return new GetResponse('block-template.success.fetched', result);
  }

  @ApiOperation({
    summary: 'Lấy chi tiết ô',
    description:
      'Lấy thông tin chi tiết của một ô trong tầng kệ. Yêu cầu quyền `block-template.read`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    description: 'ID của dãy (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'rackId',
    description: 'ID của kệ (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiParam({
    name: 'shelfId',
    description: 'ID của tầng (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của ô (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440099',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết ô thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'block-template.success.fetched' },
        message: { type: 'string', example: 'Lấy dữ liệu ô thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440099',
            },
            name: { type: 'string', example: 'Ô 1' },
            code: { type: 'string', example: 'BLOCK-1' },
            description: { type: 'string', example: 'Ô chứa hàng cao cấp' },
            max_weight_capacity: { type: 'number', example: 500 },
            height: { type: 'number', example: 120 },
            position_x: { type: 'number', example: 10 },
            position_y: { type: 'number', example: 5 },
            is_active: { type: 'boolean', example: true },
            shelf_template_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440003',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-24T00:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-24T00:00:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ô',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'block-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy ô' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('block-template.read', 'block-template.read.all')
  @Get(':id')
  async findById(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Param('shelfId', ParseUUIDPipe) shelfId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.findById(id, lang);
    return new GetResponse('block-template.success.fetched', result);
  }

  @ApiOperation({
    summary: 'Cập nhật ô',
    description:
      'Cập nhật một phần hoặc toàn bộ thông tin của ô. Chỉ các trường được gửi trong request body mới được cập nhật. Yêu cầu quyền `block-template.update`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    description: 'ID của dãy (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'rackId',
    description: 'ID của kệ (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiParam({
    name: 'shelfId',
    description: 'ID của tầng (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của ô cần cập nhật (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440099',
  })
  @ApiBody({
    type: UpdateBlockTemplateDto,
    description: 'Dữ liệu cập nhật ô (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_basic: {
        summary: 'Cập nhật thông tin cơ bản',
        description: 'Cập nhật tên và mô tả ô',
        value: {
          name: 'Ô 1 (Updated)',
          description: 'Mô tả cập nhật',
        },
      },
      update_capacity: {
        summary: 'Cập nhật sức chứa',
        description: 'Cập nhật khả năng chịu tải và chiều cao',
        value: {
          max_weight_capacity: 750,
          height: 150,
        },
      },
      update_position: {
        summary: 'Cập nhật vị trí',
        description: 'Cập nhật vị trí ô trên layout',
        value: {
          position_x: 15,
          position_y: 8,
        },
      },
      update_status: {
        summary: 'Thay đổi trạng thái',
        description: 'Tắt hoạt động của ô',
        value: {
          is_active: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật ô thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'block-template.success.updated' },
        message: { type: 'string', example: 'Cập nhật ô thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440099',
            },
            name: { type: 'string', example: 'Ô 1 (Updated)' },
            code: { type: 'string', example: 'BLOCK-1' },
            description: { type: 'string', example: 'Mô tả cập nhật' },
            max_weight_capacity: { type: 'number', example: 750 },
            height: { type: 'number', example: 150 },
            position_x: { type: 'number', example: 15 },
            position_y: { type: 'number', example: 8 },
            is_active: { type: 'boolean', example: true },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-24T00:00:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ô',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'block-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy ô' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã ô đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'block-template.errors.code_exists' },
        message: { type: 'string', example: 'Mã ô đã tồn tại trong tầng này' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('block-template.update', 'block-template.update.all')
  @Put(':id')
  async update(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Param('shelfId', ParseUUIDPipe) shelfId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlockTemplateDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.update(id, dto, userId, lang);
    return new UpdatedResponse('block-template.success.updated', result);
  }

  @ApiOperation({
    summary: 'Xóa nhiều ô',
    description:
      'Xóa mềm nhiều ô cùng lúc. Các ô bị xóa sẽ không bị xóa vĩnh viễn mà chỉ đánh dấu đã xóa. Yêu cầu quyền `block-template.delete`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    description: 'ID của dãy (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'rackId',
    description: 'ID của kệ (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiParam({
    name: 'shelfId',
    description: 'ID của tầng (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID các ô cần xóa',
    examples: {
      delete_many: {
        summary: 'Xóa nhiều ô',
        description: 'Xóa 2 ô cùng lúc',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440099',
            '550e8400-e29b-41d4-a716-446655440098',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều ô thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'block-template.success.deleted' },
        message: { type: 'string', example: 'Xóa ô thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ô',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'block-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy ô' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('block-template.delete', 'block-template.delete.all')
  @Delete('delete/many')
  async deleteMany(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Param('shelfId', ParseUUIDPipe) shelfId: string,
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.deleteMany(dto.ids, userId, lang);
    return new DeletedResponse('block-template.success.deleted', null);
  }

  @ApiOperation({
    summary: 'Xóa ô',
    description:
      'Xóa mềm một ô. Ô bị xóa sẽ không bị xóa vĩnh viễn mà chỉ đánh dấu đã xóa. Yêu cầu quyền `block-template.delete`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    description: 'ID của dãy (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'rackId',
    description: 'ID của kệ (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiParam({
    name: 'shelfId',
    description: 'ID của tầng (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của ô cần xóa (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440099',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa ô thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'block-template.success.deleted' },
        message: { type: 'string', example: 'Xóa ô thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ô',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'block-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy ô' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('block-template.delete', 'block-template.delete.all')
  @Delete(':id')
  async delete(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Param('shelfId', ParseUUIDPipe) shelfId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.delete(id, userId, lang);
    return new DeletedResponse('block-template.success.deleted', null);
  }
}
