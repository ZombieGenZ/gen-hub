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
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { AddonTypeService } from './addon-type.service';
import {
  CreateAddonTypeDto,
  UpdateAddonTypeDto,
  QueryAddonTypeDto,
} from './dto';
import { IAddonTypePaginatedResponse, IAddonTypeWithRelations } from './types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RequireAnyPermission } from '../../common/decorators/require-any-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ApiAuthResponses,
  ApiUnauthorizedResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators/api-common-responses.decorator';
import {
  CreatedResponse,
  UpdatedResponse,
  GetResponse,
  DeletedResponse,
} from '../../common/responses/success.response';

@ApiTags('Addon Types')
@Controller('addon-types')
export class AddonTypeController {
  constructor(
    private readonly addonTypeService: AddonTypeService,
    private readonly prisma: PrismaService,
  ) { }

  /**
   * Kiểm tra user có permission cụ thể không
   */
  private async hasPermission(
    userId: string,
    permissionKey: string,
  ): Promise<boolean> {
    if (!userId) return false;

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

    // Check direct permissions
    const hasDirectPerm = user.system_permissions.some(
      (p) => p.permission.key === permissionKey,
    );
    if (hasDirectPerm) return true;

    // Check role permissions
    const hasRolePerm = user.system_roles.some((ur) =>
      ur.role.permissions.some((rp) => rp.permission.key === permissionKey),
    );
    return hasRolePerm;
  }

  @ApiOperation({
    summary: 'Tạo loại addon mới',
    description:
      'Tạo một loại addon mới trong hệ thống. Loại addon được sử dụng để phân loại các addon theo nhóm chức năng. Yêu cầu quyền `addon-type.create`.',
  })
  @ApiBody({
    type: CreateAddonTypeDto,
    description: 'Thông tin loại addon cần tạo',
    examples: {
      security_type: {
        summary: 'Loại addon bảo mật',
        description: 'Tạo loại addon cho các tính năng bảo mật',
        value: {
          name: 'Bảo mật',
          description: 'Các addon liên quan đến bảo mật hệ thống',
          is_active: true,
        },
      },
      utility_type: {
        summary: 'Loại addon tiện ích',
        description: 'Tạo loại addon cho các tiện ích mở rộng',
        value: {
          name: 'Tiện ích',
          description: 'Các addon tiện ích mở rộng chức năng',
          is_active: true,
        },
      },
      integration_type: {
        summary: 'Loại addon tích hợp',
        description: 'Tạo loại addon cho các tích hợp bên thứ ba',
        value: {
          name: 'Tích hợp',
          description: 'Các addon tích hợp với dịch vụ bên ngoài',
          is_active: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo loại addon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.created' },
        message: { type: 'string', example: 'Đã tạo loại addon thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', example: 'Bảo mật' },
            description: {
              type: 'string',
              example: 'Các addon liên quan đến bảo mật hệ thống',
            },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-22T07:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-22T07:00:00.000Z',
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên loại addon đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.name_exists' },
        message: { type: 'string', example: 'Tên loại addon đã tồn tại' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('addon-type.create')
  @Post()
  async create(
    @Body() dto: CreateAddonTypeDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const addonType = await this.addonTypeService.create(dto, userId, lang);
    return new CreatedResponse('addon-type.created', addonType);
  }

  @ApiOperation({
    summary: 'Lấy danh sách loại addon',
    description:
      'Lấy danh sách loại addon với hỗ trợ phân trang, lọc theo trạng thái và tìm kiếm theo từ khóa. Yêu cầu quyền `addon-type.list`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi mỗi trang (mặc định: 10, tối thiểu: 1)',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu (mặc định: 0)',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm theo tên hoặc mô tả',
    example: 'bảo mật',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái hoạt động (true/false)',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách loại addon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.list' },
        message: {
          type: 'string',
          example: 'Lấy danh sách loại addon thành công',
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
                  id: {
                    type: 'string',
                    format: 'uuid',
                    example: '550e8400-e29b-41d4-a716-446655440000',
                  },
                  name: { type: 'string', example: 'Bảo mật' },
                  description: {
                    type: 'string',
                    example: 'Các addon liên quan đến bảo mật',
                  },
                  is_active: { type: 'boolean', example: true },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'number', example: 50 },
            limit: { type: 'number', example: 10 },
            offset: { type: 'number', example: 0 },
            hasMore: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('addon-type.list', 'addon-type.list.all')
  @Get()
  async findAll(
    @Query() query: QueryAddonTypeDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IAddonTypePaginatedResponse>> {
    const hasListAllPermission = await this.hasPermission(userId, 'addon-type.list.all');
    const result = await this.addonTypeService.findAll(query, userId, hasListAllPermission);
    return new GetResponse('addon-type.list', result);
  }

  @ApiOperation({
    summary: 'Lấy tất cả loại addon đang hoạt động',
    description:
      'Lấy danh sách tất cả loại addon có trạng thái is_active = true. API này thường được sử dụng cho dropdown select. Chỉ yêu cầu xác thực, không yêu cầu quyền đặc biệt.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách loại addon đang hoạt động thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.active' },
        message: {
          type: 'string',
          example: 'Lấy danh sách loại addon thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              name: { type: 'string', example: 'Bảo mật' },
              description: {
                type: 'string',
                example: 'Các addon liên quan đến bảo mật',
              },
              is_active: { type: 'boolean', example: true },
            },
          },
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Lấy tất cả loại addon đang hoạt động',
    description:
      'Lấy danh sách tất cả loại addon có trạng thái is_active = true và is_deleted = false. API này thường được sử dụng cho dropdown select. Yêu cầu quyền `addon-type.list` hoặc `addon-type.list.all`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách loại addon đang hoạt động thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.active' },
        message: {
          type: 'string',
          example: 'Lấy danh sách loại addon thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              name: { type: 'string', example: 'Bảo mật' },
              description: {
                type: 'string',
                example: 'Các addon liên quan đến bảo mật',
              },
              is_active: { type: 'boolean', example: true },
            },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('addon-type.list', 'addon-type.list.all')
  @Get('active')
  async findAllActive(@CurrentUser('userId') userId: string) {
    const hasListAllPermission = await this.hasPermission(userId, 'addon-type.list.all');
    const result = await this.addonTypeService.findAllActive(userId, hasListAllPermission);
    return new GetResponse('addon-type.active', result);
  }

  @ApiOperation({
    summary: 'Lấy chi tiết loại addon',
    description:
      'Lấy thông tin chi tiết của một loại addon theo ID. Yêu cầu quyền `addon-type.read`.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'ID của loại addon (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết loại addon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.read' },
        message: {
          type: 'string',
          example: 'Lấy chi tiết loại addon thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', example: 'Bảo mật' },
            description: {
              type: 'string',
              example: 'Các addon liên quan đến bảo mật hệ thống',
            },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-22T07:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-22T07:00:00.000Z',
            },
            created_by: { type: 'string', format: 'uuid' },
            updated_by: { type: 'string', format: 'uuid', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy loại addon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.not_found' },
        message: { type: 'string', example: 'Không tìm thấy loại addon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('addon-type.read', 'addon-type.read.all')
  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IAddonTypeWithRelations>> {
    const hasReadAllPermission = await this.hasPermission(userId, 'addon-type.read.all');
    const addonType = await this.addonTypeService.findById(id, userId, hasReadAllPermission, lang);
    return new GetResponse('addon-type.read', addonType);
  }

  @ApiOperation({
    summary: 'Cập nhật loại addon',
    description:
      'Cập nhật thông tin loại addon theo ID. Chỉ các trường được gửi trong request body mới được cập nhật. Yêu cầu quyền `addon-type.update`.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'ID của loại addon cần cập nhật (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateAddonTypeDto,
    description: 'Thông tin cần cập nhật (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_name: {
        summary: 'Cập nhật tên',
        description: 'Chỉ cập nhật tên loại addon',
        value: {
          name: 'Bảo mật nâng cao',
        },
      },
      update_status: {
        summary: 'Cập nhật trạng thái',
        description: 'Bật/tắt trạng thái hoạt động',
        value: {
          is_active: false,
        },
      },
      update_description: {
        summary: 'Cập nhật mô tả',
        description: 'Chỉ cập nhật mô tả',
        value: {
          description: 'Các addon bảo mật cao cấp cho doanh nghiệp',
        },
      },
      update_full: {
        summary: 'Cập nhật toàn bộ',
        description: 'Cập nhật tất cả các trường',
        value: {
          name: 'Bảo mật Pro',
          description: 'Các addon bảo mật chuyên nghiệp',
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật loại addon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.updated' },
        message: {
          type: 'string',
          example: 'Đã cập nhật loại addon thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', example: 'Bảo mật Pro' },
            description: {
              type: 'string',
              example: 'Các addon bảo mật chuyên nghiệp',
            },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            updated_by: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy loại addon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.not_found' },
        message: { type: 'string', example: 'Không tìm thấy loại addon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên loại addon đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.name_exists' },
        message: { type: 'string', example: 'Tên loại addon đã tồn tại' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('addon-type.update', 'addon-type.update.all')
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddonTypeDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const hasUpdateAllPermission = await this.hasPermission(userId, 'addon-type.update.all');
    const addonType = await this.addonTypeService.update(id, dto, userId, hasUpdateAllPermission, lang);
    return new UpdatedResponse('addon-type.updated', addonType);
  }

  @ApiOperation({
    summary: 'Xóa loại addon',
    description:
      'Xóa mềm (soft delete) một loại addon theo ID. Loại addon bị xóa sẽ không hiển thị trong danh sách nhưng vẫn được lưu trong database. Yêu cầu quyền `addon-type.delete`.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'ID của loại addon cần xóa (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa loại addon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.deleted' },
        message: { type: 'string', example: 'Đã xóa loại addon thành công' },
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy loại addon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.not_found' },
        message: { type: 'string', example: 'Không tìm thấy loại addon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('addon-type.delete', 'addon-type.delete.all')
  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const hasDeleteAllPermission = await this.hasPermission(userId, 'addon-type.delete.all');
    await this.addonTypeService.delete(id, userId, hasDeleteAllPermission, lang);
    return new DeletedResponse('addon-type.deleted', null);
  }

  @ApiOperation({
    summary: 'Xóa nhiều loại addon',
    description:
      'Xóa mềm (soft delete) nhiều loại addon cùng lúc theo danh sách ID. Yêu cầu quyền `addon-type.delete`.',
  })
  @ApiBody({
    description: 'Danh sách ID các loại addon cần xóa',
    schema: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Mảng các ID loại addon (UUID)',
          example: [
            '550e8400-e29b-41d4-a716-446655440000',
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
          ],
        },
      },
    },
    examples: {
      delete_two: {
        summary: 'Xóa 2 loại addon',
        description: 'Ví dụ xóa 2 loại addon',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440000',
            '550e8400-e29b-41d4-a716-446655440001',
          ],
        },
      },
      delete_multiple: {
        summary: 'Xóa nhiều loại addon',
        description: 'Ví dụ xóa nhiều loại addon cùng lúc',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440000',
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều loại addon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.deletedMany' },
        message: {
          type: 'string',
          example: 'Đã xóa các loại addon thành công',
        },
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy loại addon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon-type.not_found' },
        message: { type: 'string', example: 'Không tìm thấy loại addon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('addon-type.delete', 'addon-type.delete.all')
  @Delete('delete/many')
  async deleteMany(
    @Body('ids') ids: string[],
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const hasDeleteAllPermission = await this.hasPermission(userId, 'addon-type.delete.all');
    await this.addonTypeService.deleteMany(ids, userId, hasDeleteAllPermission, lang);
    return new DeletedResponse('addon-type.deletedMany', null);
  }
}
