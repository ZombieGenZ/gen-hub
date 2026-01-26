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

import { CouponService } from './coupon.service';
import { CreateCouponDto, UpdateCouponDto, QueryCouponDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
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
import { ICoupon, IPaginatedResponse } from './interfaces';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @ApiOperation({
    summary: 'Tạo coupon mới',
    description:
      'Tạo mã giảm giá mới với các điều kiện áp dụng. Hỗ trợ giảm giá theo phần trăm, số tiền cố định hoặc tháng miễn phí. Có thể cấu hình điều kiện sử dụng như số kho tối thiểu, thời gian thuê, giá trị đơn hàng. Yêu cầu quyền `coupon.create`.',
  })
  @ApiBody({
    type: CreateCouponDto,
    description: 'Thông tin coupon cần tạo',
    examples: {
      percent_discount: {
        summary: 'Giảm giá theo phần trăm',
        description: 'Tạo coupon giảm 20% tối đa 500.000đ',
        value: {
          name: 'Khuyến mãi Tết 2025',
          description: 'Giảm 20% cho đơn hàng đầu tiên',
          code: 'TET2025',
          discount_type: 'PERCENT',
          discount_value: 20,
          is_unlimited_discount: false,
          max_discount_amount: 500000,
          is_permanent: false,
          starts_at: '2025-01-01T00:00:00.000Z',
          ends_at: '2025-02-28T23:59:59.999Z',
          max_usage: 100,
          is_public: true,
          apply_for_first_rental: true,
          apply_for_renewal: false,
          apply_for_all_warehouses: true,
          apply_for_all_rows: true,
          apply_for_all_addons: true,
          apply_for_all_insurances: true,
          is_active: true,
        },
      },
      fixed_amount: {
        summary: 'Giảm số tiền cố định',
        description: 'Tạo coupon giảm 200.000đ cho đơn hàng từ 1.000.000đ',
        value: {
          name: 'Ưu đãi cuối tuần',
          description: 'Giảm 200.000đ cho đơn hàng từ 1.000.000đ',
          code: 'WEEKEND200K',
          discount_type: 'AMOUNT',
          discount_value: 200000,
          require_min_order_amount: true,
          min_order_amount: 1000000,
          is_permanent: false,
          starts_at: '2025-01-01T00:00:00.000Z',
          ends_at: '2025-12-31T23:59:59.999Z',
          max_usage: 0,
          is_public: true,
          is_active: true,
        },
      },
      private_coupon: {
        summary: 'Coupon riêng tư cho user cụ thể',
        description: 'Tạo coupon chỉ áp dụng cho một số user nhất định',
        value: {
          name: 'VIP Customer Discount',
          description: 'Ưu đãi đặc biệt cho khách hàng VIP',
          code: 'VIP50',
          coupon_type: 'PRIVATE',
          discount_type: 'PERCENT',
          discount_value: 50,
          is_unlimited_discount: true,
          is_permanent: true,
          max_usage: 0,
          is_public: false,
          target_user_ids: ['550e8400-e29b-41d4-a716-446655440000'],
          is_active: true,
        },
      },
      with_conditions: {
        summary: 'Coupon với nhiều điều kiện',
        description: 'Tạo coupon yêu cầu số kho tối thiểu và thời gian thuê',
        value: {
          name: 'Ưu đãi thuê dài hạn',
          description: 'Giảm 30% cho thuê từ 6 tháng trở lên, ít nhất 2 kho',
          code: 'LONGTERM30',
          discount_type: 'PERCENT',
          discount_value: 30,
          is_unlimited_discount: false,
          max_discount_amount: 1000000,
          require_min_warehouses: true,
          min_warehouses: 2,
          require_min_rental_duration: true,
          min_rental_duration_value: 6,
          min_rental_duration_unit: 'MONTH',
          is_permanent: false,
          starts_at: '2025-01-01T00:00:00.000Z',
          ends_at: '2025-06-30T23:59:59.999Z',
          is_public: true,
          is_active: true,
        },
      },
      with_gift_addons: {
        summary: 'Coupon tặng kèm addon',
        description: 'Tạo coupon tặng kèm addon khi áp dụng',
        value: {
          name: 'Tặng kèm bảo vệ',
          description: 'Thuê kho được tặng dịch vụ bảo vệ 24/7',
          code: 'FREEGUARD',
          discount_type: 'PERCENT',
          discount_value: 0,
          is_permanent: false,
          starts_at: '2025-01-01T00:00:00.000Z',
          ends_at: '2025-12-31T23:59:59.999Z',
          has_gift_addons: true,
          gift_addon_ids: ['550e8400-e29b-41d4-a716-446655440001'],
          is_public: true,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.create.success' },
        message: { type: 'string', example: 'Tạo coupon thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID của coupon',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: {
              type: 'string',
              description: 'Tên coupon',
              example: 'Khuyến mãi Tết 2025',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Mô tả coupon',
              example: 'Giảm 20% cho đơn hàng đầu tiên',
            },
            code: {
              type: 'string',
              description: 'Mã coupon (unique)',
              example: 'TET2025',
            },
            coupon_type: {
              type: 'string',
              enum: ['PUBLIC', 'PRIVATE'],
              description: 'Loại coupon',
              example: 'PUBLIC',
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
              description: 'Giá trị giảm tối đa (cho PERCENT)',
              example: 500000,
            },
            is_permanent: {
              type: 'boolean',
              description: 'Coupon vĩnh viễn',
              example: false,
            },
            starts_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Thời gian bắt đầu',
              example: '2025-01-01T00:00:00.000Z',
            },
            ends_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Thời gian kết thúc',
              example: '2025-02-28T23:59:59.999Z',
            },
            max_usage: {
              type: 'number',
              description: 'Số lượng sử dụng tối đa (0 = không giới hạn)',
              example: 100,
            },
            current_usage: {
              type: 'number',
              description: 'Số lượng đã sử dụng',
              example: 0,
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
              example: false,
            },
            schedule_id: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'ID lịch coupon (nếu được tạo từ schedule)',
              example: null,
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
              example: '2025-01-01T00:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Thời gian cập nhật',
              example: null,
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
        code: 'coupon.create.success',
        message: 'Tạo coupon thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Khuyến mãi Tết 2025',
          description: 'Giảm 20% cho đơn hàng đầu tiên',
          code: 'TET2025',
          coupon_type: 'PUBLIC',
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
          max_discount_amount: 500000,
          is_permanent: false,
          starts_at: '2025-01-01T00:00:00.000Z',
          ends_at: '2025-02-28T23:59:59.999Z',
          max_usage: 100,
          current_usage: 0,
          is_public: true,
          apply_for_first_rental: true,
          apply_for_renewal: false,
          schedule_id: null,
          is_active: true,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: null,
          created_by: '550e8400-e29b-41d4-a716-446655440099',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã coupon đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.errors.code_exists' },
        message: { type: 'string', example: 'Mã coupon đã tồn tại' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('coupon.create')
  @Post()
  async create(
    @Body() dto: CreateCouponDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<ICoupon>> {
    const result = await this.couponService.create(dto, userId, lang);
    return new CreatedResponse(
      'coupon.create.success',
      result,
      'Tạo coupon thành công',
    );
  }

  @ApiOperation({
    summary: 'Lấy danh sách coupon (Admin)',
    description:
      'Lấy danh sách tất cả coupon với phân trang và bộ lọc. Hỗ trợ tìm kiếm theo tên, mã coupon và lọc theo trạng thái. Yêu cầu quyền `coupon.list`.',
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
    description: 'Từ khóa tìm kiếm (tên, mã coupon)',
    example: 'TET',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái hoạt động',
    example: true,
  })
  @ApiQuery({
    name: 'is_public',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái công khai',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.list.success' },
        message: { type: 'string', example: 'Lấy danh sách coupon thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Danh sách coupon',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    description: 'ID của coupon',
                    example: '550e8400-e29b-41d4-a716-446655440000',
                  },
                  name: {
                    type: 'string',
                    description: 'Tên coupon',
                    example: 'Khuyến mãi Tết 2025',
                  },
                  description: {
                    type: 'string',
                    nullable: true,
                    description: 'Mô tả coupon',
                    example: 'Giảm 20% cho đơn hàng đầu tiên',
                  },
                  code: {
                    type: 'string',
                    description: 'Mã coupon',
                    example: 'TET2025',
                  },
                  coupon_type: {
                    type: 'string',
                    enum: ['PUBLIC', 'PRIVATE'],
                    description: 'Loại coupon',
                    example: 'PUBLIC',
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
                  max_discount_amount: {
                    type: 'number',
                    nullable: true,
                    description: 'Giá trị giảm tối đa',
                    example: 500000,
                  },
                  max_usage: {
                    type: 'number',
                    description: 'Số lượng sử dụng tối đa',
                    example: 100,
                  },
                  current_usage: {
                    type: 'number',
                    description: 'Số lượng đã sử dụng',
                    example: 25,
                  },
                  is_public: {
                    type: 'boolean',
                    description: 'Coupon công khai',
                    example: true,
                  },
                  is_active: {
                    type: 'boolean',
                    description: 'Trạng thái hoạt động',
                    example: true,
                  },
                  starts_at: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                    description: 'Thời gian bắt đầu',
                    example: '2025-01-01T00:00:00.000Z',
                  },
                  ends_at: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                    description: 'Thời gian kết thúc',
                    example: '2025-02-28T23:59:59.999Z',
                  },
                  created_at: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Thời gian tạo',
                    example: '2025-01-01T00:00:00.000Z',
                  },
                },
              },
            },
            total: {
              type: 'number',
              description: 'Tổng số coupon',
              example: 50,
            },
            limit: {
              type: 'number',
              description: 'Số lượng mỗi trang',
              example: 10,
            },
            offset: {
              type: 'number',
              description: 'Vị trí bắt đầu',
              example: 0,
            },
            hasMore: {
              type: 'boolean',
              description: 'Còn dữ liệu để load thêm',
              example: true,
            },
          },
        },
      },
      example: {
        code: 'coupon.list.success',
        message: 'Lấy danh sách coupon thành công',
        success: true,
        data: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Khuyến mãi Tết 2025',
              description: 'Giảm 20% cho đơn hàng đầu tiên',
              code: 'TET2025',
              coupon_type: 'PUBLIC',
              discount_type: 'PERCENT',
              discount_value: 20,
              max_discount_amount: 500000,
              max_usage: 100,
              current_usage: 25,
              is_public: true,
              is_active: true,
              starts_at: '2025-01-01T00:00:00.000Z',
              ends_at: '2025-02-28T23:59:59.999Z',
              created_at: '2025-01-01T00:00:00.000Z',
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
  @RequirePermission('coupon.list')
  @Get()
  async findAll(
    @Query() query: QueryCouponDto,
  ): Promise<GetResponse<IPaginatedResponse<ICoupon>>> {
    const result = await this.couponService.findAll(query);
    return new GetResponse(
      'coupon.list.success',
      result,
      'Lấy danh sách coupon thành công',
    );
  }

  @ApiOperation({
    summary: 'Lấy chi tiết coupon',
    description:
      'Lấy thông tin chi tiết của một coupon theo ID. Bao gồm tất cả các điều kiện áp dụng, danh sách target và thống kê sử dụng. Yêu cầu quyền `coupon.read`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của coupon (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.read.success' },
        message: { type: 'string', example: 'Lấy chi tiết coupon thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', example: 'Khuyến mãi Tết 2025' },
            description: {
              type: 'string',
              example: 'Giảm 20% cho đơn hàng đầu tiên',
            },
            code: { type: 'string', example: 'TET2025' },
            coupon_type: {
              type: 'string',
              enum: ['PUBLIC', 'PRIVATE'],
              example: 'PUBLIC',
            },
            discount_type: {
              type: 'string',
              enum: ['PERCENT', 'AMOUNT', 'FREE_MONTHS'],
              example: 'PERCENT',
            },
            discount_value: { type: 'number', example: 20 },
            require_min_warehouses: { type: 'boolean', example: false },
            min_warehouses: { type: 'number', nullable: true, example: null },
            require_min_rows: { type: 'boolean', example: false },
            min_rows: { type: 'number', nullable: true, example: null },
            require_min_order_amount: { type: 'boolean', example: false },
            min_order_amount: { type: 'number', nullable: true, example: null },
            require_min_rental_duration: { type: 'boolean', example: false },
            min_rental_duration_value: {
              type: 'number',
              nullable: true,
              example: null,
            },
            min_rental_duration_unit: {
              type: 'string',
              nullable: true,
              example: null,
            },
            is_unlimited_discount: { type: 'boolean', example: false },
            max_discount_amount: {
              type: 'number',
              nullable: true,
              example: 500000,
            },
            is_permanent: { type: 'boolean', example: false },
            starts_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2025-01-01T00:00:00.000Z',
            },
            ends_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2025-02-28T23:59:59.999Z',
            },
            max_usage: { type: 'number', example: 100 },
            current_usage: { type: 'number', example: 25 },
            is_public: { type: 'boolean', example: true },
            apply_for_first_rental: { type: 'boolean', example: true },
            apply_for_renewal: { type: 'boolean', example: false },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2025-01-15T10:30:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy coupon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy coupon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('coupon.read')
  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<ICoupon>> {
    const result = await this.couponService.findById(id, lang);
    return new GetResponse(
      'coupon.read.success',
      result,
      'Lấy chi tiết coupon thành công',
    );
  }

  @ApiOperation({
    summary: 'Cập nhật coupon',
    description:
      'Cập nhật thông tin coupon theo ID. Có thể cập nhật một phần hoặc toàn bộ thông tin. Không thể thay đổi mã coupon nếu đã có người sử dụng. Yêu cầu quyền `coupon.update`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của coupon (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateCouponDto,
    description:
      'Thông tin coupon cần cập nhật (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_discount: {
        summary: 'Cập nhật giá trị giảm giá',
        description: 'Thay đổi giá trị giảm giá và giới hạn',
        value: {
          discount_value: 25,
          max_discount_amount: 600000,
        },
      },
      update_validity: {
        summary: 'Gia hạn thời gian hiệu lực',
        description: 'Kéo dài thời gian kết thúc của coupon',
        value: {
          ends_at: '2025-03-31T23:59:59.999Z',
        },
      },
      update_status: {
        summary: 'Thay đổi trạng thái',
        description: 'Bật/tắt coupon',
        value: {
          is_active: false,
        },
      },
      update_conditions: {
        summary: 'Cập nhật điều kiện áp dụng',
        description: 'Thay đổi điều kiện số kho tối thiểu',
        value: {
          require_min_warehouses: true,
          min_warehouses: 3,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.update.success' },
        message: { type: 'string', example: 'Cập nhật coupon thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          description: 'Thông tin coupon sau khi cập nhật',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID của coupon',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: {
              type: 'string',
              description: 'Tên coupon',
              example: 'Khuyến mãi Tết 2025',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Mô tả coupon',
              example: 'Giảm 20% cho đơn hàng đầu tiên',
            },
            code: {
              type: 'string',
              description: 'Mã coupon',
              example: 'TET2025',
            },
            coupon_type: {
              type: 'string',
              enum: ['PUBLIC', 'PRIVATE'],
              description: 'Loại coupon',
              example: 'PUBLIC',
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
              example: 25,
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
              example: 600000,
            },
            is_permanent: {
              type: 'boolean',
              description: 'Coupon vĩnh viễn',
              example: false,
            },
            starts_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Thời gian bắt đầu',
              example: '2025-01-01T00:00:00.000Z',
            },
            ends_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Thời gian kết thúc',
              example: '2025-02-28T23:59:59.999Z',
            },
            max_usage: {
              type: 'number',
              description: 'Số lượng sử dụng tối đa',
              example: 100,
            },
            current_usage: {
              type: 'number',
              description: 'Số lượng đã sử dụng',
              example: 25,
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
              example: false,
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
              example: '2025-01-01T00:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Thời gian cập nhật',
              example: '2025-01-20T10:30:00.000Z',
            },
            updated_by: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'ID user cập nhật',
              example: '550e8400-e29b-41d4-a716-446655440099',
            },
          },
        },
      },
      example: {
        code: 'coupon.update.success',
        message: 'Cập nhật coupon thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Khuyến mãi Tết 2025',
          description: 'Giảm 20% cho đơn hàng đầu tiên',
          code: 'TET2025',
          coupon_type: 'PUBLIC',
          discount_type: 'PERCENT',
          discount_value: 25,
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
          max_discount_amount: 600000,
          is_permanent: false,
          starts_at: '2025-01-01T00:00:00.000Z',
          ends_at: '2025-02-28T23:59:59.999Z',
          max_usage: 100,
          current_usage: 25,
          is_public: true,
          apply_for_first_rental: true,
          apply_for_renewal: false,
          is_active: true,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-20T10:30:00.000Z',
          updated_by: '550e8400-e29b-41d4-a716-446655440099',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy coupon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy coupon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('coupon.update')
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<ICoupon>> {
    const result = await this.couponService.update(id, dto, userId, lang);
    return new UpdatedResponse(
      'coupon.update.success',
      result,
      'Cập nhật coupon thành công',
    );
  }

  @ApiOperation({
    summary: 'Xóa nhiều coupon',
    description:
      'Xóa nhiều coupon cùng lúc theo danh sách ID. Coupon đã được sử dụng sẽ được soft delete. Yêu cầu quyền `coupon.delete`.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID coupon cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa nhiều coupon',
        description: 'Xóa 3 coupon cùng lúc',
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
    description: 'Xóa nhiều coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.delete.success' },
        message: { type: 'string', example: 'Xóa nhiều coupon thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Một hoặc nhiều coupon không tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy coupon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('coupon.delete')
  @Delete('delete/many')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.couponService.deleteMany(dto.ids, userId, lang);
    return new DeletedResponse(
      'coupon.delete.success',
      null,
      'Xóa nhiều coupon thành công',
    );
  }

  @ApiOperation({
    summary: 'Xóa coupon',
    description:
      'Xóa một coupon theo ID. Coupon đã được sử dụng sẽ được soft delete để giữ lịch sử. Yêu cầu quyền `coupon.delete`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của coupon (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.delete.success' },
        message: { type: 'string', example: 'Xóa coupon thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy coupon',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy coupon' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('coupon.delete')
  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.couponService.delete(id, userId, lang);
    return new DeletedResponse(
      'coupon.delete.success',
      null,
      'Xóa coupon thành công',
    );
  }
}
