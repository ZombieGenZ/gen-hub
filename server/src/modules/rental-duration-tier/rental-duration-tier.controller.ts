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

import { RentalDurationTierService } from './rental-duration-tier.service';
import {
  CreateRentalDurationTierDto,
  UpdateRentalDurationTierDto,
  QueryRentalDurationTierDto,
} from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import {
  CreatedResponse,
  UpdatedResponse,
  GetResponse,
  DeletedResponse,
} from '../../common/responses';
import { IRentalDurationTier, IPaginatedResponse } from './interfaces';

@ApiTags('Rental Duration Tiers')
@Controller('rental-duration-tiers')
export class RentalDurationTierController {
  constructor(private readonly service: RentalDurationTierService) {}

  @ApiOperation({
    summary: 'Tạo mốc thời gian thuê mới',
    description:
      'Tạo một mốc thời gian thuê mới với thông tin tên, giá trị thời gian, đơn vị và các quà tặng đi kèm (addon, bảo hiểm). Yêu cầu quyền `rental-duration-tier.create`.',
  })
  @ApiBody({
    type: CreateRentalDurationTierDto,
    description: 'Dữ liệu mốc thời gian thuê cần tạo',
    examples: {
      basic: {
        summary: 'Tạo mốc 1 tháng đơn giản',
        description: 'Tạo mốc thời gian thuê 1 tháng cơ bản',
        value: {
          name: '1 Tháng',
          duration_value: 1,
          duration_unit: 'MONTH',
          description: 'Thuê trong 1 tháng',
          order: 1,
          is_active: true,
        },
      },
      with_addon_gifts: {
        summary: 'Tạo mốc với addon tặng kèm',
        description: 'Tạo mốc thời gian thuê 6 tháng kèm theo addon',
        value: {
          name: '6 Tháng',
          duration_value: 6,
          duration_unit: 'MONTH',
          description: 'Thuê 6 tháng với addon tặng kèm',
          order: 2,
          is_active: true,
          addon_gifts: [
            {
              addon_id: '550e8400-e29b-41d4-a716-446655440001',
              require_min_order_amount: true,
              min_order_amount: 1000000,
              is_until_service_end: true,
              is_active: true,
            },
          ],
        },
      },
      with_insurance_gifts: {
        summary: 'Tạo mốc với bảo hiểm tặng kèm',
        description: 'Tạo mốc thời gian thuê 1 năm kèm bảo hiểm',
        value: {
          name: '1 Năm',
          duration_value: 1,
          duration_unit: 'YEAR',
          description: 'Thuê 1 năm với bảo hiểm tặng kèm',
          order: 3,
          is_active: true,
          insurance_gifts: [
            {
              insurance_id: '550e8400-e29b-41d4-a716-446655440002',
              require_min_warehouses: true,
              min_warehouses: 2,
              is_until_service_end: false,
              gift_duration_value: 3,
              gift_duration_unit: 'MONTH',
              is_active: true,
            },
          ],
        },
      },
      full: {
        summary: 'Tạo mốc đầy đủ thông tin',
        description:
          'Tạo mốc thời gian thuê với đầy đủ addon và bảo hiểm tặng kèm',
        value: {
          name: '2 Năm',
          duration_value: 2,
          duration_unit: 'YEAR',
          description: 'Gói thuê 2 năm siêu tiết kiệm với nhiều ưu đãi',
          order: 4,
          is_active: true,
          addon_gifts: [
            {
              addon_id: '550e8400-e29b-41d4-a716-446655440001',
              require_min_order_amount: true,
              min_order_amount: 5000000,
              require_min_warehouses: true,
              min_warehouses: 3,
              is_until_service_end: true,
              is_active: true,
            },
          ],
          insurance_gifts: [
            {
              insurance_id: '550e8400-e29b-41d4-a716-446655440002',
              require_min_rows: true,
              min_rows: 100,
              is_until_service_end: true,
              is_active: true,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo mốc thời gian thuê thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.success.created',
        },
        message: {
          type: 'string',
          example: 'Đã tạo mốc thời gian thuê thành công',
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
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-23T00:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-23T00:00:00.000Z',
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440099',
            },
            updated_by: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440099',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mốc thời gian thuê đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.errors.duration_exists',
        },
        message: {
          type: 'string',
          example:
            'Mốc thời gian này đã tồn tại (trùng giá trị và đơn vị thời gian)',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('rental-duration-tier.create')
  @Post()
  async create(
    @Body() dto: CreateRentalDurationTierDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IRentalDurationTier>> {
    const result = await this.service.create(dto, userId, lang);
    return new CreatedResponse(
      'rental-duration-tier.success.created',
      result,
      'Tạo mốc thời gian thuê thành công',
    );
  }

  @ApiOperation({
    summary: 'Lấy danh sách mốc thời gian thuê',
    description:
      'Lấy danh sách tất cả mốc thời gian thuê với hỗ trợ phân trang, tìm kiếm và lọc theo trạng thái. Yêu cầu quyền `rental-duration-tier.list`.',
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
    example: 'tháng',
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
    description: 'Lấy danh sách mốc thời gian thuê thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.success.fetched',
        },
        message: {
          type: 'string',
          example: 'Lấy dữ liệu mốc thời gian thuê thành công',
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
                  name: { type: 'string', example: '1 Tháng' },
                  duration_value: { type: 'integer', example: 1 },
                  duration_unit: {
                    type: 'string',
                    enum: ['MONTH', 'YEAR'],
                    example: 'MONTH',
                  },
                  description: {
                    type: 'string',
                    example: 'Thuê trong 1 tháng',
                  },
                  order: { type: 'integer', example: 1 },
                  is_active: { type: 'boolean', example: true },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'integer', example: 10 },
            limit: { type: 'integer', example: 10 },
            offset: { type: 'integer', example: 0 },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('rental-duration-tier.list')
  @Get()
  async findAll(
    @Query() query: QueryRentalDurationTierDto,
  ): Promise<GetResponse<IPaginatedResponse<IRentalDurationTier>>> {
    const result = await this.service.findAll(query);
    return new GetResponse(
      'rental-duration-tier.success.fetched',
      result,
      'Lấy danh sách mốc thời gian thuê thành công',
    );
  }

  @ApiOperation({
    summary: 'Lấy tất cả mốc thời gian thuê đang active',
    description:
      'Lấy danh sách tất cả các mốc thời gian thuê đang hoạt động (is_active = true), sắp xếp theo thứ tự order. Chỉ yêu cầu xác thực, không yêu cầu quyền cụ thể.',
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
          example: 'Lấy dữ liệu mốc thời gian thuê thành công',
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
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('active')
  async findAllActive(): Promise<GetResponse<IRentalDurationTier[]>> {
    const result = await this.service.findAllActive();
    return new GetResponse(
      'rental-duration-tier.success.fetched',
      result,
      'Lấy danh sách mốc thời gian thuê thành công',
    );
  }

  @ApiOperation({
    summary: 'Lấy chi tiết mốc thời gian thuê',
    description:
      'Lấy thông tin chi tiết của một mốc thời gian thuê theo ID, bao gồm danh sách addon và bảo hiểm tặng kèm. Yêu cầu quyền `rental-duration-tier.read`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của mốc thời gian thuê (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết mốc thời gian thuê thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.success.fetched',
        },
        message: {
          type: 'string',
          example: 'Lấy dữ liệu mốc thời gian thuê thành công',
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
            name: { type: 'string', example: '6 Tháng' },
            duration_value: { type: 'integer', example: 6 },
            duration_unit: {
              type: 'string',
              enum: ['MONTH', 'YEAR'],
              example: 'MONTH',
            },
            description: {
              type: 'string',
              example: 'Thuê 6 tháng với nhiều ưu đãi',
            },
            order: { type: 'integer', example: 2 },
            is_active: { type: 'boolean', example: true },
            addon_gifts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  addon_id: { type: 'string', format: 'uuid' },
                  require_min_order_amount: { type: 'boolean', example: true },
                  min_order_amount: { type: 'number', example: 1000000 },
                  is_until_service_end: { type: 'boolean', example: true },
                  is_active: { type: 'boolean', example: true },
                },
              },
            },
            insurance_gifts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  insurance_id: { type: 'string', format: 'uuid' },
                  require_min_warehouses: { type: 'boolean', example: true },
                  min_warehouses: { type: 'integer', example: 2 },
                  is_until_service_end: { type: 'boolean', example: false },
                  gift_duration_value: { type: 'integer', example: 3 },
                  gift_duration_unit: {
                    type: 'string',
                    enum: ['MONTH', 'YEAR'],
                    example: 'MONTH',
                  },
                  is_active: { type: 'boolean', example: true },
                },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            created_by: { type: 'string', format: 'uuid' },
            updated_by: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy mốc thời gian thuê',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.errors.not_found',
        },
        message: {
          type: 'string',
          example: 'Không tìm thấy mốc thời gian thuê',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('rental-duration-tier.read')
  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IRentalDurationTier>> {
    const result = await this.service.findById(id, lang);
    return new GetResponse(
      'rental-duration-tier.success.fetched',
      result,
      'Lấy chi tiết mốc thời gian thuê thành công',
    );
  }

  @ApiOperation({
    summary: 'Cập nhật mốc thời gian thuê',
    description:
      'Cập nhật thông tin mốc thời gian thuê theo ID. Chỉ các trường được gửi trong request body mới được cập nhật. Yêu cầu quyền `rental-duration-tier.update`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của mốc thời gian thuê cần cập nhật (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateRentalDurationTierDto,
    description: 'Dữ liệu cần cập nhật (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_name: {
        summary: 'Cập nhật tên',
        description: 'Chỉ cập nhật tên mốc thời gian',
        value: {
          name: '1 Tháng (Khuyến mãi)',
        },
      },
      update_status: {
        summary: 'Thay đổi trạng thái',
        description: 'Tắt hoạt động của mốc thời gian',
        value: {
          is_active: false,
        },
      },
      update_duration: {
        summary: 'Cập nhật thời gian',
        description: 'Thay đổi giá trị và đơn vị thời gian',
        value: {
          duration_value: 3,
          duration_unit: 'MONTH',
          description: 'Thuê 3 tháng',
        },
      },
      update_gifts: {
        summary: 'Cập nhật quà tặng',
        description: 'Cập nhật danh sách addon và bảo hiểm tặng kèm',
        value: {
          addon_gifts: [
            {
              id: '550e8400-e29b-41d4-a716-446655440010',
              addon_id: '550e8400-e29b-41d4-a716-446655440001',
              require_min_order_amount: true,
              min_order_amount: 2000000,
              is_until_service_end: true,
              is_active: true,
            },
          ],
          insurance_gifts: [
            {
              insurance_id: '550e8400-e29b-41d4-a716-446655440002',
              require_min_rows: true,
              min_rows: 50,
              is_until_service_end: true,
              is_active: true,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật mốc thời gian thuê thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.success.updated',
        },
        message: {
          type: 'string',
          example: 'Đã cập nhật mốc thời gian thuê thành công',
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
            name: { type: 'string', example: '1 Tháng (Khuyến mãi)' },
            duration_value: { type: 'integer', example: 1 },
            duration_unit: {
              type: 'string',
              enum: ['MONTH', 'YEAR'],
              example: 'MONTH',
            },
            description: { type: 'string', example: 'Thuê trong 1 tháng' },
            order: { type: 'integer', example: 1 },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            created_by: { type: 'string', format: 'uuid' },
            updated_by: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy mốc thời gian thuê',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.errors.not_found',
        },
        message: {
          type: 'string',
          example: 'Không tìm thấy mốc thời gian thuê',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mốc thời gian thuê đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.errors.duration_exists',
        },
        message: {
          type: 'string',
          example:
            'Mốc thời gian này đã tồn tại (trùng giá trị và đơn vị thời gian)',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('rental-duration-tier.update')
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRentalDurationTierDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IRentalDurationTier>> {
    const result = await this.service.update(id, dto, userId, lang);
    return new UpdatedResponse(
      'rental-duration-tier.success.updated',
      result,
      'Cập nhật mốc thời gian thuê thành công',
    );
  }

  @ApiOperation({
    summary: 'Xóa nhiều mốc thời gian thuê',
    description:
      'Xóa nhiều mốc thời gian thuê cùng lúc theo danh sách ID. Yêu cầu quyền `rental-duration-tier.delete`.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID của các mốc thời gian thuê cần xóa',
    examples: {
      delete_two: {
        summary: 'Xóa 2 mốc thời gian',
        description: 'Xóa 2 mốc thời gian thuê theo ID',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
          ],
        },
      },
      delete_multiple: {
        summary: 'Xóa nhiều mốc thời gian',
        description: 'Xóa nhiều mốc thời gian thuê theo ID',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440001',
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
    description: 'Xóa nhiều mốc thời gian thuê thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.success.deleted',
        },
        message: {
          type: 'string',
          example: 'Đã xóa mốc thời gian thuê thành công',
        },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Một hoặc nhiều mốc thời gian thuê không tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.errors.not_found',
        },
        message: {
          type: 'string',
          example: 'Không tìm thấy mốc thời gian thuê',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('rental-duration-tier.delete')
  @Delete('delete/many')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.service.deleteMany(dto.ids, userId, lang);
    return new DeletedResponse(
      'rental-duration-tier.success.deleted',
      null,
      'Xóa nhiều mốc thời gian thuê thành công',
    );
  }

  @ApiOperation({
    summary: 'Xóa mốc thời gian thuê',
    description:
      'Xóa một mốc thời gian thuê theo ID. Yêu cầu quyền `rental-duration-tier.delete`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của mốc thời gian thuê cần xóa (UUID)',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa mốc thời gian thuê thành công',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.success.deleted',
        },
        message: {
          type: 'string',
          example: 'Đã xóa mốc thời gian thuê thành công',
        },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy mốc thời gian thuê',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'rental-duration-tier.errors.not_found',
        },
        message: {
          type: 'string',
          example: 'Không tìm thấy mốc thời gian thuê',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('rental-duration-tier.delete')
  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.service.delete(id, userId, lang);
    return new DeletedResponse(
      'rental-duration-tier.success.deleted',
      null,
      'Xóa mốc thời gian thuê thành công',
    );
  }
}
