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

import { RackTemplateService } from './rack-template.service';
import {
  CreateRackTemplateDto,
  UpdateRackTemplateDto,
  QueryRackTemplateDto,
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

@ApiTags('Rack Templates')
@Controller('warehouse-templates/:warehouseTemplateId/rows/:rowId/racks')
export class RackTemplateController {
  constructor(
    private readonly service: RackTemplateService,
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
    summary: 'Tạo kệ mới cho dãy',
    description:
      'Tạo một kệ mới trong dãy templates đã chỉ định. Kệ có thể cấu hình các thông số như tên, mã, vị trí, kích thước, khả năng chịu tải và ngưỡng quá tải. Yêu cầu quyền `rack-template.create`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    description: 'ID của dãy chứa kệ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: CreateRackTemplateDto,
    description: 'Dữ liệu tạo kệ mới',
    examples: {
      basic: {
        summary: 'Tạo kệ cơ bản',
        description: 'Ví dụ tạo kệ với thông tin cơ bản',
        value: {
          name: 'Kệ 1',
          code: 'RACK-01',
          description: 'Kệ chứa hàng loại A',
        },
      },
      with_position: {
        summary: 'Tạo kệ với vị trí',
        description: 'Ví dụ tạo kệ có cấu hình vị trí và kích thước',
        value: {
          name: 'Kệ 2',
          code: 'RACK-02',
          description: 'Kệ ở góc kho',
          position_x: 5.5,
          position_y: 3.2,
          position_rotation: 0,
          dimensions_width: 2.0,
          dimensions_height: 3.5,
        },
      },
      with_capacity: {
        summary: 'Tạo kệ với cấu hình tải trọng',
        description: 'Ví dụ tạo kệ với đầy đủ cấu hình tải trọng',
        value: {
          name: 'Kệ tải trọng cao',
          code: 'RACK-HW-01',
          description: 'Kệ chứa hàng nặng',
          default_block_max_weight_capacity: 500,
          overload_threshold_percent: 90,
          position_x: 10.0,
          position_y: 5.0,
          position_rotation: 90,
          dimensions_width: 3.0,
          dimensions_height: 4.0,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo kệ thành công. Trả về thông tin kệ vừa tạo.',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Mã phản hồi',
          example: 'rack-template.success.created',
        },
        message: {
          type: 'string',
          description: 'Thông báo',
          example: 'Tạo kệ thành công',
        },
        success: {
          type: 'boolean',
          description: 'Trạng thái thành công',
          example: true,
        },
        data: {
          type: 'object',
          description: 'Dữ liệu kệ vừa tạo',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID của kệ',
              example: '550e8400-e29b-41d4-a716-446655440002',
            },
            name: { type: 'string', description: 'Tên kệ', example: 'Kệ 1' },
            code: { type: 'string', description: 'Mã kệ', example: 'RACK-01' },
            description: {
              type: 'string',
              description: 'Mô tả',
              example: 'Kệ chứa hàng loại A',
            },
            default_block_max_weight_capacity: {
              type: 'number',
              description: 'Khả năng chịu tải mặc định (kg)',
              example: 500,
            },
            overload_threshold_percent: {
              type: 'number',
              description: 'Ngưỡng quá tải (%)',
              example: 90,
            },
            position_x: {
              type: 'number',
              description: 'Vị trí X (mét)',
              example: 5.5,
            },
            position_y: {
              type: 'number',
              description: 'Vị trí Y (mét)',
              example: 3.2,
            },
            position_rotation: {
              type: 'number',
              description: 'Góc xoay (độ)',
              example: 0,
            },
            dimensions_width: {
              type: 'number',
              description: 'Chiều rộng (mét)',
              example: 2.0,
            },
            dimensions_height: {
              type: 'number',
              description: 'Chiều cao (mét)',
              example: 3.5,
            },
            is_active: {
              type: 'boolean',
              description: 'Trạng thái hoạt động',
              example: true,
            },
            row_template_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID dãy chứa kệ',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian tạo',
              example: '2026-01-23T02:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian cập nhật',
              example: '2026-01-23T02:00:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dãy',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rack-template.errors.row_template_not_found',
        },
        message: { type: 'string', example: 'Không tìm thấy dãy' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã kệ đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'rack-template.errors.code_exists' },
        message: { type: 'string', example: 'Mã kệ đã tồn tại trong dãy này' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('rack-template.create')
  async create(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Body() dto: CreateRackTemplateDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.create(rowId, dto, userId, lang);
    return new CreatedResponse(
      'rack-template.success.created',
      result,
      'Tạo kệ thành công',
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách kệ của dãy',
    description:
      'Lấy danh sách tất cả các kệ trong một dãy với hỗ trợ phân trang và tìm kiếm. Có thể lọc theo trạng thái active và tìm kiếm theo từ khóa (tên, mã, mô tả). Yêu cầu quyền `rack-template.list`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    description: 'ID của dãy chứa kệ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa trả về (mặc định: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Số bản ghi bỏ qua (mặc định: 0)',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm (theo tên, mã, mô tả)',
    example: 'RACK',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái hoạt động',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách kệ thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Mã phản hồi',
          example: 'rack-template.success.fetched',
        },
        message: {
          type: 'string',
          description: 'Thông báo',
          example: 'Lấy dữ liệu kệ thành công',
        },
        success: {
          type: 'boolean',
          description: 'Trạng thái thành công',
          example: true,
        },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Danh sách kệ',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    example: '550e8400-e29b-41d4-a716-446655440002',
                  },
                  name: { type: 'string', example: 'Kệ 1' },
                  code: { type: 'string', example: 'RACK-01' },
                  description: {
                    type: 'string',
                    example: 'Kệ chứa hàng loại A',
                  },
                  default_block_max_weight_capacity: {
                    type: 'number',
                    example: 500,
                  },
                  overload_threshold_percent: { type: 'number', example: 90 },
                  position_x: { type: 'number', example: 5.5 },
                  position_y: { type: 'number', example: 3.2 },
                  position_rotation: { type: 'number', example: 0 },
                  dimensions_width: { type: 'number', example: 2.0 },
                  dimensions_height: { type: 'number', example: 3.5 },
                  is_active: { type: 'boolean', example: true },
                  row_template_id: {
                    type: 'string',
                    format: 'uuid',
                    example: '550e8400-e29b-41d4-a716-446655440001',
                  },
                  created_at: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-01-23T02:00:00.000Z',
                  },
                  updated_at: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-01-23T02:00:00.000Z',
                  },
                },
              },
            },
            total: {
              type: 'number',
              description: 'Tổng số bản ghi',
              example: 50,
            },
            limit: {
              type: 'number',
              description: 'Số bản ghi mỗi trang',
              example: 10,
            },
            offset: {
              type: 'number',
              description: 'Vị trí bắt đầu',
              example: 0,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dãy',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rack-template.errors.row_template_not_found',
        },
        message: { type: 'string', example: 'Không tìm thấy dãy' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rack-template.list', 'rack-template.list.all')
  async findMany(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Query() query: QueryRackTemplateDto,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.findMany(rowId, query, lang);
    return new GetResponse(
      'rack-template.success.fetched',
      result,
      'Lấy danh sách kệ thành công',
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết kệ',
    description:
      'Lấy thông tin chi tiết của một kệ theo ID. Bao gồm tất cả thông tin cấu hình của kệ như vị trí, kích thước, tải trọng. Yêu cầu quyền `rack-template.read`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    description: 'ID của dãy chứa kệ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của kệ cần lấy thông tin (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết kệ thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Mã phản hồi',
          example: 'rack-template.success.fetched',
        },
        message: {
          type: 'string',
          description: 'Thông báo',
          example: 'Lấy dữ liệu kệ thành công',
        },
        success: {
          type: 'boolean',
          description: 'Trạng thái thành công',
          example: true,
        },
        data: {
          type: 'object',
          description: 'Dữ liệu chi tiết kệ',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID của kệ',
              example: '550e8400-e29b-41d4-a716-446655440002',
            },
            name: { type: 'string', description: 'Tên kệ', example: 'Kệ 1' },
            code: { type: 'string', description: 'Mã kệ', example: 'RACK-01' },
            description: {
              type: 'string',
              description: 'Mô tả',
              example: 'Kệ chứa hàng loại A',
            },
            default_block_max_weight_capacity: {
              type: 'number',
              description: 'Khả năng chịu tải mặc định (kg)',
              example: 500,
            },
            overload_threshold_percent: {
              type: 'number',
              description: 'Ngưỡng quá tải (%)',
              example: 90,
            },
            position_x: {
              type: 'number',
              description: 'Vị trí X (mét)',
              example: 5.5,
            },
            position_y: {
              type: 'number',
              description: 'Vị trí Y (mét)',
              example: 3.2,
            },
            position_rotation: {
              type: 'number',
              description: 'Góc xoay (độ)',
              example: 0,
            },
            dimensions_width: {
              type: 'number',
              description: 'Chiều rộng (mét)',
              example: 2.0,
            },
            dimensions_height: {
              type: 'number',
              description: 'Chiều cao (mét)',
              example: 3.5,
            },
            is_active: {
              type: 'boolean',
              description: 'Trạng thái hoạt động',
              example: true,
            },
            row_template_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID dãy chứa kệ',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian tạo',
              example: '2026-01-23T02:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian cập nhật',
              example: '2026-01-23T02:00:00.000Z',
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
        code: { type: 'string', example: 'rack-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy kệ' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rack-template.read', 'rack-template.read.all')
  async findById(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.findById(id, lang);
    return new GetResponse(
      'rack-template.success.fetched',
      result,
      'Lấy chi tiết kệ thành công',
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật kệ',
    description:
      'Cập nhật thông tin của một kệ theo ID. Có thể cập nhật tên, mã, vị trí, kích thước, tải trọng và trạng thái hoạt động. Yêu cầu quyền `rack-template.update`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    description: 'ID của dãy chứa kệ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của kệ cần cập nhật (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiBody({
    type: UpdateRackTemplateDto,
    description: 'Dữ liệu cập nhật kệ (chỉ gửi các trường cần thay đổi)',
    examples: {
      update_basic: {
        summary: 'Cập nhật thông tin cơ bản',
        description: 'Ví dụ cập nhật tên và mô tả của kệ',
        value: {
          name: 'Kệ 1 - Đã cập nhật',
          description: 'Kệ chứa hàng loại A - phiên bản mới',
        },
      },
      update_position: {
        summary: 'Cập nhật vị trí',
        description: 'Ví dụ di chuyển kệ sang vị trí mới',
        value: {
          position_x: 8.0,
          position_y: 4.5,
          position_rotation: 45,
        },
      },
      update_capacity: {
        summary: 'Cập nhật tải trọng',
        description: 'Ví dụ thay đổi cấu hình tải trọng của kệ',
        value: {
          default_block_max_weight_capacity: 750,
          overload_threshold_percent: 85,
        },
      },
      deactivate: {
        summary: 'Vô hiệu hóa kệ',
        description: 'Ví dụ tạm ngừng hoạt động kệ',
        value: {
          is_active: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật kệ thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Mã phản hồi',
          example: 'rack-template.success.updated',
        },
        message: {
          type: 'string',
          description: 'Thông báo',
          example: 'Cập nhật kệ thành công',
        },
        success: {
          type: 'boolean',
          description: 'Trạng thái thành công',
          example: true,
        },
        data: {
          type: 'object',
          description: 'Dữ liệu kệ sau khi cập nhật',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID của kệ',
              example: '550e8400-e29b-41d4-a716-446655440002',
            },
            name: {
              type: 'string',
              description: 'Tên kệ',
              example: 'Kệ 1 - Đã cập nhật',
            },
            code: { type: 'string', description: 'Mã kệ', example: 'RACK-01' },
            description: {
              type: 'string',
              description: 'Mô tả',
              example: 'Kệ chứa hàng loại A - phiên bản mới',
            },
            default_block_max_weight_capacity: {
              type: 'number',
              description: 'Khả năng chịu tải mặc định (kg)',
              example: 750,
            },
            overload_threshold_percent: {
              type: 'number',
              description: 'Ngưỡng quá tải (%)',
              example: 85,
            },
            position_x: {
              type: 'number',
              description: 'Vị trí X (mét)',
              example: 8.0,
            },
            position_y: {
              type: 'number',
              description: 'Vị trí Y (mét)',
              example: 4.5,
            },
            position_rotation: {
              type: 'number',
              description: 'Góc xoay (độ)',
              example: 45,
            },
            dimensions_width: {
              type: 'number',
              description: 'Chiều rộng (mét)',
              example: 2.0,
            },
            dimensions_height: {
              type: 'number',
              description: 'Chiều cao (mét)',
              example: 3.5,
            },
            is_active: {
              type: 'boolean',
              description: 'Trạng thái hoạt động',
              example: true,
            },
            row_template_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID dãy chứa kệ',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian tạo',
              example: '2026-01-23T02:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian cập nhật',
              example: '2026-01-23T03:00:00.000Z',
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
        code: { type: 'string', example: 'rack-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy kệ' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã kệ đã tồn tại hoặc vị trí bị chồng chéo',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'rack-template.errors.code_exists' },
        message: { type: 'string', example: 'Mã kệ đã tồn tại trong dãy này' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rack-template.update', 'rack-template.update.all')
  async update(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRackTemplateDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.update(id, dto, userId, lang);
    return new UpdatedResponse(
      'rack-template.success.updated',
      result,
      'Cập nhật kệ thành công',
    );
  }

  @Delete('delete/many')
  @ApiOperation({
    summary: 'Xóa nhiều kệ',
    description:
      'Xóa nhiều kệ cùng lúc theo danh sách ID. Thao tác này sẽ xóa vĩnh viễn các kệ được chọn. Yêu cầu quyền `rack-template.delete`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    description: 'ID của dãy chứa kệ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID của các kệ cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa nhiều kệ',
        description: 'Ví dụ xóa 3 kệ cùng lúc',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
            '550e8400-e29b-41d4-a716-446655440004',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều kệ thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Mã phản hồi',
          example: 'rack-template.success.deleted',
        },
        message: {
          type: 'string',
          description: 'Thông báo',
          example: 'Xóa kệ thành công',
        },
        success: {
          type: 'boolean',
          description: 'Trạng thái thành công',
          example: true,
        },
        data: {
          type: 'null',
          description: 'Không có dữ liệu trả về',
          example: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy một hoặc nhiều kệ',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'rack-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy kệ' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rack-template.delete', 'rack-template.delete.all')
  async deleteMany(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.deleteMany(dto.ids, userId, lang);
    return new DeletedResponse(
      'rack-template.success.deleted',
      null,
      'Xóa nhiều kệ thành công',
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa kệ',
    description:
      'Xóa một kệ theo ID. Thao tác này sẽ xóa vĩnh viễn kệ và không thể khôi phục. Yêu cầu quyền `rack-template.delete`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'rowId',
    description: 'ID của dãy chứa kệ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của kệ cần xóa (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa kệ thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Mã phản hồi',
          example: 'rack-template.success.deleted',
        },
        message: {
          type: 'string',
          description: 'Thông báo',
          example: 'Xóa kệ thành công',
        },
        success: {
          type: 'boolean',
          description: 'Trạng thái thành công',
          example: true,
        },
        data: {
          type: 'null',
          description: 'Không có dữ liệu trả về',
          example: null,
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
        code: { type: 'string', example: 'rack-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy kệ' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rack-template.delete', 'rack-template.delete.all')
  async delete(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.delete(id, userId, lang);
    return new DeletedResponse(
      'rack-template.success.deleted',
      null,
      'Xóa kệ thành công',
    );
  }
}
