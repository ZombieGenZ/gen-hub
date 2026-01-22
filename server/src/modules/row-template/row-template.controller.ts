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

import { RowTemplateService } from './row-template.service';
import {
  CreateRowTemplateDto,
  UpdateRowTemplateDto,
  QueryRowTemplateDto,
} from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import {
  RequirePermission,
  CurrentUser,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import {
  CreatedResponse,
  UpdatedResponse,
  GetResponse,
  DeletedResponse,
} from '../../common/responses';

@ApiTags('Row Templates')
@Controller('warehouse-templates/:warehouseTemplateId/rows')
export class RowTemplateController {
  constructor(private readonly service: RowTemplateService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('row-template.create')
  @ApiOperation({
    summary: 'Tạo dãy mới cho warehouse template',
    description:
      'Tạo mới một dãy (row) trong template kho hàng với đầy đủ thông tin bao gồm vị trí, giá cả, cấu hình giảm giá, addon tặng kèm và bảo hiểm tặng kèm. Yêu cầu quyền `row-template.create`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: CreateRowTemplateDto,
    description: 'Thông tin dãy cần tạo',
    examples: {
      basic: {
        summary: 'Dãy cơ bản',
        description: 'Tạo dãy với thông tin tối thiểu',
        value: {
          name: 'Dãy A',
          code: 'ROW-A',
          price_per_month: 5000000,
          is_active: true,
        },
      },
      with_position: {
        summary: 'Dãy với vị trí',
        description: 'Tạo dãy với thông tin vị trí cụ thể',
        value: {
          name: 'Dãy B',
          code: 'ROW-B',
          description: 'Dãy B - khu vực phía Đông',
          price_per_month: 6000000,
          address: '123 Nguyễn Văn Linh, Quận 7',
          latitude: 10.7285,
          longitude: 106.7218,
          position_x: 10,
          position_y: 5,
          position_rotation: 0,
          is_active: true,
        },
      },
      with_discount: {
        summary: 'Dãy với giảm giá theo thời gian',
        description: 'Tạo dãy với cấu hình giảm giá theo mốc thời gian thuê',
        value: {
          name: 'Dãy C',
          code: 'ROW-C',
          price_per_month: 7000000,
          discount_configs: [
            {
              duration_tier_id: '550e8400-e29b-41d4-a716-446655440001',
              discount_percent: 5,
              is_active: true,
            },
            {
              duration_tier_id: '550e8400-e29b-41d4-a716-446655440002',
              discount_percent: 10,
              is_active: true,
            },
          ],
          is_active: true,
        },
      },
      full: {
        summary: 'Dãy đầy đủ thông tin',
        description:
          'Tạo dãy với tất cả thông tin bao gồm addon và bảo hiểm tặng kèm',
        value: {
          name: 'Dãy Premium',
          code: 'ROW-PREM-01',
          description: 'Dãy premium với đầy đủ tiện ích',
          price_per_month: 10000000,
          address: '456 Võ Văn Kiệt, Quận 1',
          latitude: 10.7623,
          longitude: 106.6602,
          position_x: 20,
          position_y: 10,
          position_rotation: 45,
          discount_configs: [
            {
              duration_tier_id: '550e8400-e29b-41d4-a716-446655440001',
              discount_percent: 5,
            },
            {
              duration_tier_id: '550e8400-e29b-41d4-a716-446655440002',
              discount_percent: 10,
            },
            {
              duration_tier_id: '550e8400-e29b-41d4-a716-446655440003',
              discount_percent: 15,
            },
          ],
          addon_gifts: [
            {
              addon_id: '550e8400-e29b-41d4-a716-446655440010',
              is_until_service_end: true,
              is_active: true,
            },
          ],
          insurance_gifts: [
            {
              insurance_id: '550e8400-e29b-41d4-a716-446655440020',
              is_until_service_end: false,
              gift_duration_value: 3,
              gift_duration_unit: 'MONTH',
              is_active: true,
            },
          ],
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo dãy thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'row-template.success.created' },
        message: { type: 'string', example: 'Tạo dãy thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', example: 'Dãy A' },
            code: { type: 'string', example: 'ROW-A' },
            description: {
              type: 'string',
              example: 'Dãy A - khu vực phía Đông',
            },
            price_per_month: { type: 'number', example: 5000000 },
            address: { type: 'string', example: '123 Nguyễn Văn Linh, Quận 7' },
            latitude: { type: 'number', example: 10.7285 },
            longitude: { type: 'number', example: 106.7218 },
            position_x: { type: 'number', example: 10 },
            position_y: { type: 'number', example: 5 },
            position_rotation: { type: 'number', example: 0 },
            is_active: { type: 'boolean', example: true },
            is_rented: { type: 'boolean', example: false },
            warehouse_template_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy warehouse template',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'row-template.errors.warehouse_template_not_found',
        },
        message: {
          type: 'string',
          example: 'Không tìm thấy template kho hàng',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã dãy đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'row-template.errors.code_exists' },
        message: {
          type: 'string',
          example: 'Mã dãy đã tồn tại trong template này',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async create(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Body() dto: CreateRowTemplateDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.create(
      warehouseTemplateId,
      dto,
      userId,
      lang,
    );
    return new CreatedResponse('row-template.success.created', result);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('row-template.list')
  @ApiOperation({
    summary: 'Lấy danh sách dãy của warehouse template',
    description:
      'Lấy danh sách các dãy trong template kho hàng có hỗ trợ phân trang và lọc theo từ khóa, trạng thái hoạt động, trạng thái cho thuê. Yêu cầu quyền `row-template.list`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa (mặc định: 10)',
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
    description: 'Từ khóa tìm kiếm theo tên, mã, mô tả',
    example: 'Dãy A',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái hoạt động',
    example: true,
  })
  @ApiQuery({
    name: 'is_rented',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái cho thuê',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách dãy thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'row-template.success.fetched' },
        message: { type: 'string', example: 'Lấy dữ liệu dãy thành công' },
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
                  name: { type: 'string', example: 'Dãy A' },
                  code: { type: 'string', example: 'ROW-A' },
                  description: { type: 'string' },
                  price_per_month: { type: 'number', example: 5000000 },
                  is_active: { type: 'boolean', example: true },
                  is_rented: { type: 'boolean', example: false },
                },
              },
            },
            total: { type: 'number', example: 50 },
            limit: { type: 'number', example: 10 },
            offset: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy warehouse template',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'row-template.errors.warehouse_template_not_found',
        },
        message: {
          type: 'string',
          example: 'Không tìm thấy template kho hàng',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  async findMany(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Query() query: QueryRowTemplateDto,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.findMany(
      warehouseTemplateId,
      query,
      lang,
    );
    return new GetResponse('row-template.success.fetched', result);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('row-template.read')
  @ApiOperation({
    summary: 'Lấy chi tiết dãy',
    description:
      'Lấy thông tin chi tiết của một dãy bao gồm cấu hình giảm giá, addon tặng kèm, bảo hiểm tặng kèm và các thông tin liên quan. Yêu cầu quyền `row-template.read`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của dãy (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết dãy thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'row-template.success.fetched' },
        message: { type: 'string', example: 'Lấy dữ liệu dãy thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            name: { type: 'string', example: 'Dãy A' },
            code: { type: 'string', example: 'ROW-A' },
            description: {
              type: 'string',
              example: 'Dãy A - khu vực phía Đông',
            },
            price_per_month: { type: 'number', example: 5000000 },
            address: { type: 'string', example: '123 Nguyễn Văn Linh, Quận 7' },
            latitude: { type: 'number', example: 10.7285 },
            longitude: { type: 'number', example: 106.7218 },
            position_x: { type: 'number', example: 10 },
            position_y: { type: 'number', example: 5 },
            position_rotation: { type: 'number', example: 0 },
            is_active: { type: 'boolean', example: true },
            is_rented: { type: 'boolean', example: false },
            warehouse_template_id: { type: 'string', format: 'uuid' },
            discount_configs: {
              type: 'array',
              description: 'Cấu hình giảm giá theo mốc thời gian',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  duration_tier_id: { type: 'string', format: 'uuid' },
                  discount_percent: { type: 'number', example: 10 },
                  is_active: { type: 'boolean', example: true },
                },
              },
            },
            addon_gifts: {
              type: 'array',
              description: 'Danh sách addon tặng kèm',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  addon_id: { type: 'string', format: 'uuid' },
                  is_until_service_end: { type: 'boolean', example: true },
                  gift_duration_value: { type: 'number', example: 3 },
                  gift_duration_unit: {
                    type: 'string',
                    enum: ['DAY', 'WEEK', 'MONTH', 'YEAR'],
                  },
                  is_active: { type: 'boolean', example: true },
                },
              },
            },
            insurance_gifts: {
              type: 'array',
              description: 'Danh sách bảo hiểm tặng kèm',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  insurance_id: { type: 'string', format: 'uuid' },
                  is_until_service_end: { type: 'boolean', example: false },
                  gift_duration_value: { type: 'number', example: 6 },
                  gift_duration_unit: {
                    type: 'string',
                    enum: ['DAY', 'WEEK', 'MONTH', 'YEAR'],
                  },
                  is_active: { type: 'boolean', example: true },
                },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
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
        code: { type: 'string', example: 'row-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy dãy' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  async findById(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.findById(id, lang);
    return new GetResponse('row-template.success.fetched', result);
  }

  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('row-template.update')
  @ApiOperation({
    summary: 'Cập nhật dãy',
    description:
      'Cập nhật một phần hoặc toàn bộ thông tin của dãy. Chỉ các trường được gửi trong request body mới được cập nhật. Hỗ trợ cập nhật cấu hình giảm giá, addon tặng kèm và bảo hiểm tặng kèm. Yêu cầu quyền `row-template.update`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của dãy (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: UpdateRowTemplateDto,
    description:
      'Thông tin dãy cần cập nhật (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_info: {
        summary: 'Cập nhật thông tin cơ bản',
        description: 'Cập nhật tên, mô tả và giá',
        value: {
          name: 'Dãy A (Updated)',
          description: 'Mô tả cập nhật',
          price_per_month: 5500000,
        },
      },
      update_position: {
        summary: 'Cập nhật vị trí',
        description: 'Cập nhật tọa độ và góc xoay',
        value: {
          position_x: 15,
          position_y: 8,
          position_rotation: 30,
        },
      },
      update_discount: {
        summary: 'Cập nhật cấu hình giảm giá',
        description:
          'Config có id sẽ được update, không có id sẽ được tạo mới, config hiện có không trong danh sách sẽ bị xóa',
        value: {
          discount_configs: [
            {
              id: '550e8400-e29b-41d4-a716-446655440100',
              duration_tier_id: '550e8400-e29b-41d4-a716-446655440001',
              discount_percent: 8,
            },
            {
              duration_tier_id: '550e8400-e29b-41d4-a716-446655440002',
              discount_percent: 15,
            },
          ],
        },
      },
      update_gifts: {
        summary: 'Cập nhật addon và bảo hiểm tặng kèm',
        value: {
          addon_gifts: [
            {
              addon_id: '550e8400-e29b-41d4-a716-446655440010',
              is_until_service_end: true,
            },
          ],
          insurance_gifts: [
            {
              insurance_id: '550e8400-e29b-41d4-a716-446655440020',
              is_until_service_end: false,
              gift_duration_value: 6,
              gift_duration_unit: 'MONTH',
            },
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
    description: 'Cập nhật dãy thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'row-template.success.updated' },
        message: { type: 'string', example: 'Cập nhật dãy thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Dãy A (Updated)' },
            code: { type: 'string', example: 'ROW-A' },
            description: { type: 'string' },
            price_per_month: { type: 'number', example: 5500000 },
            is_active: { type: 'boolean', example: true },
            updated_at: { type: 'string', format: 'date-time' },
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
        code: { type: 'string', example: 'row-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy dãy' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã dãy đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'row-template.errors.code_exists' },
        message: {
          type: 'string',
          example: 'Mã dãy đã tồn tại trong template này',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async update(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRowTemplateDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.update(id, dto, userId, lang);
    return new UpdatedResponse('row-template.success.updated', result);
  }

  @Delete('delete/many')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('row-template.delete')
  @ApiOperation({
    summary: 'Xóa nhiều dãy',
    description:
      'Xóa mềm nhiều dãy cùng lúc. Yêu cầu quyền `row-template.delete`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID các dãy cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa 3 dãy',
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
    description: 'Xóa nhiều dãy thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'row-template.success.deleted' },
        message: { type: 'string', example: 'Xóa dãy thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dãy',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'row-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy dãy' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async deleteMany(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.deleteMany(dto.ids, userId, lang);
    return new DeletedResponse('row-template.success.deleted', null);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('row-template.delete')
  @ApiOperation({
    summary: 'Xóa dãy',
    description: 'Xóa mềm một dãy. Yêu cầu quyền `row-template.delete`.',
  })
  @ApiParam({
    name: 'warehouseTemplateId',
    description: 'ID của warehouse template (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của dãy (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa dãy thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'row-template.success.deleted' },
        message: { type: 'string', example: 'Xóa dãy thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dãy',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'row-template.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy dãy' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  async delete(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.delete(id, userId, lang);
    return new DeletedResponse('row-template.success.deleted', null);
  }
}
