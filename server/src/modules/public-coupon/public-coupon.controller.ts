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
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { PublicCouponService } from './public-coupon.service';
import {
  QueryPublicCouponDto,
  CheckApplicableCouponDto,
  ValidateCouponDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser, Public } from '../../common/decorators';
import {
  ApiUnauthorizedResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators/api-common-responses.decorator';
import { GetResponse, OkResponse } from '../../common/responses';
import { IPublicCoupon, IPaginatedResponse } from './interfaces';

@ApiTags('Public Coupons')
@Controller('public/coupons')
export class PublicCouponController {
  constructor(private readonly publicCouponService: PublicCouponService) {}

  @ApiOperation({
    summary: 'Lấy danh sách coupon công khai',
    description:
      'Lấy danh sách các coupon đang hoạt động và công khai. API này không yêu cầu xác thực. Hỗ trợ phân trang và tìm kiếm.',
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
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách coupon công khai thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.public.list.success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách coupon công khai thành công',
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
                  name: { type: 'string', example: 'Khuyến mãi Tết 2025' },
                  description: {
                    type: 'string',
                    example: 'Giảm 20% cho đơn hàng đầu tiên',
                  },
                  code: { type: 'string', example: 'TET2025' },
                  discount_type: {
                    type: 'string',
                    enum: ['PERCENT', 'AMOUNT', 'FREE_MONTHS'],
                    example: 'PERCENT',
                  },
                  discount_value: { type: 'number', example: 20 },
                  max_discount_amount: {
                    type: 'number',
                    nullable: true,
                    example: 500000,
                  },
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
                },
              },
            },
            total: { type: 'number', example: 10 },
            limit: { type: 'number', example: 10 },
            offset: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @Public()
  @Get()
  async findAllPublic(
    @Query() query: QueryPublicCouponDto,
  ): Promise<GetResponse<IPaginatedResponse<IPublicCoupon>>> {
    const result = await this.publicCouponService.findAllPublic(query);
    return new GetResponse(
      'coupon.public.list.success',
      result,
      'Lấy danh sách coupon công khai thành công',
    );
  }

  @ApiOperation({
    summary: 'Lấy danh sách coupon đã lưu của user',
    description:
      'Lấy danh sách các coupon mà user đã lưu vào tài khoản. Chỉ trả về các coupon còn hiệu lực và chưa sử dụng hết.',
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
    description: 'Từ khóa tìm kiếm',
    example: 'TET',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách coupon đã lưu thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.saved.list.success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách coupon đã lưu thành công',
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
                  code: { type: 'string' },
                  discount_type: {
                    type: 'string',
                    enum: ['PERCENT', 'AMOUNT', 'FREE_MONTHS'],
                  },
                  discount_value: { type: 'number' },
                  max_discount_amount: { type: 'number', nullable: true },
                  starts_at: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                  ends_at: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                  saved_at: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Thời điểm lưu coupon',
                  },
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
  @ApiUnauthorizedResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('saved')
  async getSavedCoupons(
    @CurrentUser('userId') userId: string,
    @Query() query: QueryPublicCouponDto,
  ): Promise<GetResponse<IPaginatedResponse<IPublicCoupon>>> {
    const result = await this.publicCouponService.getSavedCoupons(
      userId,
      query,
    );
    return new GetResponse(
      'coupon.saved.list.success',
      result,
      'Lấy danh sách coupon đã lưu thành công',
    );
  }

  @ApiOperation({
    summary: 'Lấy danh sách coupon có thể áp dụng cho đơn hàng',
    description:
      'Kiểm tra và trả về danh sách các coupon đã lưu của user có thể áp dụng cho đơn hàng dựa trên các điều kiện như loại sản phẩm, thời gian thuê, giá trị đơn hàng.',
  })
  @ApiBody({
    type: CheckApplicableCouponDto,
    description: 'Thông tin đơn hàng để kiểm tra coupon áp dụng',
    examples: {
      new_contract: {
        summary: 'Kiểm tra cho hợp đồng mới',
        description: 'Lấy coupon có thể áp dụng cho thuê mới',
        value: {
          warehouse_template_ids: ['550e8400-e29b-41d4-a716-446655440001'],
          row_template_ids: [
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
          ],
          addon_ids: ['550e8400-e29b-41d4-a716-446655440004'],
          rental_duration_tier_id: '550e8400-e29b-41d4-a716-446655440005',
          type: 'NEW_CONTRACT',
        },
      },
      renewal: {
        summary: 'Kiểm tra cho gia hạn',
        description: 'Lấy coupon có thể áp dụng cho gia hạn hợp đồng',
        value: {
          warehouse_template_ids: ['550e8400-e29b-41d4-a716-446655440001'],
          row_template_ids: ['550e8400-e29b-41d4-a716-446655440002'],
          rental_duration_tier_id: '550e8400-e29b-41d4-a716-446655440005',
          type: 'RENEWAL',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách coupon có thể áp dụng thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.applicable.success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách coupon có thể áp dụng thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          description: 'Danh sách coupon có thể áp dụng cho đơn hàng',
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
                description: 'Giá trị giảm tối đa (cho PERCENT)',
                example: 500000,
              },
              estimated_discount: {
                type: 'number',
                description: 'Số tiền giảm ước tính dựa trên đơn hàng',
                example: 200000,
              },
              is_applicable: {
                type: 'boolean',
                description: 'Coupon có thể áp dụng cho đơn hàng này',
                example: true,
              },
              gift_addons: {
                type: 'array',
                description: 'Danh sách addon được tặng kèm khi áp dụng coupon',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    description: { type: 'string', nullable: true },
                  },
                },
                example: [],
              },
              gift_insurances: {
                type: 'array',
                description:
                  'Danh sách bảo hiểm được tặng kèm khi áp dụng coupon',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    description: { type: 'string', nullable: true },
                  },
                },
                example: [],
              },
            },
          },
        },
      },
      example: {
        code: 'coupon.applicable.success',
        message: 'Lấy danh sách coupon có thể áp dụng thành công',
        success: true,
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Khuyến mãi Tết 2025',
            description: 'Giảm 20% cho đơn hàng đầu tiên',
            code: 'TET2025',
            discount_type: 'PERCENT',
            discount_value: 20,
            max_discount_amount: 500000,
            estimated_discount: 200000,
            is_applicable: true,
            gift_addons: [],
            gift_insurances: [],
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('applicable')
  async getApplicableCoupons(
    @CurrentUser('userId') userId: string,
    @Body() dto: CheckApplicableCouponDto,
    @I18nLang() lang: string,
  ): Promise<GetResponse<any>> {
    const result = await this.publicCouponService.getApplicableCoupons(
      userId,
      dto,
      lang,
    );
    return new GetResponse(
      'coupon.applicable.success',
      result,
      'Lấy danh sách coupon có thể áp dụng thành công',
    );
  }

  @ApiOperation({
    summary: 'Kiểm tra mã coupon có thể áp dụng cho đơn hàng',
    description:
      'Kiểm tra một mã coupon cụ thể có thể áp dụng cho đơn hàng hay không. Trả về thông tin chi tiết về coupon và số tiền giảm giá ước tính nếu hợp lệ.',
  })
  @ApiBody({
    type: ValidateCouponDto,
    description: 'Thông tin đơn hàng và mã coupon cần kiểm tra',
    examples: {
      validate_code: {
        summary: 'Kiểm tra mã coupon',
        description: 'Kiểm tra mã TET2025 có thể áp dụng không',
        value: {
          code: 'TET2025',
          warehouse_template_ids: ['550e8400-e29b-41d4-a716-446655440001'],
          row_template_ids: ['550e8400-e29b-41d4-a716-446655440002'],
          addon_ids: ['550e8400-e29b-41d4-a716-446655440003'],
          rental_duration_tier_id: '550e8400-e29b-41d4-a716-446655440004',
          type: 'NEW_CONTRACT',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Mã response',
          example: 'coupon.validate.success',
        },
        message: {
          type: 'string',
          description: 'Thông báo',
          example: 'Coupon hợp lệ',
        },
        success: {
          type: 'boolean',
          description: 'Trạng thái thành công',
          example: true,
        },
        data: {
          oneOf: [
            {
              type: 'object',
              description: 'Coupon hợp lệ',
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
                estimated_discount: {
                  type: 'number',
                  description: 'Số tiền giảm ước tính',
                  example: 200000,
                },
                is_valid: {
                  type: 'boolean',
                  description: 'Coupon hợp lệ',
                  example: true,
                },
                gift_addons: {
                  type: 'array',
                  description: 'Danh sách addon được tặng kèm',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' },
                      description: { type: 'string', nullable: true },
                    },
                  },
                  example: [],
                },
                gift_insurances: {
                  type: 'array',
                  description: 'Danh sách bảo hiểm được tặng kèm',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' },
                      description: { type: 'string', nullable: true },
                    },
                  },
                  example: [],
                },
              },
            },
            {
              type: 'object',
              description: 'Coupon không hợp lệ',
              properties: {
                is_valid: {
                  type: 'boolean',
                  description: 'Coupon không hợp lệ',
                  example: false,
                },
                error: {
                  type: 'string',
                  description: 'Thông báo lỗi',
                  example: 'Coupon đã hết hạn',
                },
                error_code: {
                  type: 'string',
                  description: 'Mã lỗi',
                  example: 'coupon.errors.expired',
                },
              },
            },
          ],
        },
      },
    },
    content: {
      'application/json': {
        examples: {
          valid: {
            summary: 'Coupon hợp lệ',
            value: {
              code: 'coupon.validate.success',
              message: 'Coupon hợp lệ',
              success: true,
              data: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Khuyến mãi Tết 2025',
                description: 'Giảm 20% cho đơn hàng đầu tiên',
                code: 'TET2025',
                discount_type: 'PERCENT',
                discount_value: 20,
                max_discount_amount: 500000,
                estimated_discount: 200000,
                is_valid: true,
                gift_addons: [],
                gift_insurances: [],
              },
            },
          },
          invalid: {
            summary: 'Coupon không hợp lệ',
            value: {
              code: 'coupon.validate.failed',
              message: 'Coupon đã hết hạn',
              success: true,
              data: {
                is_valid: false,
                error: 'Coupon đã hết hạn',
                error_code: 'coupon.errors.expired',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Coupon không hợp lệ hoặc không thể áp dụng',
    content: {
      'application/json': {
        examples: {
          not_found: {
            summary: 'Mã coupon không tồn tại',
            value: {
              code: 'coupon.errors.invalid_code',
              message: 'Mã coupon không tồn tại hoặc đã hết hạn',
              success: false,
            },
          },
          min_warehouses: {
            summary: 'Không đủ số kho',
            value: {
              code: 'coupon.errors.min_warehouses_not_met',
              message: 'Đơn hàng chưa đạt số lượng kho tối thiểu',
              success: false,
            },
          },
          min_rental: {
            summary: 'Thời gian thuê chưa đủ',
            value: {
              code: 'coupon.errors.min_rental_duration_not_met',
              message: 'Thời gian thuê chưa đạt yêu cầu tối thiểu',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('validate')
  async validateCoupon(
    @CurrentUser('userId') userId: string,
    @Body() dto: ValidateCouponDto,
    @I18nLang() lang: string,
  ): Promise<OkResponse<any>> {
    const result = await this.publicCouponService.validateCoupon(
      userId,
      dto,
      lang,
    );
    if ('error' in result && result.error) {
      return new OkResponse('coupon.validate.failed', result, result.error);
    }
    return new OkResponse('coupon.validate.success', result, 'Coupon hợp lệ');
  }

  @ApiOperation({
    summary: 'Lưu coupon vào tài khoản',
    description:
      'Lưu một coupon công khai vào tài khoản để sử dụng sau. Coupon đã lưu sẽ hiển thị trong danh sách "Coupon đã lưu" và có thể áp dụng khi đặt hàng.',
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
    description: 'Lưu coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.save.success' },
        message: { type: 'string', example: 'Lưu coupon thành công' },
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
  @ApiResponse({
    status: 409,
    description: 'Coupon đã được lưu trước đó',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.errors.already_saved' },
        message: { type: 'string', example: 'Coupon đã được lưu' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiUnauthorizedResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post(':id/save')
  async saveCoupon(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<OkResponse<null>> {
    await this.publicCouponService.saveCoupon(userId, id, lang);
    return new OkResponse('coupon.save.success', null, 'Lưu coupon thành công');
  }

  @ApiOperation({
    summary: 'Bỏ lưu coupon khỏi tài khoản',
    description:
      'Xóa một coupon đã lưu khỏi danh sách coupon của user. Coupon vẫn có thể được lưu lại sau đó nếu còn hiệu lực.',
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
    description: 'Bỏ lưu coupon thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.unsave.success' },
        message: { type: 'string', example: 'Bỏ lưu coupon thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Coupon chưa được lưu',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'coupon.errors.not_saved' },
        message: { type: 'string', example: 'Coupon chưa được lưu' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiUnauthorizedResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Delete(':id/save')
  async unsaveCoupon(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<OkResponse<null>> {
    await this.publicCouponService.unsaveCoupon(userId, id, lang);
    return new OkResponse(
      'coupon.unsave.success',
      null,
      'Bỏ lưu coupon thành công',
    );
  }
}
