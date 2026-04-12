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

import { InsuranceService } from './insurance.service';
import {
  CreateInsuranceDto,
  UpdateInsuranceDto,
  QueryInsuranceDto,
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
import { IInsurance, IPaginatedResponse } from './interfaces';

/**
 * Controller cho Insurance - Bảo hiểm
 */
@ApiTags('Insurances')
@Controller('insurances')
export class InsuranceController {
  constructor(
    private readonly insuranceService: InsuranceService,
    private readonly i18n: I18nService,
    private readonly prisma: PrismaService,
  ) {}

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
    summary: 'Tạo bảo hiểm mới',
    description:
      'Tạo một gói bảo hiểm mới cho hệ thống. Yêu cầu quyền `insurance.create`.',
  })
  @ApiBody({
    type: CreateInsuranceDto,
    description: 'Dữ liệu tạo bảo hiểm mới',
    examples: {
      basic_insurance: {
        summary: 'Bảo hiểm cơ bản',
        description: 'Tạo một gói bảo hiểm cơ bản với giá cố định',
        value: {
          name: 'Bảo hiểm hàng hóa cơ bản',
          description: 'Bảo hiểm giá trị hàng hóa trong kho',
          price: 500000,
          is_active: true,
        },
      },
      insurance_with_management_fee_percent: {
        summary: 'Bảo hiểm với phí quản lý theo %',
        description: 'Tạo bảo hiểm có phí quản lý tính theo phần trăm',
        value: {
          name: 'Bảo hiểm cao cấp',
          description: 'Bảo hiểm toàn diện cho hàng hóa giá trị cao',
          price: 1000000,
          use_management_fee: true,
          management_fee_type: 'PERCENT',
          management_fee_value: 10,
          is_active: true,
        },
      },
      insurance_with_management_fee_amount: {
        summary: 'Bảo hiểm với phí quản lý cố định',
        description: 'Tạo bảo hiểm có phí quản lý là số tiền cố định',
        value: {
          name: 'Bảo hiểm tiêu chuẩn',
          description: 'Gói bảo hiểm tiêu chuẩn cho kho hàng',
          price: 750000,
          use_management_fee: true,
          management_fee_type: 'AMOUNT',
          management_fee_value: 50000,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo bảo hiểm thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.create.success' },
        message: { type: 'string', example: 'Tạo bảo hiểm thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', example: 'Bảo hiểm hàng hóa cơ bản' },
            description: {
              type: 'string',
              example: 'Bảo hiểm giá trị hàng hóa trong kho',
            },
            price: { type: 'number', example: 500000 },
            use_management_fee: { type: 'boolean', example: false },
            management_fee_type: {
              type: 'string',
              nullable: true,
              example: null,
            },
            management_fee_value: {
              type: 'number',
              nullable: true,
              example: null,
            },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-22T10:00:00.000Z',
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
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên bảo hiểm đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.errors.name_exists' },
        message: { type: 'string', example: 'Tên bảo hiểm đã tồn tại' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('insurance.create')
  @Post()
  async create(
    @Body() dto: CreateInsuranceDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IInsurance>> {
    const result = await this.insuranceService.create(dto, userId, lang);
    return new CreatedResponse(
      'insurance.create.success',
      result,
      this.i18n.t('insurance.success.created', { lang }),
    );
  }

  @ApiOperation({
    summary: 'Lấy danh sách bảo hiểm',
    description:
      'Lấy danh sách tất cả bảo hiểm với phân trang và bộ lọc. Yêu cầu quyền `insurance.list` hoặc `insurance.list.all`. Với quyền `insurance.list`: chỉ lấy các bảo hiểm do chính user tạo. Với quyền `insurance.list.all`: lấy tất cả bảo hiểm của mọi người.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi mỗi trang',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm theo tên hoặc mô tả',
    example: 'cao cấp',
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
    description: 'Lấy danh sách bảo hiểm thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.list.success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách bảo hiểm thành công',
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
                  name: { type: 'string', example: 'Bảo hiểm hàng hóa cơ bản' },
                  description: {
                    type: 'string',
                    example: 'Bảo hiểm giá trị hàng hóa trong kho',
                  },
                  price: { type: 'number', example: 500000 },
                  use_management_fee: { type: 'boolean', example: false },
                  management_fee_type: {
                    type: 'string',
                    nullable: true,
                    example: null,
                  },
                  management_fee_value: {
                    type: 'number',
                    nullable: true,
                    example: null,
                  },
                  is_active: { type: 'boolean', example: true },
                  created_at: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-01-22T10:00:00.000Z',
                  },
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
  @RequireAnyPermission('insurance.list', 'insurance.list.all')
  @Get()
  async findAll(
    @Query() query: QueryInsuranceDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IPaginatedResponse<IInsurance>>> {
    const hasListAllPermission = await this.hasPermission(
      userId,
      'insurance.list.all',
    );
    const result = await this.insuranceService.findAll(
      query,
      userId,
      hasListAllPermission,
    );
    return new GetResponse(
      'insurance.list.success',
      result,
      this.i18n.t('insurance.success.list', { lang }),
    );
  }

  @ApiOperation({
    summary: 'Lấy danh sách bảo hiểm đang hoạt động',
    description:
      'Lấy danh sách tất cả bảo hiểm có trạng thái is_active = true và is_deleted = false với phân trang. API này không yêu cầu xác thực và có thể được sử dụng công khai.',
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
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bảo hiểm active thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.list.success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách bảo hiểm active thành công',
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
                  name: { type: 'string', example: 'Bảo hiểm hàng hóa cơ bản' },
                  description: {
                    type: 'string',
                    example: 'Bảo hiểm giá trị hàng hóa trong kho',
                  },
                  price: { type: 'number', example: 500000 },
                  use_management_fee: { type: 'boolean', example: false },
                  management_fee_type: {
                    type: 'string',
                    nullable: true,
                    example: null,
                  },
                  management_fee_value: {
                    type: 'number',
                    nullable: true,
                    example: null,
                  },
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
    @Query() query: QueryInsuranceDto,
  ): Promise<GetResponse<IPaginatedResponse<IInsurance>>> {
    const result = await this.insuranceService.findAllActive(query);
    return new GetResponse('insurance.list.success', result);
  }

  @ApiOperation({
    summary: 'Lấy chi tiết bảo hiểm',
    description:
      'Lấy thông tin chi tiết của một bảo hiểm theo ID. Yêu cầu quyền `insurance.read` hoặc `insurance.read.all`. Với quyền `insurance.read`: chỉ lấy được bảo hiểm do chính user tạo. Với quyền `insurance.read.all`: lấy được bảo hiểm của bất kỳ ai.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bảo hiểm (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết bảo hiểm thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.read.success' },
        message: {
          type: 'string',
          example: 'Lấy chi tiết bảo hiểm thành công',
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
            name: { type: 'string', example: 'Bảo hiểm hàng hóa cơ bản' },
            description: {
              type: 'string',
              example: 'Bảo hiểm giá trị hàng hóa trong kho',
            },
            price: { type: 'number', example: 500000 },
            use_management_fee: { type: 'boolean', example: false },
            management_fee_type: {
              type: 'string',
              nullable: true,
              example: null,
            },
            management_fee_value: {
              type: 'number',
              nullable: true,
              example: null,
            },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-22T10:00:00.000Z',
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
              example: '550e8400-e29b-41d4-a716-446655440001',
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
    description: 'Không tìm thấy bảo hiểm',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy bảo hiểm' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('insurance.read', 'insurance.read.all')
  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IInsurance>> {
    const hasReadAllPermission = await this.hasPermission(
      userId,
      'insurance.read.all',
    );
    const result = await this.insuranceService.findById(
      id,
      userId,
      hasReadAllPermission,
      lang,
    );
    return new GetResponse(
      'insurance.read.success',
      result,
      this.i18n.t('insurance.success.fetched', { lang }),
    );
  }

  @ApiOperation({
    summary: 'Cập nhật bảo hiểm',
    description:
      'Cập nhật thông tin của một bảo hiểm. Chỉ các trường được gửi trong request body mới được cập nhật. Yêu cầu quyền `insurance.update` hoặc `insurance.update.all`. Với quyền `insurance.update`: chỉ cập nhật được bảo hiểm do chính user tạo. Với quyền `insurance.update.all`: cập nhật được bảo hiểm của bất kỳ ai.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bảo hiểm (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateInsuranceDto,
    description: 'Dữ liệu cập nhật bảo hiểm (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_price: {
        summary: 'Cập nhật giá',
        description: 'Cập nhật giá bảo hiểm',
        value: {
          price: 600000,
        },
      },
      update_name_and_description: {
        summary: 'Cập nhật tên và mô tả',
        description: 'Cập nhật tên và mô tả bảo hiểm',
        value: {
          name: 'Bảo hiểm hàng hóa cao cấp',
          description: 'Gói bảo hiểm cao cấp dành cho hàng hóa giá trị cao',
        },
      },
      update_management_fee: {
        summary: 'Cập nhật phí quản lý',
        description: 'Bật và cập nhật phí quản lý',
        value: {
          use_management_fee: true,
          management_fee_type: 'PERCENT',
          management_fee_value: 15,
        },
      },
      toggle_status: {
        summary: 'Bật/tắt trạng thái',
        description: 'Thay đổi trạng thái hoạt động của bảo hiểm',
        value: {
          is_active: false,
        },
      },
      update_full: {
        summary: 'Cập nhật toàn bộ',
        description: 'Cập nhật tất cả các trường',
        value: {
          name: 'Bảo hiểm toàn diện',
          description: 'Gói bảo hiểm toàn diện cho mọi loại hàng hóa',
          price: 1500000,
          use_management_fee: true,
          management_fee_type: 'AMOUNT',
          management_fee_value: 100000,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật bảo hiểm thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.update.success' },
        message: { type: 'string', example: 'Cập nhật bảo hiểm thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', example: 'Bảo hiểm hàng hóa cao cấp' },
            description: {
              type: 'string',
              example: 'Gói bảo hiểm cao cấp dành cho hàng hóa giá trị cao',
            },
            price: { type: 'number', example: 600000 },
            use_management_fee: { type: 'boolean', example: false },
            management_fee_type: {
              type: 'string',
              nullable: true,
              example: null,
            },
            management_fee_value: {
              type: 'number',
              nullable: true,
              example: null,
            },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-22T10:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-22T12:00:00.000Z',
            },
            updated_by: {
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
    status: 404,
    description: 'Không tìm thấy bảo hiểm',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy bảo hiểm' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên bảo hiểm đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.errors.name_exists' },
        message: { type: 'string', example: 'Tên bảo hiểm đã tồn tại' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('insurance.update', 'insurance.update.all')
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInsuranceDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IInsurance>> {
    const hasUpdateAllPermission = await this.hasPermission(
      userId,
      'insurance.update.all',
    );
    const result = await this.insuranceService.update(
      id,
      dto,
      userId,
      hasUpdateAllPermission,
      lang,
    );
    return new UpdatedResponse(
      'insurance.update.success',
      result,
      this.i18n.t('insurance.success.updated', { lang }),
    );
  }

  @ApiOperation({
    summary: 'Xóa nhiều bảo hiểm',
    description:
      'Xóa mềm nhiều bảo hiểm cùng lúc. Các bản ghi không bị xóa vĩnh viễn mà chỉ được đánh dấu là đã xóa. Yêu cầu quyền `insurance.delete` hoặc `insurance.delete.all`. Với quyền `insurance.delete`: chỉ xóa được bảo hiểm do chính user tạo. Với quyền `insurance.delete.all`: xóa được bảo hiểm của bất kỳ ai.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID các bảo hiểm cần xóa',
    examples: {
      delete_two: {
        summary: 'Xóa 2 bảo hiểm',
        description: 'Xóa 2 bảo hiểm theo ID',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440000',
            '550e8400-e29b-41d4-a716-446655440001',
          ],
        },
      },
      delete_multiple: {
        summary: 'Xóa nhiều bảo hiểm',
        description: 'Xóa nhiều bảo hiểm theo danh sách ID',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440000',
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều bảo hiểm thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.delete.success' },
        message: { type: 'string', example: 'Xóa nhiều bảo hiểm thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy bảo hiểm',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy bảo hiểm' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('insurance.delete', 'insurance.delete.all')
  @Delete('delete/many')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAllPermission = await this.hasPermission(
      userId,
      'insurance.delete.all',
    );
    await this.insuranceService.deleteMany(
      dto.ids,
      userId,
      hasDeleteAllPermission,
      lang,
    );
    return new DeletedResponse(
      'insurance.delete.success',
      null,
      this.i18n.t('insurance.success.deleted_many', { lang }),
    );
  }

  @ApiOperation({
    summary: 'Xóa bảo hiểm',
    description:
      'Xóa mềm một bảo hiểm. Bản ghi không bị xóa vĩnh viễn mà chỉ được đánh dấu là đã xóa. Yêu cầu quyền `insurance.delete` hoặc `insurance.delete.all`. Với quyền `insurance.delete`: chỉ xóa được bảo hiểm do chính user tạo. Với quyền `insurance.delete.all`: xóa được bảo hiểm của bất kỳ ai.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bảo hiểm (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa bảo hiểm thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.delete.success' },
        message: { type: 'string', example: 'Xóa bảo hiểm thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy bảo hiểm',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'insurance.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy bảo hiểm' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('insurance.delete', 'insurance.delete.all')
  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAllPermission = await this.hasPermission(
      userId,
      'insurance.delete.all',
    );
    await this.insuranceService.delete(
      id,
      userId,
      hasDeleteAllPermission,
      lang,
    );
    return new DeletedResponse(
      'insurance.delete.success',
      null,
      this.i18n.t('insurance.success.deleted', { lang }),
    );
  }
}
