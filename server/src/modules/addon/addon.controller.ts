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
import { I18nLang, I18nService } from 'nestjs-i18n';

import { AddonService } from './addon.service';
import {
  CreateAddonDto,
  UpdateAddonDto,
  QueryAddonDto,
  QueryActiveAddonDto,
} from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, RequireAnyPermission, CurrentUser } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators/api-common-responses.decorator';
import {
  CreatedResponse,
  UpdatedResponse,
  GetResponse,
  DeletedResponse,
} from '../../common/responses';
import { IAddon, IPaginatedResponse } from './interfaces';

@ApiTags('Addons')
@Controller('addons')
export class AddonController {
  constructor(
    private readonly addonService: AddonService,
    private readonly i18n: I18nService,
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
    summary: 'Tạo addon mới',
    description:
      'Tạo một addon mới trong hệ thống. Addon là các dịch vụ bổ sung như bảo hiểm, hỗ trợ kỹ thuật, v.v. Yêu cầu quyền `addon.create`.',
  })
  @ApiBody({
    type: CreateAddonDto,
    description: 'Thông tin addon cần tạo',
    examples: {
      basic_addon: {
        summary: 'Addon cơ bản',
        description: 'Ví dụ tạo addon với thông tin cơ bản',
        value: {
          name: 'Bảo hiểm kho hàng',
          description: 'Dịch vụ bảo hiểm hàng hóa trong kho',
          price: 500000,
          is_active: true,
        },
      },
      monthly_addon: {
        summary: 'Addon trả phí hàng tháng',
        description: 'Ví dụ tạo addon với hình thức trả phí hàng tháng',
        value: {
          name: 'Hỗ trợ kỹ thuật 24/7',
          description: 'Hỗ trợ kỹ thuật chuyên nghiệp 24/7 qua hotline và chat',
          price: 1500000,
          is_monthly_payment: true,
          is_active: true,
        },
      },
      minimal_addon: {
        summary: 'Addon tối thiểu',
        description: 'Ví dụ tạo addon chỉ với các trường bắt buộc',
        value: {
          name: 'Dịch vụ vệ sinh',
          price: 200000,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo addon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.create.success' },
        message: { type: 'string', example: 'Tạo addon thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            name: { type: 'string', example: 'Bảo hiểm kho hàng' },
            description: {
              type: 'string',
              nullable: true,
              example: 'Dịch vụ bảo hiểm hàng hóa trong kho',
            },
            price: { type: 'number', example: 500000 },
            is_monthly_payment: { type: 'boolean', example: false },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-21T07:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: null,
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên addon đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.errors.name_exists' },
        message: { type: 'string', example: 'Tên addon đã tồn tại' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('addon.create')
  @Post()
  async create(
    @Body() dto: CreateAddonDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IAddon>> {
    const result = await this.addonService.create(dto, userId, lang);
    return new CreatedResponse(
      'addon.create.success',
      result,
      this.i18n.t('addon.success.created', { lang }),
    );
  }

  @ApiOperation({
    summary: 'Lấy danh sách addon',
    description:
      'Lấy danh sách addon có hỗ trợ phân trang và lọc theo từ khóa, trạng thái, loại addon. Yêu cầu quyền `addon.list`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi mỗi trang (mặc định: 10)',
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
    example: 'bảo hiểm',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái hoạt động',
    example: true,
  })
  @ApiQuery({
    name: 'addon_type_id',
    required: false,
    type: String,
    description: 'Lọc theo ID loại addon (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách addon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.list.success' },
        message: { type: 'string', example: 'Lấy danh sách addon thành công' },
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
                    example: '550e8400-e29b-41d4-a716-446655440001',
                  },
                  name: { type: 'string', example: 'Bảo hiểm kho hàng' },
                  description: {
                    type: 'string',
                    nullable: true,
                    example: 'Dịch vụ bảo hiểm hàng hóa trong kho',
                  },
                  price: { type: 'number', example: 500000 },
                  is_monthly_payment: { type: 'boolean', example: false },
                  is_active: { type: 'boolean', example: true },
                  created_at: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-01-21T07:00:00.000Z',
                  },
                },
              },
            },
            total: { type: 'number', example: 25 },
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
  @RequireAnyPermission('addon.list', 'addon.list.all')
  @Get()
  async findAll(
    @Query() query: QueryAddonDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IPaginatedResponse<IAddon>>> {
    const hasListAllPermission = await this.hasPermission(userId, 'addon.list.all');
    const result = await this.addonService.findAll(query, userId, hasListAllPermission);
    return new GetResponse(
      'addon.list.success',
      result,
      this.i18n.t('addon.success.list', { lang }),
    );
  }

  @ApiOperation({
    summary: 'Lấy danh sách addon đang hoạt động',
    description:
      'Lấy danh sách tất cả addon đang hoạt động (is_active = true, is_deleted = false) với phân trang. API này không yêu cầu xác thực và có thể được sử dụng công khai.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi mỗi trang (mặc định: 10)',
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
    name: 'addon_type_id',
    required: false,
    type: String,
    description: 'Lọc theo ID loại addon (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách addon active thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.list.success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách addon active thành công',
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
                    example: '550e8400-e29b-41d4-a716-446655440001',
                  },
                  name: { type: 'string', example: 'Bảo hiểm kho hàng' },
                  description: {
                    type: 'string',
                    nullable: true,
                    example: 'Dịch vụ bảo hiểm hàng hóa trong kho',
                  },
                  price: { type: 'number', example: 500000 },
                  is_monthly_payment: { type: 'boolean', example: false },
                  is_active: { type: 'boolean', example: true },
                },
              },
            },
            total: { type: 'number', example: 25 },
            limit: { type: 'number', example: 10 },
            offset: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @Get('active')
  async findAllActive(
    @Query() query: QueryActiveAddonDto,
  ): Promise<GetResponse<IPaginatedResponse<IAddon>>> {
    const result = await this.addonService.findAllActive(query);
    return new GetResponse('addon.list.success', result);
  }

  @ApiOperation({
    summary: 'Lấy chi tiết addon',
    description:
      'Lấy thông tin chi tiết của một addon theo ID. Yêu cầu quyền `addon.read`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của addon (UUID v4)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết addon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.read.success' },
        message: { type: 'string', example: 'Lấy chi tiết addon thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            name: { type: 'string', example: 'Bảo hiểm kho hàng' },
            description: {
              type: 'string',
              nullable: true,
              example: 'Dịch vụ bảo hiểm hàng hóa trong kho',
            },
            price: { type: 'number', example: 500000 },
            is_monthly_payment: { type: 'boolean', example: false },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-21T07:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2026-01-21T08:00:00.000Z',
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            updated_by: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: null,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy addon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy addon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('addon.read', 'addon.read.all')
  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IAddon>> {
    const hasReadAllPermission = await this.hasPermission(userId, 'addon.read.all');
    const result = await this.addonService.findById(id, userId, hasReadAllPermission, lang);
    return new GetResponse(
      'addon.read.success',
      result,
      this.i18n.t('addon.success.fetched', { lang }),
    );
  }

  @ApiOperation({
    summary: 'Cập nhật addon',
    description:
      'Cập nhật thông tin addon theo ID. Chỉ các trường được gửi trong request body mới được cập nhật. Yêu cầu quyền `addon.update`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của addon (UUID v4)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: UpdateAddonDto,
    description:
      'Dữ liệu addon cần cập nhật (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_price: {
        summary: 'Cập nhật giá',
        description: 'Ví dụ cập nhật giá của addon',
        value: {
          price: 750000,
        },
      },
      update_status: {
        summary: 'Thay đổi trạng thái',
        description: 'Ví dụ vô hiệu hóa addon',
        value: {
          is_active: false,
        },
      },
      update_full: {
        summary: 'Cập nhật toàn bộ',
        description: 'Ví dụ cập nhật nhiều trường cùng lúc',
        value: {
          name: 'Bảo hiểm kho hàng Premium',
          description:
            'Dịch vụ bảo hiểm hàng hóa cao cấp với mức đền bù tối đa 1 tỷ VNĐ',
          price: 1000000,
          is_monthly_payment: true,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật addon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.update.success' },
        message: { type: 'string', example: 'Cập nhật addon thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            name: { type: 'string', example: 'Bảo hiểm kho hàng Premium' },
            description: {
              type: 'string',
              example:
                'Dịch vụ bảo hiểm hàng hóa cao cấp với mức đền bù tối đa 1 tỷ VNĐ',
            },
            price: { type: 'number', example: 1000000 },
            is_monthly_payment: { type: 'boolean', example: true },
            is_active: { type: 'boolean', example: true },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-21T09:00:00.000Z',
            },
            updated_by: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy addon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy addon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên addon đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.errors.name_exists' },
        message: { type: 'string', example: 'Tên addon đã tồn tại' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('addon.update', 'addon.update.all')
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddonDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IAddon>> {
    const hasUpdateAllPermission = await this.hasPermission(userId, 'addon.update.all');
    const result = await this.addonService.update(id, dto, userId, hasUpdateAllPermission, lang);
    return new UpdatedResponse(
      'addon.update.success',
      result,
      this.i18n.t('addon.success.updated', { lang }),
    );
  }

  @ApiOperation({
    summary: 'Xóa nhiều addon',
    description:
      'Xóa nhiều addon cùng lúc (soft delete). Yêu cầu quyền `addon.delete`.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID các addon cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa nhiều addon',
        description: 'Ví dụ xóa 3 addon cùng lúc',
        value: {
          ids: [
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
    description: 'Xóa nhiều addon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.delete.success' },
        message: { type: 'string', example: 'Xóa nhiều addon thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy addon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy addon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('addon.delete', 'addon.delete.all')
  @Delete('delete/many')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAllPermission = await this.hasPermission(userId, 'addon.delete.all');
    await this.addonService.deleteMany(dto.ids, userId, hasDeleteAllPermission, lang);
    return new DeletedResponse(
      'addon.delete.success',
      null,
      this.i18n.t('addon.success.deleted_many', { lang }),
    );
  }

  @ApiOperation({
    summary: 'Xóa addon',
    description:
      'Xóa một addon theo ID (soft delete). Addon bị xóa sẽ không hiển thị trong danh sách nhưng vẫn được lưu trong database. Yêu cầu quyền `addon.delete`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của addon cần xóa (UUID v4)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa addon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.delete.success' },
        message: { type: 'string', example: 'Xóa addon thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy addon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'addon.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy addon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('addon.delete', 'addon.delete.all')
  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAllPermission = await this.hasPermission(userId, 'addon.delete.all');
    await this.addonService.delete(id, userId, hasDeleteAllPermission, lang);
    return new DeletedResponse(
      'addon.delete.success',
      null,
      this.i18n.t('addon.success.deleted', { lang }),
    );
  }
}
