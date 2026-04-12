import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import {
  RequirePermission,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import { FeatureFlagService } from './feature-flag.service';
import {
  buildPaginationDataSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/swagger-response.helper';

const FEATURE_FLAG_ID = '550e8400-e29b-41d4-a716-446655440501';

const featureFlagSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: FEATURE_FLAG_ID },
    name: { type: 'string', example: 'inventory.new-flow' },
    module: { type: 'string', example: 'inventory' },
    description: {
      type: 'string',
      example: 'Bật quy trình tồn kho mới cho module inventory',
    },
    is_active: { type: 'boolean', example: true },
    created_at: {
      type: 'string',
      format: 'date-time',
      example: '2026-03-13T08:00:00.000Z',
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
      example: '2026-03-13T09:00:00.000Z',
    },
  },
};

@ApiTags('Feature Flags')
@ApiBearerAuth('JWT-auth')
@Controller('admin/feature-flags')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('featureflag.admin')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  @ApiOperation({
    summary: 'Get list of all feature flags',
    description:
      'Lấy danh sách tất cả feature flags với phân trang, tìm kiếm theo tên, và lọc theo module hoặc trạng thái hoạt động. Yêu cầu quyền `featureflag.admin`.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Số trang hiện tại',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng mỗi trang',
    example: 20,
  })
  @ApiQuery({
    name: 'module',
    required: false,
    type: String,
    description: 'Lọc theo module',
    example: 'inventory',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái active/inactive',
    example: true,
  })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Bao gồm cả feature flag đã xóa mềm',
    example: false,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Tìm kiếm theo tên feature flag',
    example: 'inventory',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách feature flag và thông tin phân trang',
    schema: buildSuccessResponseSchema({
      code: 'feature-flag.list',
      message: 'Lấy danh sách feature flag thành công',
      dataSchema: buildPaginationDataSchema(featureFlagSchema),
      dataExample: {
        items: [
          {
            id: FEATURE_FLAG_ID,
            name: 'inventory.new-flow',
            module: 'inventory',
            description: 'Bật quy trình tồn kho mới cho module inventory',
            is_active: true,
            created_at: '2026-03-13T08:00:00.000Z',
            updated_at: '2026-03-13T09:00:00.000Z',
          },
        ],
        total: 24,
        limit: 20,
        offset: 0,
        hasMore: true,
      },
    }),
  })
  @ApiAuthResponses()
  async getAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('module') module?: string,
    @Query('isActive') isActive?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('search') search?: string,
  ) {
    return this.featureFlagService.getAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      module,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      includeDeleted: includeDeleted === 'true',
      search,
    });
  }

  @Get('modules')
  @ApiOperation({
    summary: 'Get list of all modules',
    description:
      'Lấy danh sách các module hiện có feature flag để hỗ trợ filter và quản trị. Yêu cầu quyền `featureflag.admin`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách module có feature flag',
    schema: buildSuccessResponseSchema({
      code: 'feature-flag.modules',
      message: 'Lấy danh sách module thành công',
      dataSchema: {
        type: 'array',
        items: { type: 'string', example: 'inventory' },
      },
      dataExample: ['inventory', 'user-management', 'contact'],
    }),
  })
  @ApiAuthResponses()
  async getModules() {
    return this.featureFlagService.getModules();
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get feature flag statistics',
    description:
      'Lấy thống kê tổng quan về feature flags: tổng số, đang bật và đang tắt. Yêu cầu quyền `featureflag.admin`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về số liệu thống kê feature flag',
    schema: buildSuccessResponseSchema({
      code: 'feature-flag.stats',
      message: 'Lấy thống kê feature flag thành công',
      dataSchema: {
        type: 'object',
        properties: {
          total: { type: 'number', example: 24 },
          active: { type: 'number', example: 16 },
          inactive: { type: 'number', example: 8 },
        },
      },
      dataExample: { total: 24, active: 16, inactive: 8 },
    }),
  })
  @ApiAuthResponses()
  async getStats() {
    return this.featureFlagService.getStats();
  }

  @Put('bulk/toggle')
  @ApiOperation({
    summary: 'Bulk toggle feature flags',
    description:
      'Bật hoặc tắt nhiều feature flag cùng lúc. Tất cả thay đổi sẽ được ghi log để phục vụ audit. Yêu cầu quyền `featureflag.admin`.',
  })
  @ApiBody({
    description: 'Danh sách ID feature flag và trạng thái cần cập nhật',
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          example: [FEATURE_FLAG_ID, '550e8400-e29b-41d4-a716-446655440502'],
        },
        is_active: { type: 'boolean', example: true },
      },
      required: ['ids', 'is_active'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về kết quả bật/tắt hàng loạt feature flag',
    schema: buildSuccessResponseSchema({
      code: 'feature-flag.bulk-toggle',
      message: 'Cập nhật hàng loạt feature flag thành công',
      dataSchema: { type: 'array', items: featureFlagSchema },
      dataExample: [
        {
          id: FEATURE_FLAG_ID,
          name: 'inventory.new-flow',
          module: 'inventory',
          description: 'Bật quy trình tồn kho mới cho module inventory',
          is_active: true,
          created_at: '2026-03-13T08:00:00.000Z',
          updated_at: '2026-03-13T09:00:00.000Z',
        },
      ],
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async bulkToggle(
    @Body() body: { ids: string[]; is_active: boolean },
    @Req() req: Request,
  ) {
    const context = this.extractContext(req);
    return this.featureFlagService.bulkToggle(
      body.ids,
      body.is_active,
      context,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get feature flag by ID',
    description:
      'Lấy chi tiết một feature flag theo ID để xem trạng thái hiện tại và metadata liên quan. Yêu cầu quyền `featureflag.admin`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID feature flag cần xem',
    example: FEATURE_FLAG_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về chi tiết feature flag',
    schema: buildSuccessResponseSchema({
      code: 'feature-flag.read',
      message: 'Lấy chi tiết feature flag thành công',
      dataSchema: featureFlagSchema,
      dataExample: {
        id: FEATURE_FLAG_ID,
        name: 'inventory.new-flow',
        module: 'inventory',
        description: 'Bật quy trình tồn kho mới cho module inventory',
        is_active: true,
        created_at: '2026-03-13T08:00:00.000Z',
        updated_at: '2026-03-13T09:00:00.000Z',
      },
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy feature flag',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'feature-flag.not_found' },
        message: { type: 'string', example: 'Không tìm thấy feature flag' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  async getById(@Param('id') id: string) {
    return this.featureFlagService.getById(id);
  }

  @Get(':id/logs')
  @ApiOperation({
    summary: 'Get feature flag logs',
    description:
      'Lấy lịch sử thay đổi của một feature flag để phục vụ audit và truy vết thao tác quản trị. Yêu cầu quyền `featureflag.admin`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID feature flag cần xem log',
    example: FEATURE_FLAG_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Số trang hiện tại',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng log mỗi trang',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về lịch sử thay đổi của feature flag',
    schema: buildSuccessResponseSchema({
      code: 'feature-flag.logs',
      message: 'Lấy lịch sử feature flag thành công',
      dataSchema: buildPaginationDataSchema({
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '550e8400-e29b-41d4-a716-446655440601',
          },
          action: { type: 'string', example: 'toggle' },
          old_value: { type: 'boolean', example: false },
          new_value: { type: 'boolean', example: true },
          created_at: {
            type: 'string',
            format: 'date-time',
            example: '2026-03-13T09:00:00.000Z',
          },
        },
      }),
      dataExample: {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440601',
            action: 'toggle',
            old_value: false,
            new_value: true,
            created_at: '2026-03-13T09:00:00.000Z',
          },
        ],
        total: 10,
        limit: 20,
        offset: 0,
        hasMore: false,
      },
    }),
  })
  @ApiAuthResponses()
  async getLogs(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.featureFlagService.getLogs(id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Toggle feature flag status',
    description:
      'Bật hoặc tắt một feature flag cụ thể. Thay đổi sẽ được ghi nhận vào lịch sử để phục vụ audit. Yêu cầu quyền `featureflag.admin`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID feature flag cần cập nhật',
    example: FEATURE_FLAG_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiBody({
    description: 'Trạng thái mới của feature flag',
    schema: {
      type: 'object',
      properties: {
        is_active: { type: 'boolean', example: false },
      },
      required: ['is_active'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về feature flag sau khi cập nhật trạng thái thành công',
    schema: buildSuccessResponseSchema({
      code: 'feature-flag.toggle',
      message: 'Cập nhật trạng thái feature flag thành công',
      dataSchema: featureFlagSchema,
      dataExample: {
        id: FEATURE_FLAG_ID,
        name: 'inventory.new-flow',
        module: 'inventory',
        description: 'Bật quy trình tồn kho mới cho module inventory',
        is_active: false,
        created_at: '2026-03-13T08:00:00.000Z',
        updated_at: '2026-03-13T10:00:00.000Z',
      },
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async toggle(
    @Param('id') id: string,
    @Body() body: { is_active: boolean },
    @Req() req: Request,
  ) {
    const context = this.extractContext(req);
    return this.featureFlagService.toggle(id, body.is_active, context);
  }

  private extractContext(req: Request) {
    const user = req.user as any;
    return {
      userId: user?.userId,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      userAgent: req.headers['user-agent'],
    };
  }
}
