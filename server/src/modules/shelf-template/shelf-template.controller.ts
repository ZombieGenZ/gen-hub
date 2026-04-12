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

import { ShelfTemplateService } from './shelf-template.service';
import {
  CreateShelfTemplateDto,
  UpdateShelfTemplateDto,
  QueryShelfTemplateDto,
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

@ApiTags('Shelf Templates')
@Controller(
  'warehouse-templates/:warehouseTemplateId/rows/:rowId/racks/:rackId/shelves',
)
export class ShelfTemplateController {
  constructor(
    private readonly service: ShelfTemplateService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Kiểm tra user có permission cụ thể không
   */
  private async hasPermission(
    userId: string,
    permissionKey: string,
  ): Promise<boolean> {
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

  @Post()
  @ApiOperation({
    summary: 'Tạo tầng mới cho kệ',
    description:
      'Tạo mới một tầng (shelf) trong kệ (rack) của template kho hàng. Yêu cầu quyền `shelf-template.create`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    type: 'string',
    format: 'uuid',
    description: 'ID của warehouse template',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    type: 'string',
    format: 'uuid',
    description: 'ID của dãy',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'rackId',
    type: 'string',
    format: 'uuid',
    description: 'ID của kệ',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiBody({
    type: CreateShelfTemplateDto,
    description: 'Dữ liệu tạo tầng mới',
    examples: {
      basic: {
        summary: 'Tầng cơ bản',
        description: 'Tạo tầng với thông tin tối thiểu',
        value: {
          name: 'Tầng 1',
          code: 'SHELF-1',
        },
      },
      with_description: {
        summary: 'Tầng với mô tả',
        description: 'Tạo tầng với mô tả chi tiết',
        value: {
          name: 'Tầng 2',
          code: 'SHELF-2',
          description: 'Tầng thứ 2 từ dưới lên',
        },
      },
      full: {
        summary: 'Tầng đầy đủ thông tin',
        description:
          'Tạo tầng với đầy đủ thông tin bao gồm chiều cao và trạng thái',
        value: {
          name: 'Tầng 3',
          code: 'SHELF-3',
          description: 'Tầng trên cùng, phù hợp hàng nhẹ',
          height: 50,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo tầng thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'shelf-template.success.created' },
        message: { type: 'string', example: 'Tạo tầng thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440003',
            },
            name: { type: 'string', example: 'Tầng 1' },
            code: { type: 'string', example: 'SHELF-1' },
            description: { type: 'string', example: 'Tầng đầu tiên' },
            height: { type: 'number', example: 50 },
            is_active: { type: 'boolean', example: true },
            rack_template_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440002',
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
    description: 'Không tìm thấy kệ',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'shelf-template.errors.rack_template_not_found',
        },
        message: { type: 'string', example: 'Không tìm thấy kệ' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã tầng đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'shelf-template.errors.code_exists' },
        message: { type: 'string', example: 'Mã tầng đã tồn tại trong kệ này' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('shelf-template.create')
  async create(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Body() dto: CreateShelfTemplateDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.create(rackId, dto, userId, lang);
    return new CreatedResponse('shelf-template.success.created', result);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tầng của kệ',
    description:
      'Lấy danh sách các tầng trong kệ có hỗ trợ phân trang và lọc. Yêu cầu quyền `shelf-template.list`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    type: 'string',
    format: 'uuid',
    description: 'ID của warehouse template',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    type: 'string',
    format: 'uuid',
    description: 'ID của dãy',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'rackId',
    type: 'string',
    format: 'uuid',
    description: 'ID của kệ',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Số lượng bản ghi tối đa',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: 'number',
    description: 'Số bản ghi bỏ qua',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: 'string',
    description: 'Từ khóa tìm kiếm (theo tên, mã, mô tả)',
    example: 'Tầng 1',
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
    description: 'Lấy danh sách tầng thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'shelf-template.success.fetched' },
        message: { type: 'string', example: 'Lấy dữ liệu tầng thành công' },
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
                    example: '550e8400-e29b-41d4-a716-446655440003',
                  },
                  name: { type: 'string', example: 'Tầng 1' },
                  code: { type: 'string', example: 'SHELF-1' },
                  description: { type: 'string', example: 'Tầng đầu tiên' },
                  height: { type: 'number', example: 50 },
                  is_active: { type: 'boolean', example: true },
                },
              },
            },
            total: { type: 'number', example: 5 },
            limit: { type: 'number', example: 10 },
            offset: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy kệ',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'shelf-template.errors.rack_template_not_found',
        },
        message: { type: 'string', example: 'Không tìm thấy kệ' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('shelf-template.list', 'shelf-template.list.all')
  async findMany(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Query() query: QueryShelfTemplateDto,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.findMany(rackId, query, lang);
    return new GetResponse('shelf-template.success.fetched', result);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết tầng',
    description:
      'Lấy thông tin chi tiết của một tầng trong kệ. Yêu cầu quyền `shelf-template.read`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    type: 'string',
    format: 'uuid',
    description: 'ID của warehouse template',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    type: 'string',
    format: 'uuid',
    description: 'ID của dãy',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'rackId',
    type: 'string',
    format: 'uuid',
    description: 'ID của kệ',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID của tầng',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết tầng thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'shelf-template.success.fetched' },
        message: { type: 'string', example: 'Lấy dữ liệu tầng thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440003',
            },
            name: { type: 'string', example: 'Tầng 1' },
            code: { type: 'string', example: 'SHELF-1' },
            description: { type: 'string', example: 'Tầng đầu tiên' },
            height: { type: 'number', example: 50 },
            is_active: { type: 'boolean', example: true },
            rack_template_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440002',
            },
            rack_template: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  example: '550e8400-e29b-41d4-a716-446655440002',
                },
                name: { type: 'string', example: 'Kệ A1' },
                code: { type: 'string', example: 'RACK-A1' },
              },
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
        code: { type: 'string', example: 'shelf-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy tầng' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('shelf-template.read', 'shelf-template.read.all')
  async findById(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.findById(id, lang);
    return new GetResponse('shelf-template.success.fetched', result);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật tầng',
    description:
      'Cập nhật thông tin của một tầng trong kệ. Chỉ các trường được gửi trong request body mới được cập nhật. Yêu cầu quyền `shelf-template.update`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    type: 'string',
    format: 'uuid',
    description: 'ID của warehouse template',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    type: 'string',
    format: 'uuid',
    description: 'ID của dãy',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'rackId',
    type: 'string',
    format: 'uuid',
    description: 'ID của kệ',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID của tầng',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @ApiBody({
    type: UpdateShelfTemplateDto,
    description: 'Dữ liệu cập nhật tầng (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_name: {
        summary: 'Cập nhật tên tầng',
        description: 'Ví dụ cập nhật tên của tầng',
        value: {
          name: 'Tầng 1 (Updated)',
        },
      },
      update_height: {
        summary: 'Cập nhật chiều cao',
        description: 'Ví dụ cập nhật chiều cao của tầng',
        value: {
          height: 60,
        },
      },
      update_status: {
        summary: 'Thay đổi trạng thái',
        description: 'Ví dụ tắt trạng thái hoạt động',
        value: {
          is_active: false,
        },
      },
      update_full: {
        summary: 'Cập nhật toàn bộ',
        description: 'Ví dụ cập nhật nhiều trường cùng lúc',
        value: {
          name: 'Tầng 1 Premium',
          code: 'SHELF-1-PREM',
          description: 'Tầng được nâng cấp với sức chứa cao hơn',
          height: 75,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật tầng thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'shelf-template.success.updated' },
        message: { type: 'string', example: 'Cập nhật tầng thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440003',
            },
            name: { type: 'string', example: 'Tầng 1 (Updated)' },
            code: { type: 'string', example: 'SHELF-1' },
            description: { type: 'string', example: 'Tầng đầu tiên' },
            height: { type: 'number', example: 60 },
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
    description: 'Không tìm thấy tầng',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'shelf-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy tầng' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã tầng đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'shelf-template.errors.code_exists' },
        message: { type: 'string', example: 'Mã tầng đã tồn tại trong kệ này' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('shelf-template.update', 'shelf-template.update.all')
  async update(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShelfTemplateDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.update(id, dto, userId, lang);
    return new UpdatedResponse('shelf-template.success.updated', result);
  }

  @Delete('delete/many')
  @ApiOperation({
    summary: 'Xóa nhiều tầng',
    description:
      'Xóa mềm nhiều tầng cùng lúc. Yêu cầu quyền `shelf-template.delete`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    type: 'string',
    format: 'uuid',
    description: 'ID của warehouse template',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    type: 'string',
    format: 'uuid',
    description: 'ID của dãy',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'rackId',
    type: 'string',
    format: 'uuid',
    description: 'ID của kệ',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID các tầng cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa nhiều tầng',
        description: 'Ví dụ xóa 2 tầng cùng lúc',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440003',
            '550e8400-e29b-41d4-a716-446655440004',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều tầng thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'shelf-template.success.deleted' },
        message: { type: 'string', example: 'Xóa tầng thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy một hoặc nhiều tầng',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'shelf-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy tầng' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('shelf-template.delete', 'shelf-template.delete.all')
  async deleteMany(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.deleteMany(dto.ids, userId, lang);
    return new DeletedResponse('shelf-template.success.deleted', null);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa tầng',
    description:
      'Xóa mềm một tầng trong kệ. Yêu cầu quyền `shelf-template.delete`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    type: 'string',
    format: 'uuid',
    description: 'ID của warehouse template',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    type: 'string',
    format: 'uuid',
    description: 'ID của dãy',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'rackId',
    type: 'string',
    format: 'uuid',
    description: 'ID của kệ',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID của tầng cần xóa',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa tầng thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'shelf-template.success.deleted' },
        message: { type: 'string', example: 'Xóa tầng thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tầng',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'shelf-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy tầng' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('shelf-template.delete', 'shelf-template.delete.all')
  async delete(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('rackId', ParseUUIDPipe) rackId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.delete(id, userId, lang);
    return new DeletedResponse('shelf-template.success.deleted', null);
  }
}
