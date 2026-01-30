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

import { CouponScheduleService } from './coupon-schedule.service';
import {
  CreateCouponScheduleDto,
  UpdateCouponScheduleDto,
  QueryCouponScheduleDto,
} from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, RequireAnyPermission, CurrentUser } from '../../common/decorators';
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
import { PrismaService } from '../../prisma/prisma.service';
import { ICouponSchedule, IPaginatedResponse } from './interfaces';

@ApiTags('Coupon Schedules')
@Controller('coupon-schedules')
export class CouponScheduleController {
  constructor(
    private readonly couponScheduleService: CouponScheduleService,
    private readonly prisma: PrismaService,
  ) { }

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
    summary: 'Tạo lịch coupon mới',
    description:
      'Tạo mới một lịch tự động tạo coupon theo chu kỳ. Hỗ trợ các chu kỳ: YEARLY (hàng năm), QUARTERLY (hàng quý), MONTHLY (hàng tháng), WEEKLY (hàng tuần), DAILY (hàng ngày). Yêu cầu quyền `coupon-schedule.create`.',
  })
  @ApiBody({
    type: CreateCouponScheduleDto,
    description: 'Dữ liệu lịch coupon cần tạo',
    examples: {
      create_basic: {
        summary: 'Tạo lịch cơ bản - Giảm giá hàng tháng',
        description: 'Tạo lịch coupon chạy vào ngày 1 hàng tháng, giảm 20%',
        value: {
          name: 'Khuyến mãi đầu tháng',
          description: 'Coupon giảm giá 20% vào đầu mỗi tháng',
          period: 'MONTHLY',
          scheduled_day: 1,
          discount_type: 'PERCENT',
          discount_value: 20,
          is_random_code: true,
          is_permanent_coupon: false,
          coupon_duration_value: 7,
          coupon_duration_unit: 'DAY',
          max_usage: 100,
          is_active: true,
        },
      },
      create_yearly: {
        summary: 'Tạo lịch hàng năm - Khuyến mãi Tết',
        description: 'Tạo lịch coupon chạy vào ngày 1/1 hàng năm',
        value: {
          name: 'Khuyến mãi Tết Nguyên Đán',
          description: 'Coupon giảm 500,000đ cho năm mới',
          period: 'YEARLY',
          scheduled_day: 1,
          scheduled_month: 1,
          discount_type: 'AMOUNT',
          discount_value: 500000,
          is_random_code: false,
          is_fixed_code: true,
          fixed_code_value: 'TET',
          use_suffix: true,
          is_permanent_coupon: false,
          coupon_duration_value: 1,
          coupon_duration_unit: 'MONTH',
          max_usage: 1000,
          is_active: true,
        },
      },
      create_with_conditions: {
        summary: 'Tạo lịch với điều kiện áp dụng',
        description: 'Tạo lịch coupon với các điều kiện tối thiểu',
        value: {
          name: 'Khuyến mãi VIP',
          description: 'Coupon dành cho đơn hàng lớn',
          period: 'WEEKLY',
          scheduled_weekday: 1,
          discount_type: 'PERCENT',
          discount_value: 15,
          is_random_code: true,
          is_permanent_coupon: false,
          coupon_duration_value: 3,
          coupon_duration_unit: 'DAY',
          require_min_order_amount: true,
          min_order_amount: 5000000,
          require_min_rental_duration: true,
          min_rental_duration_value: 6,
          min_rental_duration_unit: 'MONTH',
          is_unlimited_discount: false,
          max_discount_amount: 1000000,
          max_usage: 50,
          is_active: true,
        },
      },
      create_private: {
        summary: 'Tạo lịch coupon riêng tư',
        description:
          'Tạo lịch coupon PRIVATE chỉ áp dụng cho danh sách user cụ thể',
        value: {
          name: 'Khuyến mãi thành viên thân thiết',
          description: 'Coupon dành riêng cho khách hàng VIP',
          period: 'MONTHLY',
          scheduled_day: 15,
          coupon_type: 'PRIVATE',
          discount_type: 'PERCENT',
          discount_value: 30,
          is_random_code: true,
          is_permanent_coupon: false,
          coupon_duration_value: 14,
          coupon_duration_unit: 'DAY',
          max_usage: 1,
          target_user_ids: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
          ],
          is_active: true,
        },
      },
      create_with_gifts: {
        summary: 'Tạo lịch với quà tặng kèm',
        description: 'Tạo lịch coupon có tặng kèm addon và bảo hiểm',
        value: {
          name: 'Combo khuyến mãi đặc biệt',
          description: 'Giảm giá + tặng addon và bảo hiểm',
          period: 'QUARTERLY',
          scheduled_day: 1,
          scheduled_month: 1,
          discount_type: 'PERCENT',
          discount_value: 10,
          is_random_code: true,
          is_permanent_coupon: false,
          coupon_duration_value: 1,
          coupon_duration_unit: 'MONTH',
          has_gift_addons: true,
          gift_addon_ids: ['550e8400-e29b-41d4-a716-446655440010'],
          has_gift_insurances: true,
          gift_insurance_ids: ['550e8400-e29b-41d4-a716-446655440020'],
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo lịch coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon-schedule.create.success' },
        message: { type: 'string', example: 'Tạo lịch coupon thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          description: 'Thông tin lịch coupon sau khi tạo',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID của lịch coupon',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: {
              type: 'string',
              description: 'Tên lịch coupon',
              example: 'Khuyến mãi đầu tháng',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Mô tả lịch coupon',
              example: 'Coupon giảm giá 20% vào đầu mỗi tháng',
            },
            period: {
              type: 'string',
              enum: ['YEARLY', 'QUARTERLY', 'MONTHLY', 'WEEKLY', 'DAILY'],
              description: 'Chu kỳ chạy lịch',
              example: 'MONTHLY',
            },
            scheduled_day: {
              type: 'number',
              nullable: true,
              description: 'Ngày trong tháng (1-31)',
              example: 1,
            },
            scheduled_month: {
              type: 'number',
              nullable: true,
              description: 'Tháng trong năm (1-12)',
              example: null,
            },
            scheduled_weekday: {
              type: 'number',
              nullable: true,
              description: 'Thứ trong tuần (0-6, 0=CN)',
              example: null,
            },
            scheduled_hour: {
              type: 'number',
              nullable: true,
              description: 'Giờ (0-23)',
              example: null,
            },
            scheduled_minute: {
              type: 'number',
              nullable: true,
              description: 'Phút (0-59)',
              example: null,
            },
            is_random_code: {
              type: 'boolean',
              description: 'Sử dụng mã ngẫu nhiên',
              example: true,
            },
            is_fixed_code: {
              type: 'boolean',
              description: 'Sử dụng mã cố định',
              example: false,
            },
            fixed_code_value: {
              type: 'string',
              nullable: true,
              description: 'Giá trị mã cố định',
              example: null,
            },
            use_suffix: {
              type: 'boolean',
              description: 'Sử dụng hậu tố cho mã',
              example: false,
            },
            use_prefix: {
              type: 'boolean',
              description: 'Sử dụng tiền tố cho mã',
              example: false,
            },
            is_permanent_coupon: {
              type: 'boolean',
              description: 'Coupon được tạo là vĩnh viễn',
              example: false,
            },
            coupon_duration_value: {
              type: 'number',
              nullable: true,
              description: 'Giá trị thời gian hiệu lực coupon',
              example: 7,
            },
            coupon_duration_unit: {
              type: 'string',
              nullable: true,
              enum: ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'],
              description: 'Đơn vị thời gian hiệu lực coupon',
              example: 'DAY',
            },
            discount_type: {
              type: 'string',
              enum: ['PERCENT', 'AMOUNT', 'FREE_MONTHS'],
              description: 'Loại giảm giá',
              example: 'PERCENT',
            },
            discount_value: {
              type: 'number',
              description: 'Giá trị giảm giá',
              example: 20,
            },
            require_min_warehouses: {
              type: 'boolean',
              description: 'Yêu cầu số kho tối thiểu',
              example: false,
            },
            min_warehouses: {
              type: 'number',
              nullable: true,
              description: 'Số kho tối thiểu',
              example: null,
            },
            require_min_rows: {
              type: 'boolean',
              description: 'Yêu cầu số row tối thiểu',
              example: false,
            },
            min_rows: {
              type: 'number',
              nullable: true,
              description: 'Số row tối thiểu',
              example: null,
            },
            require_min_order_amount: {
              type: 'boolean',
              description: 'Yêu cầu đơn hàng tối thiểu',
              example: false,
            },
            min_order_amount: {
              type: 'number',
              nullable: true,
              description: 'Giá trị đơn hàng tối thiểu',
              example: null,
            },
            require_min_rental_duration: {
              type: 'boolean',
              description: 'Yêu cầu thời gian thuê tối thiểu',
              example: false,
            },
            min_rental_duration_value: {
              type: 'number',
              nullable: true,
              description: 'Giá trị thời gian thuê tối thiểu',
              example: null,
            },
            min_rental_duration_unit: {
              type: 'string',
              nullable: true,
              enum: ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'],
              description: 'Đơn vị thời gian thuê tối thiểu',
              example: null,
            },
            is_unlimited_discount: {
              type: 'boolean',
              description: 'Không giới hạn giảm giá',
              example: false,
            },
            max_discount_amount: {
              type: 'number',
              nullable: true,
              description: 'Giá trị giảm tối đa',
              example: null,
            },
            max_usage: {
              type: 'number',
              description: 'Số lượng sử dụng tối đa cho mỗi coupon được tạo',
              example: 100,
            },
            is_public: {
              type: 'boolean',
              description: 'Coupon công khai',
              example: true,
            },
            apply_for_first_rental: {
              type: 'boolean',
              description: 'Áp dụng cho thuê lần đầu',
              example: true,
            },
            apply_for_renewal: {
              type: 'boolean',
              description: 'Áp dụng cho gia hạn',
              example: true,
            },
            is_unlimited_stack: {
              type: 'boolean',
              description: 'Có thể áp dụng chung với vô hạn coupon khác',
              example: false,
            },
            max_stack_count: {
              type: 'number',
              nullable: true,
              description: 'Số coupon tối đa có thể áp dụng chung',
              example: 1,
            },
            has_gift_addons: {
              type: 'boolean',
              description: 'Có tặng kèm addon',
              example: false,
            },
            has_gift_insurances: {
              type: 'boolean',
              description: 'Có tặng kèm bảo hiểm',
              example: false,
            },
            last_run_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Thời gian chạy lần cuối',
              example: null,
            },
            next_run_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Thời gian chạy lần tiếp theo',
              example: '2026-02-01T00:00:00.000Z',
            },
            is_active: {
              type: 'boolean',
              description: 'Trạng thái hoạt động',
              example: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian tạo',
              example: '2026-01-22T13:00:00.000Z',
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'ID user tạo',
              example: '550e8400-e29b-41d4-a716-446655440099',
            },
          },
        },
      },
      example: {
        code: 'coupon-schedule.create.success',
        message: 'Tạo lịch coupon thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Khuyến mãi đầu tháng',
          description: 'Coupon giảm giá 20% vào đầu mỗi tháng',
          period: 'MONTHLY',
          scheduled_day: 1,
          scheduled_month: null,
          scheduled_weekday: null,
          scheduled_hour: null,
          scheduled_minute: null,
          is_random_code: true,
          is_fixed_code: false,
          fixed_code_value: null,
          use_suffix: false,
          use_prefix: false,
          is_permanent_coupon: false,
          coupon_duration_value: 7,
          coupon_duration_unit: 'DAY',
          discount_type: 'PERCENT',
          discount_value: 20,
          require_min_warehouses: false,
          min_warehouses: null,
          require_min_rows: false,
          min_rows: null,
          require_min_order_amount: false,
          min_order_amount: null,
          require_min_rental_duration: false,
          min_rental_duration_value: null,
          min_rental_duration_unit: null,
          is_unlimited_discount: false,
          max_discount_amount: null,
          max_usage: 100,
          is_public: true,
          apply_for_first_rental: true,
          apply_for_renewal: true,
          is_unlimited_stack: false,
          max_stack_count: 1,
          has_gift_addons: false,
          has_gift_insurances: false,
          last_run_at: null,
          next_run_at: '2026-02-01T00:00:00.000Z',
          is_active: true,
          created_at: '2026-01-22T13:00:00.000Z',
          created_by: '550e8400-e29b-41d4-a716-446655440099',
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('coupon-schedule.create')
  @Post()
  async create(
    @Body() dto: CreateCouponScheduleDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<ICouponSchedule>> {
    const result = await this.couponScheduleService.create(dto, userId, lang);
    return new CreatedResponse(
      'coupon-schedule.create.success',
      result,
      'Tạo lịch coupon thành công',
    );
  }

  @ApiOperation({
    summary: 'Lấy danh sách lịch coupon',
    description:
      'Lấy danh sách các lịch coupon với phân trang và lọc theo trạng thái hoạt động. Hỗ trợ tìm kiếm theo tên. Yêu cầu quyền `coupon-schedule.list`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi trên mỗi trang (1-100)',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu lấy dữ liệu',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm theo tên lịch coupon',
    example: 'khuyến mãi',
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
    description: 'Lấy danh sách lịch coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon-schedule.list.success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách lịch coupon thành công',
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
                  period: {
                    type: 'string',
                    enum: ['YEARLY', 'QUARTERLY', 'MONTHLY', 'WEEKLY', 'DAILY'],
                  },
                  discount_type: {
                    type: 'string',
                    enum: ['PERCENT', 'AMOUNT', 'FREE_MONTHS'],
                  },
                  discount_value: { type: 'number' },
                  is_active: { type: 'boolean' },
                  last_run_at: { type: 'string', format: 'date-time' },
                  next_run_at: { type: 'string', format: 'date-time' },
                  created_at: { type: 'string', format: 'date-time' },
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
      example: {
        code: 'coupon-schedule.list.success',
        message: 'Lấy danh sách lịch coupon thành công',
        success: true,
        data: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              name: 'Khuyến mãi đầu tháng',
              description: 'Coupon giảm giá 20% vào đầu mỗi tháng',
              period: 'MONTHLY',
              discount_type: 'PERCENT',
              discount_value: 20,
              is_active: true,
              last_run_at: '2026-01-01T00:00:00.000Z',
              next_run_at: '2026-02-01T00:00:00.000Z',
              created_at: '2025-12-15T10:30:00.000Z',
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440002',
              name: 'Khuyến mãi Tết',
              description: 'Coupon giảm 500,000đ cho năm mới',
              period: 'YEARLY',
              discount_type: 'AMOUNT',
              discount_value: 500000,
              is_active: true,
              last_run_at: '2026-01-01T00:00:00.000Z',
              next_run_at: '2027-01-01T00:00:00.000Z',
              created_at: '2025-11-20T08:00:00.000Z',
            },
          ],
          total: 50,
          limit: 10,
          offset: 0,
          hasMore: true,
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('coupon-schedule.list', 'coupon-schedule.list.all')
  @Get()
  async findAll(
    @Query() query: QueryCouponScheduleDto,
    @CurrentUser('userId') userId: string,
  ): Promise<GetResponse<IPaginatedResponse<ICouponSchedule>>> {
    const hasListAll = await this.hasPermission(
      userId,
      'coupon-schedule.list.all',
    );
    const result = await this.couponScheduleService.findAll(
      query,
      userId,
      hasListAll,
    );
    return new GetResponse(
      'coupon-schedule.list.success',
      result,
      'Lấy danh sách lịch coupon thành công',
    );
  }

  @ApiOperation({
    summary: 'Lấy chi tiết lịch coupon',
    description:
      'Lấy thông tin chi tiết của một lịch coupon theo ID, bao gồm tất cả cấu hình và điều kiện áp dụng. Yêu cầu quyền `coupon-schedule.read`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của lịch coupon (UUID v4)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết lịch coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon-schedule.read.success' },
        message: {
          type: 'string',
          example: 'Lấy chi tiết lịch coupon thành công',
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
            name: { type: 'string', example: 'Khuyến mãi đầu tháng' },
            description: {
              type: 'string',
              example: 'Coupon giảm giá 20% vào đầu mỗi tháng',
            },
            period: {
              type: 'string',
              enum: ['YEARLY', 'QUARTERLY', 'MONTHLY', 'WEEKLY', 'DAILY'],
              example: 'MONTHLY',
            },
            scheduled_day: {
              type: 'number',
              example: 1,
              description: 'Ngày trong tháng (1-31)',
            },
            scheduled_month: {
              type: 'number',
              example: null,
              description: 'Tháng trong năm (1-12)',
            },
            scheduled_weekday: {
              type: 'number',
              example: null,
              description: 'Thứ trong tuần (0-6, 0=CN)',
            },
            scheduled_hour: {
              type: 'number',
              example: null,
              description: 'Giờ (0-23)',
            },
            scheduled_minute: {
              type: 'number',
              example: null,
              description: 'Phút (0-59)',
            },
            is_random_code: { type: 'boolean', example: true },
            is_fixed_code: { type: 'boolean', example: false },
            fixed_code_value: { type: 'string', example: null },
            use_suffix: { type: 'boolean', example: false },
            use_prefix: { type: 'boolean', example: false },
            is_permanent_coupon: { type: 'boolean', example: false },
            coupon_duration_value: { type: 'number', example: 7 },
            coupon_duration_unit: {
              type: 'string',
              enum: ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'],
              example: 'DAY',
            },
            discount_type: {
              type: 'string',
              enum: ['PERCENT', 'AMOUNT', 'FREE_MONTHS'],
              example: 'PERCENT',
            },
            discount_value: { type: 'number', example: 20 },
            require_min_warehouses: { type: 'boolean', example: false },
            min_warehouses: { type: 'number', example: null },
            require_min_rows: { type: 'boolean', example: false },
            min_rows: { type: 'number', example: null },
            require_min_order_amount: { type: 'boolean', example: false },
            min_order_amount: { type: 'number', example: null },
            require_min_rental_duration: { type: 'boolean', example: false },
            min_rental_duration_value: { type: 'number', example: null },
            min_rental_duration_unit: { type: 'string', example: null },
            is_unlimited_discount: { type: 'boolean', example: false },
            max_discount_amount: { type: 'number', example: 500000 },
            max_usage: { type: 'number', example: 100 },
            is_public: { type: 'boolean', example: false },
            apply_for_first_rental: { type: 'boolean', example: true },
            apply_for_renewal: { type: 'boolean', example: true },
            is_unlimited_stack: { type: 'boolean', example: false },
            max_stack_count: { type: 'number', example: 1 },
            has_gift_addons: { type: 'boolean', example: false },
            has_gift_insurances: { type: 'boolean', example: false },
            last_run_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-01T00:00:00.000Z',
            },
            next_run_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-01T00:00:00.000Z',
            },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-15T10:30:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-10T14:20:00.000Z',
            },
            created_by: { type: 'string', format: 'uuid' },
            updated_by: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy lịch coupon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon-schedule.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy lịch coupon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('coupon-schedule.read', 'coupon-schedule.read.all')
  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<ICouponSchedule>> {
    const hasReadAll = await this.hasPermission(
      userId,
      'coupon-schedule.read.all',
    );
    const result = await this.couponScheduleService.findById(
      id,
      userId,
      hasReadAll,
      lang,
    );
    return new GetResponse(
      'coupon-schedule.read.success',
      result,
      'Lấy chi tiết lịch coupon thành công',
    );
  }

  @ApiOperation({
    summary: 'Cập nhật lịch coupon',
    description:
      'Cập nhật thông tin của một lịch coupon. Chỉ các trường được gửi trong request body mới được cập nhật, các trường khác giữ nguyên. Yêu cầu quyền `coupon-schedule.update` (cập nhật lịch do mình tạo) hoặc `coupon-schedule.update.all` (cập nhật bất kỳ lịch nào).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của lịch coupon cần cập nhật (UUID v4)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateCouponScheduleDto,
    description:
      'Dữ liệu lịch coupon cần cập nhật (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_basic: {
        summary: 'Cập nhật thông tin cơ bản',
        description: 'Cập nhật tên và mô tả',
        value: {
          name: 'Khuyến mãi đầu tháng - Updated',
          description: 'Mô tả mới cho lịch coupon',
        },
      },
      update_discount: {
        summary: 'Cập nhật giảm giá',
        description: 'Thay đổi giá trị và loại giảm giá',
        value: {
          discount_type: 'PERCENT',
          discount_value: 25,
          is_unlimited_discount: false,
          max_discount_amount: 750000,
        },
      },
      update_schedule: {
        summary: 'Cập nhật lịch chạy',
        description: 'Thay đổi chu kỳ và thời gian chạy',
        value: {
          period: 'WEEKLY',
          scheduled_weekday: 5,
        },
      },
      toggle_status: {
        summary: 'Bật/tắt trạng thái',
        description: 'Kích hoạt hoặc tạm dừng lịch coupon',
        value: {
          is_active: false,
        },
      },
      update_conditions: {
        summary: 'Cập nhật điều kiện áp dụng',
        description: 'Thay đổi các điều kiện tối thiểu',
        value: {
          require_min_order_amount: true,
          min_order_amount: 2000000,
          require_min_rental_duration: true,
          min_rental_duration_value: 3,
          min_rental_duration_unit: 'MONTH',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật lịch coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon-schedule.update.success' },
        message: { type: 'string', example: 'Cập nhật lịch coupon thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          description: 'Thông tin lịch coupon sau khi cập nhật',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            period: { type: 'string' },
            discount_type: { type: 'string' },
            discount_value: { type: 'number' },
            is_active: { type: 'boolean' },
            updated_at: { type: 'string', format: 'date-time' },
            updated_by: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy lịch coupon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon-schedule.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy lịch coupon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('coupon-schedule.update', 'coupon-schedule.update.all')
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponScheduleDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<ICouponSchedule>> {
    const hasUpdateAll = await this.hasPermission(
      userId,
      'coupon-schedule.update.all',
    );
    const result = await this.couponScheduleService.update(
      id,
      dto,
      userId,
      hasUpdateAll,
      lang,
    );
    return new UpdatedResponse(
      'coupon-schedule.update.success',
      result,
      'Cập nhật lịch coupon thành công',
    );
  }

  @ApiOperation({
    summary: 'Xóa nhiều lịch coupon',
    description:
      'Xóa mềm nhiều lịch coupon theo danh sách ID. Các lịch đã xóa có thể khôi phục. Yêu cầu quyền `coupon-schedule.delete`.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID các lịch coupon cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa nhiều lịch coupon',
        description: 'Xóa 3 lịch coupon cùng lúc',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
          ],
        },
      },
      delete_single: {
        summary: 'Xóa một lịch coupon',
        description: 'Xóa 1 lịch coupon qua API delete many',
        value: {
          ids: ['550e8400-e29b-41d4-a716-446655440001'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa lịch coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon-schedule.delete.success' },
        message: {
          type: 'string',
          example: 'Xóa nhiều lịch coupon thành công',
        },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Một hoặc nhiều lịch coupon không tìm thấy',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon-schedule.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy lịch coupon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('coupon-schedule.delete', 'coupon-schedule.delete.all')
  @Delete('delete/many')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(
      userId,
      'coupon-schedule.delete.all',
    );
    await this.couponScheduleService.deleteMany(
      dto.ids,
      userId,
      hasDeleteAll,
      lang,
    );
    return new DeletedResponse(
      'coupon-schedule.delete.success',
      null as any,
      'Xóa nhiều lịch coupon thành công',
    );
  }

  @ApiOperation({
    summary: 'Xóa lịch coupon',
    description:
      'Xóa mềm một lịch coupon theo ID. Lịch đã xóa có thể khôi phục. Yêu cầu quyền `coupon-schedule.delete`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của lịch coupon cần xóa (UUID v4)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa lịch coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon-schedule.delete.success' },
        message: { type: 'string', example: 'Xóa lịch coupon thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy lịch coupon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon-schedule.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy lịch coupon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('coupon-schedule.delete', 'coupon-schedule.delete.all')
  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(
      userId,
      'coupon-schedule.delete.all',
    );
    await this.couponScheduleService.delete(id, userId, hasDeleteAll, lang);
    return new DeletedResponse(
      'coupon-schedule.delete.success',
      null as any,
      'Xóa lịch coupon thành công',
    );
  }
}
