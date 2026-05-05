import {
  ArgumentsHost,
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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpStatus,
  UseFilters,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { I18nLang, I18nService } from 'nestjs-i18n';
import { Request, Response } from 'express';
import { MulterError } from 'multer';

import { WarehouseTemplateService } from './warehouse-template.service';
import {
  CreateWarehouseTemplateDto,
  UpdateWarehouseTemplateDto,
  QueryWarehouseTemplateDto,
  UpsertLayoutDto,
} from './dto';
import { DeleteManyDto } from '../../common/dto';
import {
  JwtAuthGuard,
  PermissionGuard,
  OptionalJwtAuthGuard,
} from '../../common/guards';
import {
  RequirePermission,
  RequireAnyPermission,
  CurrentUser,
  ApiAuthResponses,
  ApiValidationErrorResponse,
  Public,
} from '../../common/decorators';
import {
  CreatedResponse,
  UpdatedResponse,
  GetResponse,
  DeletedResponse,
  ResponseCode,
} from '../../common/responses';
import {
  IWarehouseTemplateWithRelations,
  IPaginatedResponse,
} from './interfaces';
import { PrismaService } from '../../prisma/prisma.service';

// Cấu hình upload ảnh từ environment variables
const MAX_FILE_SIZE = parseInt(
  process.env.UPLOAD_WAREHOUSE_MAX_SIZE || '5242880',
  10,
); // Default: 5MB
const MAX_FILES = parseInt(process.env.UPLOAD_WAREHOUSE_MAX_FILES || '50', 10); // Default: 50 files
const ALLOWED_MIME_TYPES = (
  process.env.UPLOAD_WAREHOUSE_ALLOWED_TYPES ||
  'image/jpeg,image/png,image/webp,image/gif'
).split(',');

interface WarehouseTemplateImageUploadRequest extends Request {
  i18n?: {
    t?: (
      key: string,
      options?: { lang?: string; args?: Record<string, unknown> },
    ) => string;
  };
  i18nLang?: string;
}

function formatUploadFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${Math.round((bytes / (1024 * 1024)) * 100) / 100}MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round((bytes / 1024) * 100) / 100}KB`;
  }

  return `${bytes}B`;
}

function isVietnameseLanguage(lang: string): boolean {
  return lang.toLowerCase().startsWith('vi');
}

@Catch(MulterError)
class WarehouseTemplateImagesUploadExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<WarehouseTemplateImageUploadRequest>();
    const lang =
      request.i18nLang ||
      request.headers['accept-language']?.toString().split(',')[0] ||
      'vi';

    let message = isVietnameseLanguage(lang)
      ? 'Upload anh that bai'
      : 'Failed to upload images';

    switch (exception.code) {
      case 'LIMIT_FILE_SIZE':
        message = isVietnameseLanguage(lang)
          ? `Moi anh khong duoc vuot qua ${formatUploadFileSize(MAX_FILE_SIZE)}`
          : `Each image must not exceed ${formatUploadFileSize(MAX_FILE_SIZE)}`;
        break;
      case 'LIMIT_FILE_COUNT':
      case 'LIMIT_UNEXPECTED_FILE':
        message = isVietnameseLanguage(lang)
          ? `Ban chi co the upload toi da ${MAX_FILES} anh moi lan`
          : `You can upload up to ${MAX_FILES} images at a time`;
        break;
      default:
        break;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      code: ResponseCode.ERROR_BAD_REQUEST,
      message,
      success: false,
    });
  }
}

@ApiTags('Warehouse Templates')
@Controller('warehouse-templates')
export class WarehouseTemplateController {
  constructor(
    private readonly service: WarehouseTemplateService,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Kiểm tra user có permission cụ thể không
   */
  private async hasPermission(
    userId: string | undefined,
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

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('warehouse-template.create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Tạo mới template kho hàng',
    description:
      'Tạo mới một template kho hàng với đầy đủ thông tin bao gồm kích thước, giá cả, tiện ích, cấu hình giảm giá theo thời gian thuê, và các thông tin kỹ thuật khác. Yêu cầu quyền `warehouse-template.create`.',
  })
  @ApiBody({
    type: CreateWarehouseTemplateDto,
    description: 'Thông tin template kho hàng cần tạo',
    examples: {
      basic: {
        summary: 'Kho hàng cơ bản',
        description: 'Tạo template kho hàng tiêu chuẩn',
        value: {
          name: 'Kho Quận 7 - A1',
          description: 'Kho hàng tiêu chuẩn tại Quận 7',
          length: 100,
          width: 50,
          price_per_month: 50000000,
          block_length: 0.5,
          block_width: 0.5,
          ceiling_height: 5.5,
          address_detail: '123 Nguyễn Văn Linh',
          manager_name: 'Nguyễn Văn A',
          manager_phone: '0901234567',
          manager_email: 'manager@example.com',
          is_active: true,
        },
      },
      cold_storage: {
        summary: 'Kho lạnh',
        description: 'Tạo template kho lạnh với kiểm soát nhiệt độ',
        value: {
          name: 'Kho Lạnh Bình Chánh - 01',
          description: 'Kho lạnh bảo quản thực phẩm',
          length: 80,
          width: 40,
          price_per_month: 80000000,
          block_length: 0.6,
          block_width: 0.6,
          ceiling_height: 4,
          is_cold_storage: true,
          min_temperature: -20,
          max_temperature: 5,
          min_humidity: 30,
          max_humidity: 70,
          is_active: true,
        },
      },
      shared: {
        summary: 'Kho chia sẻ',
        description: 'Tạo template kho cho thuê theo dãy (shared)',
        value: {
          name: 'Kho Shared Thủ Đức - S1',
          description: 'Kho cho thuê theo dãy, phù hợp doanh nghiệp nhỏ',
          length: 120,
          width: 60,
          price_per_month: 30000000,
          block_length: 0.5,
          block_width: 0.5,
          is_shared_warehouse: true,
          discount_configs: [
            {
              duration_tier_id: '550e8400-e29b-41d4-a716-446655440001',
              discount_percent: 0,
            },
            {
              duration_tier_id: '550e8400-e29b-41d4-a716-446655440002',
              discount_percent: 5,
            },
            {
              duration_tier_id: '550e8400-e29b-41d4-a716-446655440003',
              discount_percent: 10,
            },
          ],
          amenity_ids: ['uuid-amenity-1', 'uuid-amenity-2'],
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo template kho hàng thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'warehouse-template.create_success' },
        message: {
          type: 'string',
          example: 'Tạo template kho hàng thành công',
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
            name: { type: 'string', example: 'Kho Quận 7 - A1' },
            description: {
              type: 'string',
              example: 'Kho hàng tiêu chuẩn tại Quận 7',
            },
            length: { type: 'number', example: 100 },
            width: { type: 'number', example: 50 },
            price_per_month: { type: 'number', example: 50000000 },
            block_length: { type: 'number', example: 0.5 },
            block_width: { type: 'number', example: 0.5 },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên template đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'warehouse-template.name_exists' },
        message: { type: 'string', example: 'Tên template đã tồn tại' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async create(
    @Body() dto: CreateWarehouseTemplateDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IWarehouseTemplateWithRelations>> {
    const result = await this.service.create(dto, userId, lang);
    return new CreatedResponse(
      ResponseCode.WAREHOUSE_TEMPLATE_CREATE_SUCCESS,
      result,
    );
  }

  /**
   * Lấy danh sách template - không cần xác thực
   * - Có quyền list.all: có thể filter is_active = false hoặc không truyền is_active
   * - Không có quyền list.all: chỉ xem is_active = true
   */
  @Get()
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Lấy danh sách template kho hàng',
    description:
      'Lấy danh sách template kho hàng có phân trang. API công khai, không yêu cầu xác thực. Nếu có quyền `warehouse-template.list.all` sẽ xem được cả template không hoạt động.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng record (mặc định: 10)',
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
    description: 'Từ khóa tìm kiếm theo tên',
    example: 'kho A',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái hoạt động',
    example: true,
  })
  @ApiQuery({
    name: 'rental_status',
    required: false,
    enum: ['AVAILABLE', 'LOCKED', 'RENTED'],
    description: 'Lọc theo trạng thái cho thuê',
  })
  @ApiQuery({
    name: 'province_id',
    required: false,
    type: String,
    description: 'Lọc theo tỉnh/thành phố (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách template thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'warehouse-template.list_success' },
        message: {
          type: 'string',
          example: 'Lấy dữ liệu template kho hàng thành công',
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
                  name: { type: 'string' },
                  description: { type: 'string' },
                  length: { type: 'number' },
                  width: { type: 'number' },
                  price_per_month: { type: 'number' },
                  is_active: { type: 'boolean' },
                  is_cold_storage: { type: 'boolean' },
                  is_shared_warehouse: { type: 'boolean' },
                },
              },
            },
            total: { type: 'number', example: 100 },
            limit: { type: 'number', example: 10 },
            offset: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  async findMany(
    @Query() query: QueryWarehouseTemplateDto,
    @CurrentUser('userId') userId: string | undefined,
  ): Promise<GetResponse<IPaginatedResponse<IWarehouseTemplateWithRelations>>> {
    const hasListAllPermission = await this.hasPermission(
      userId,
      'warehouse-template.list.all',
    );

    // Nếu không có quyền list.all, buộc is_active = true
    if (!hasListAllPermission) {
      query.is_active = true;
      (query as any).hidePrivateRented = true;
    }

    const result = await this.service.findMany(query);
    return new GetResponse(
      ResponseCode.WAREHOUSE_TEMPLATE_LIST_SUCCESS,
      result,
    );
  }

  /**
   * Lấy chi tiết template - không cần xác thực
   */
  @Get(':id')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Lấy chi tiết template kho hàng',
    description:
      'Lấy thông tin chi tiết của một template kho hàng bao gồm layout (rows, racks, shelves, blocks), cấu hình giảm giá, và các thông tin liên quan.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của template kho hàng (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết template thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'warehouse-template.get_success' },
        message: {
          type: 'string',
          example: 'Lấy dữ liệu template kho hàng thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Kho Quận 7 - A1' },
            description: { type: 'string' },
            length: { type: 'number', example: 100 },
            width: { type: 'number', example: 50 },
            price_per_month: { type: 'number', example: 50000000 },
            block_length: { type: 'number', example: 0.5 },
            block_width: { type: 'number', example: 0.5 },
            ceiling_height: { type: 'number', example: 5.5 },
            is_cold_storage: { type: 'boolean' },
            min_temperature: { type: 'number' },
            max_temperature: { type: 'number' },
            is_shared_warehouse: { type: 'boolean' },
            rows: { type: 'array', items: { type: 'object' } },
            discount_configs: { type: 'array', items: { type: 'object' } },
            addon_gifts: { type: 'array', items: { type: 'object' } },
            insurance_gifts: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy template kho hàng' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string | undefined,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IWarehouseTemplateWithRelations>> {
    const hasListAllPermission = await this.hasPermission(
      userId,
      'warehouse-template.list.all',
    );
    const result = await this.service.findById(id, lang, hasListAllPermission);
    return new GetResponse(ResponseCode.WAREHOUSE_TEMPLATE_GET_SUCCESS, result);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(
    'warehouse-template.update',
    'warehouse-template.update.all',
  )
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cập nhật thông tin template kho hàng',
    description:
      'Cập nhật một phần hoặc toàn bộ thông tin template kho hàng. Chỉ các trường được gửi trong request body mới được cập nhật. Yêu cầu quyền `warehouse-template.update`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của template kho hàng (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateWarehouseTemplateDto,
    description:
      'Thông tin template cần cập nhật (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_info: {
        summary: 'Cập nhật thông tin cơ bản',
        value: {
          name: 'Kho Quận 7 - A1 (Updated)',
          description: 'Mô tả cập nhật',
          price_per_month: 55000000,
        },
      },
      update_manager: {
        summary: 'Cập nhật thông tin quản lý',
        value: {
          manager_name: 'Trần Văn B',
          manager_phone: '0909876543',
          manager_email: 'newmanager@example.com',
        },
      },
      update_discount: {
        summary: 'Cập nhật cấu hình giảm giá',
        value: {
          discount_configs: [
            {
              id: 'uuid-config-1',
              duration_tier_id: 'uuid-tier-1',
              discount_percent: 5,
            },
            { duration_tier_id: 'uuid-tier-2', discount_percent: 10 },
          ],
        },
      },
      toggle_status: {
        summary: 'Bật/tắt trạng thái',
        value: {
          is_active: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật template thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'warehouse-template.update_success' },
        message: {
          type: 'string',
          example: 'Cập nhật template kho hàng thành công',
        },
        success: { type: 'boolean', example: true },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên template đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'warehouse-template.name_exists' },
        message: { type: 'string', example: 'Tên template đã tồn tại' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiResponse({ status: 404, description: 'Không tìm thấy template kho hàng' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseTemplateDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IWarehouseTemplateWithRelations>> {
    const hasUpdateAll = await this.hasPermission(
      userId,
      'warehouse-template.update.all',
    );
    const result = await this.service.update(
      id,
      dto,
      userId,
      lang,
      hasUpdateAll ? undefined : userId,
    );
    return new UpdatedResponse(
      ResponseCode.WAREHOUSE_TEMPLATE_UPDATE_SUCCESS,
      result,
    );
  }

  @Delete('delete/many')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(
    'warehouse-template.delete',
    'warehouse-template.delete.all',
  )
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Xóa nhiều template kho hàng',
    description:
      'Xóa mềm nhiều template kho hàng cùng lúc. Yêu cầu quyền `warehouse-template.delete`.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID các template cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa 3 template',
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
    description: 'Xóa nhiều template thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'warehouse-template.delete_success' },
        message: {
          type: 'string',
          example: 'Xóa template kho hàng thành công',
        },
        success: { type: 'boolean', example: true },
        data: { type: 'null' },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiResponse({ status: 404, description: 'Không tìm thấy template kho hàng' })
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.service.deleteMany(dto.ids, userId, lang);
    return new DeletedResponse(
      ResponseCode.WAREHOUSE_TEMPLATE_DELETE_SUCCESS,
      null,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(
    'warehouse-template.delete',
    'warehouse-template.delete.all',
  )
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Xóa template kho hàng',
    description:
      'Xóa mềm một template kho hàng. Yêu cầu quyền `warehouse-template.delete`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của template kho hàng (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa template thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'warehouse-template.delete_success' },
        message: {
          type: 'string',
          example: 'Xóa template kho hàng thành công',
        },
        success: { type: 'boolean', example: true },
        data: { type: 'null' },
      },
    },
  })
  @ApiAuthResponses()
  @ApiResponse({ status: 404, description: 'Không tìm thấy template kho hàng' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.service.delete(id, userId, lang);
    return new DeletedResponse(
      ResponseCode.WAREHOUSE_TEMPLATE_DELETE_SUCCESS,
      null,
    );
  }

  @Put(':id/layout')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('warehouse-template.design')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cập nhật layout (rows, racks, shelves, blocks)',
    description:
      'Cập nhật toàn bộ layout của template kho hàng bao gồm dãy, kệ, tầng và ô. Hỗ trợ tạo mới, cập nhật và xóa các phần tử. Yêu cầu quyền `warehouse-template.design`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của template kho hàng (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpsertLayoutDto,
    description: 'Dữ liệu layout cần cập nhật với cấu trúc nested',
    examples: {
      simple_layout: {
        summary: 'Layout đơn giản',
        description: 'Tạo layout với 1 dãy, 1 kệ, 1 tầng, 2 ô',
        value: {
          rows: [
            {
              name: 'Dãy A',
              code: 'ROW-A',
              description: 'Dãy đầu tiên',
              position_x: 0,
              position_y: 0,
              racks: [
                {
                  name: 'Kệ 1',
                  code: 'RCK-A1',
                  position_x: 0,
                  position_y: 0,
                  dimensions_width: 2,
                  dimensions_height: 3,
                  shelves: [
                    {
                      name: 'Tầng 1',
                      code: 'SHF-A1-1',
                      height: 0.5,
                      blocks: [
                        {
                          name: 'Ô A1-1-1',
                          code: 'BLK-A1-1-1',
                          position_x: 0,
                          position_y: 0,
                        },
                        {
                          name: 'Ô A1-1-2',
                          code: 'BLK-A1-1-2',
                          position_x: 1,
                          position_y: 0,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      update_layout: {
        summary: 'Cập nhật layout',
        description:
          'Cập nhật layout hiện có (các phần tử có id sẽ được update)',
        value: {
          rows: [
            {
              id: 'uuid-row-1',
              name: 'Dãy A (Updated)',
              code: 'ROW-A',
              racks: [
                {
                  id: 'uuid-rack-1',
                  name: 'Kệ 1 (Updated)',
                  code: 'RCK-A1',
                  shelves: [],
                },
              ],
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật layout thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse-template.layout_update_success',
        },
        message: {
          type: 'string',
          example: 'Cập nhật layout template thành công',
        },
        success: { type: 'boolean', example: true },
        data: { type: 'object' },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiResponse({ status: 404, description: 'Không tìm thấy template kho hàng' })
  async upsertLayout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertLayoutDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IWarehouseTemplateWithRelations>> {
    const result = await this.service.upsertLayout(id, dto, userId, lang);
    return new UpdatedResponse(
      ResponseCode.WAREHOUSE_TEMPLATE_LAYOUT_UPDATE_SUCCESS,
      result,
    );
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('warehouse-template.update')
  @ApiBearerAuth('JWT-auth')
  @UseFilters(WarehouseTemplateImagesUploadExceptionFilter)
  @UseInterceptors(
    FilesInterceptor('images', MAX_FILES, {
      limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              req.i18n?.t('warehouse-template.errors.file_type_invalid', {
                args: { allowedTypes: ALLOWED_MIME_TYPES.join(', ') },
              }) ||
                `Only image files are accepted: ${ALLOWED_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload ảnh cho template kho hàng',
    description: `Upload nhiều ảnh cho template kho hàng. Cấu hình upload có thể được điều chỉnh qua environment variables:
        - UPLOAD_WAREHOUSE_MAX_FILES: Số lượng file tối đa (mặc định: 50)
        - UPLOAD_WAREHOUSE_MAX_SIZE: Kích thước tối đa mỗi file (mặc định: 5MB)
        - UPLOAD_WAREHOUSE_ALLOWED_TYPES: Các loại file được phép (mặc định: image/jpeg,image/png,image/webp,image/gif)
        
        Yêu cầu quyền \`warehouse-template.update\`.`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'ID của template kho hàng (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    description: 'Danh sách ảnh cần upload',
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'File ảnh (jpeg, png, webp, gif)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Upload ảnh thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse-template.image_upload_success',
        },
        message: { type: 'string', example: 'Upload ảnh thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              url: {
                type: 'string',
                example: 'https://cdn.example.com/warehouses/abc123.jpg',
              },
              order: { type: 'number', example: 1 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'File không hợp lệ hoặc vượt quá giới hạn',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse-template.file_type_invalid',
        },
        message: {
          type: 'string',
          example:
            'Chỉ chấp nhận file ảnh: image/jpeg, image/png, image/webp, image/gif',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiResponse({ status: 404, description: 'Không tìm thấy template kho hàng' })
  async uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        this.i18n.t('warehouse-template.errors.images_required', { lang }),
      );
    }

    const result = await this.service.uploadImages(id, files, userId, lang);
    return new CreatedResponse(
      ResponseCode.WAREHOUSE_TEMPLATE_IMAGE_UPLOAD_SUCCESS,
      result,
    );
  }

  /**
   * Lấy danh sách ảnh - không cần xác thực
   */
  @Get(':id/images')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Lấy danh sách ảnh của template',
    description:
      'Lấy danh sách tất cả ảnh của một template kho hàng, sắp xếp theo thứ tự.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của template kho hàng (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách ảnh thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse-template.image_list_success',
        },
        message: { type: 'string', example: 'Lấy danh sách ảnh thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              url: {
                type: 'string',
                example: 'https://cdn.example.com/warehouses/abc123.jpg',
              },
              order: { type: 'number', example: 1 },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy template kho hàng' })
  async getImages(
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.getImages(id, lang);
    return new GetResponse(
      ResponseCode.WAREHOUSE_TEMPLATE_IMAGE_LIST_SUCCESS,
      result,
    );
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('warehouse-template.update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Xóa ảnh của template',
    description:
      'Xóa một ảnh khỏi template kho hàng. Yêu cầu quyền `warehouse-template.update`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của template kho hàng (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'imageId',
    description: 'ID của ảnh (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa ảnh thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse-template.image_delete_success',
        },
        message: { type: 'string', example: 'Xóa ảnh thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null' },
      },
    },
  })
  @ApiAuthResponses()
  @ApiResponse({ status: 404, description: 'Không tìm thấy template kho hàng' })
  async deleteImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.deleteImage(id, imageId, userId, lang);
    return new DeletedResponse(
      ResponseCode.WAREHOUSE_TEMPLATE_IMAGE_DELETE_SUCCESS,
      null,
    );
  }

  @Delete(':id/images/delete/many')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('warehouse-template.update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Xóa nhiều ảnh của template',
    description:
      'Xóa nhiều ảnh khỏi template kho hàng cùng lúc. Yêu cầu quyền `warehouse-template.update`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của template kho hàng (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID các ảnh cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa 3 ảnh',
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
    description: 'Xóa nhiều ảnh thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse-template.image_delete_success',
        },
        message: { type: 'string', example: 'Xóa ảnh thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null' },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiResponse({ status: 404, description: 'Không tìm thấy template kho hàng' })
  async deleteManyImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.service.deleteManyImages(id, dto.ids, userId, lang);
    return new DeletedResponse(
      ResponseCode.WAREHOUSE_TEMPLATE_IMAGE_DELETE_SUCCESS,
      null,
    );
  }

  @Put(':id/images/reorder')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('warehouse-template.update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Sắp xếp lại thứ tự ảnh',
    description:
      'Thay đổi thứ tự hiển thị của các ảnh trong template kho hàng. Yêu cầu quyền `warehouse-template.update`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của template kho hàng (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    description: 'Danh sách thứ tự mới của ảnh',
    examples: {
      reorder: {
        summary: 'Sắp xếp 3 ảnh',
        value: {
          images: [
            { id: '550e8400-e29b-41d4-a716-446655440001', order: 1 },
            { id: '550e8400-e29b-41d4-a716-446655440002', order: 2 },
            { id: '550e8400-e29b-41d4-a716-446655440003', order: 3 },
          ],
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid', description: 'ID của ảnh' },
              order: { type: 'number', description: 'Thứ tự mới', minimum: 1 },
            },
            required: ['id', 'order'],
          },
        },
      },
      required: ['images'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sắp xếp ảnh thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'warehouse-template.image_reorder_success',
        },
        message: { type: 'string', example: 'Sắp xếp ảnh thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null' },
      },
    },
  })
  @ApiAuthResponses()
  @ApiResponse({ status: 404, description: 'Không tìm thấy template kho hàng' })
  async reorderImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { images: { id: string; order: number }[] },
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.reorderImages(id, body.images, userId, lang);
    return new UpdatedResponse(
      ResponseCode.WAREHOUSE_TEMPLATE_IMAGE_REORDER_SUCCESS,
      null,
    );
  }
}
