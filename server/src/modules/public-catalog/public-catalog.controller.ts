import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { AddonService } from '../addon/addon.service';
import { InsuranceService } from '../insurance/insurance.service';
import { RentalDurationTierService } from '../rental-duration-tier/rental-duration-tier.service';
import { QueryActiveAddonDto } from '../addon/dto';
import { QueryInsuranceDto } from '../insurance/dto';
import { Public } from '../../common/decorators';
import { GetResponse } from '../../common/responses';

/**
 * Public Catalog Controller
 * Cung cấp API công khai để lấy danh sách addon, bảo hiểm, mốc thời gian thuê
 * đang hoạt động. Không yêu cầu xác thực.
 */
@ApiTags('Public Catalog')
@Controller('public')
export class PublicCatalogController {
  constructor(
    private readonly addonService: AddonService,
    private readonly insuranceService: InsuranceService,
    private readonly rentalDurationTierService: RentalDurationTierService,
  ) {}

  // ============================================================
  // GET /public/rental-duration-tiers/active
  // ============================================================
  @Get('rental-duration-tiers/active')
  @Public()
  @ApiOperation({
    summary: 'Lấy danh sách mốc thời gian thuê đang hoạt động (Public)',
    description:
      'API công khai để lấy danh sách tất cả mốc thời gian thuê đang hoạt động. ' +
      'Không yêu cầu xác thực. Dùng cho Booking Widget và Checkout page.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách mốc thời gian thuê active thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.success.fetched',
        },
        message: {
          type: 'string',
          example: 'Lấy danh sách mốc thời gian thuê thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string', example: '1 Tháng' },
              duration_value: { type: 'integer', example: 1 },
              duration_unit: {
                type: 'string',
                enum: ['MONTH', 'YEAR'],
                example: 'MONTH',
              },
              description: { type: 'string', example: 'Thuê trong 1 tháng' },
              order: { type: 'integer', example: 1 },
              is_active: { type: 'boolean', example: true },
            },
          },
        },
      },
    },
  })
  async getActiveRentalDurationTiers() {
    const result = await this.rentalDurationTierService.findAllActive();
    return new GetResponse(
      'rental-duration-tier.success.fetched',
      result,
      'Lấy danh sách mốc thời gian thuê thành công',
    );
  }

  // ============================================================
  // GET /public/addons/active
  // ============================================================
  @Get('addons/active')
  @Public()
  @ApiOperation({
    summary: 'Lấy danh sách addon đang hoạt động (Public)',
    description:
      'API công khai để lấy danh sách tất cả addon đang hoạt động. ' +
      'Không yêu cầu xác thực. Dùng cho Booking Widget và Checkout page.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi mỗi trang (mặc định: 100)',
    example: 100,
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
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string', example: 'Bảo hiểm kho hàng' },
                  description: { type: 'string', nullable: true },
                  price: { type: 'number', example: 500000 },
                  is_monthly_payment: { type: 'boolean', example: false },
                  is_active: { type: 'boolean', example: true },
                },
              },
            },
            total: { type: 'number', example: 25 },
            limit: { type: 'number', example: 100 },
            offset: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  async getActiveAddons(@Query() query: QueryActiveAddonDto) {
    const result = await this.addonService.findAllActive(query);
    return new GetResponse('addon.list.success', result);
  }

  // ============================================================
  // GET /public/insurances/active
  // ============================================================
  @Get('insurances/active')
  @Public()
  @ApiOperation({
    summary: 'Lấy danh sách bảo hiểm đang hoạt động (Public)',
    description:
      'API công khai để lấy danh sách tất cả bảo hiểm đang hoạt động. ' +
      'Không yêu cầu xác thực. Dùng cho Booking Widget và Checkout page.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi mỗi trang (mặc định: 100)',
    example: 100,
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
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string', example: 'Bảo hiểm hàng hóa cơ bản' },
                  description: { type: 'string', nullable: true },
                  price: { type: 'number', example: 500000 },
                  use_management_fee: { type: 'boolean', example: false },
                  management_fee_type: { type: 'string', nullable: true },
                  management_fee_value: { type: 'number', nullable: true },
                  is_active: { type: 'boolean', example: true },
                },
              },
            },
            total: { type: 'number', example: 25 },
            limit: { type: 'number', example: 100 },
            offset: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  async getActiveInsurances(@Query() query: QueryInsuranceDto) {
    const result = await this.insuranceService.findAllActive(query);
    return new GetResponse('insurance.list.success', result);
  }
}
