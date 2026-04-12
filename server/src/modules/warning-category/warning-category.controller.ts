import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { I18nLang } from 'nestjs-i18n';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
  CurrentUser,
  RequirePermission,
} from '../../common/decorators';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import {
  CreatedResponse,
  DeletedResponse,
  GetResponse,
  UpdatedResponse,
} from '../../common/responses/success.response';
import {
  buildErrorResponseSchema,
  buildPaginationDataSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/swagger-response.helper';
import {
  CreateWarningCategoryDto,
  DeleteManyWarningCategoryDto,
  QueryWarningCategoryDto,
  UpdateWarningCategoryDto,
} from './dto';
import { WarningCategoryService } from './warning-category.service';

const warningCategorySchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440001',
    },
    name: { type: 'string', example: 'Vi phạm chính sách' },
    description: {
      type: 'string',
      example: 'Danh mục cho các vi phạm liên quan đến chính sách sử dụng',
    },
    severity: { type: 'number', example: 5 },
    is_active: { type: 'boolean', example: true },
    created_at: {
      type: 'string',
      format: 'date-time',
      example: '2026-03-13T09:30:00.000Z',
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
      example: '2026-03-13T10:00:00.000Z',
    },
  },
};

@ApiTags('Warning Category')
@ApiBearerAuth('JWT-auth')
@Controller('admin/warning-categories')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WarningCategoryController {
  constructor(private readonly service: WarningCategoryService) {}

  @Post()
  @RequirePermission('warning-category.create')
  @ApiOperation({
    summary: 'Tạo danh mục cảnh báo mới',
    description:
      'Tạo một danh mục cảnh báo mới để phân loại các vi phạm hoặc trường hợp cần cảnh báo trong hệ thống. Yêu cầu quyền `warning-category.create`.',
  })
  @ApiBody({
    type: CreateWarningCategoryDto,
    description: 'Thông tin danh mục cảnh báo cần tạo',
    examples: {
      policy_violation: {
        summary: 'Danh mục vi phạm chính sách',
        description:
          'Tạo danh mục mức độ nghiêm trọng cao cho các vi phạm chính sách',
        value: {
          name: 'Vi phạm chính sách',
          description:
            'Danh mục cho các vi phạm liên quan đến chính sách sử dụng',
          severity: 5,
        },
      },
      warning_reminder: {
        summary: 'Danh mục nhắc nhở',
        description: 'Tạo danh mục nhẹ để ghi nhận các trường hợp cần nhắc nhở',
        value: {
          name: 'Nhắc nhở',
          description: 'Danh mục dành cho các cảnh báo nhẹ cần ghi nhận',
          severity: 2,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo danh mục cảnh báo thành công',
    schema: buildSuccessResponseSchema({
      code: 'warning-category.create',
      message: 'Tạo danh mục cảnh báo thành công',
      dataSchema: warningCategorySchema,
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Vi phạm chính sách',
        description:
          'Danh mục cho các vi phạm liên quan đến chính sách sử dụng',
        severity: 5,
        is_active: true,
        created_at: '2026-03-13T09:30:00.000Z',
        updated_at: '2026-03-13T10:00:00.000Z',
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu gửi lên không hợp lệ hoặc không thể tạo danh mục cảnh báo',
    schema: buildErrorResponseSchema({
      code: 'warning-category.create_invalid',
      message: 'Không thể tạo danh mục cảnh báo với dữ liệu đã cung cấp',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Danh mục cảnh báo đã tồn tại',
    schema: buildErrorResponseSchema({
      code: 'warning-category.name_conflict',
      message: 'Tên danh mục cảnh báo đã tồn tại trong hệ thống',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async create(
    @Body() dto: CreateWarningCategoryDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
    @Req() req: Request,
  ) {
    const category = await this.service.create(dto, userId, lang, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return new CreatedResponse('warning-category.create', category);
  }

  @Get()
  @RequirePermission('warning-category.list')
  @ApiOperation({
    summary: 'Lấy danh sách danh mục cảnh báo',
    description:
      'Lấy danh sách tất cả danh mục cảnh báo với phân trang, tìm kiếm và lọc trạng thái. Yêu cầu quyền `warning-category.list`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Giới hạn số lượng bản ghi',
    example: 20,
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
    description: 'Từ khóa tìm kiếm theo tên danh mục',
    example: 'vi phạm',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Lọc theo trạng thái chữ',
    example: 'active',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái kích hoạt',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách danh mục cảnh báo thành công',
    schema: buildSuccessResponseSchema({
      code: 'warning-category.list',
      message: 'Lấy danh sách danh mục cảnh báo thành công',
      dataSchema: buildPaginationDataSchema(warningCategorySchema),
      dataExample: {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Vi phạm chính sách',
            description:
              'Danh mục cho các vi phạm liên quan đến chính sách sử dụng',
            severity: 5,
            is_active: true,
            created_at: '2026-03-13T09:30:00.000Z',
            updated_at: '2026-03-13T10:00:00.000Z',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      },
    }),
  })
  @ApiAuthResponses()
  async findMany(
    @Query() query: QueryWarningCategoryDto,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.findMany(query, lang);
    return new GetResponse('warning-category.list', result);
  }

  @Get('all')
  @RequirePermission('warning-category.list')
  @ApiOperation({
    summary: 'Lấy tất cả danh mục active cho dropdown',
    description:
      'Lấy toàn bộ danh mục cảnh báo đang active để hiển thị trong dropdown hoặc form lựa chọn. Yêu cầu quyền `warning-category.list`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách danh mục active thành công',
    schema: buildSuccessResponseSchema({
      code: 'warning-category.list.all',
      message: 'Lấy danh sách danh mục active thành công',
      dataSchema: {
        type: 'array',
        items: warningCategorySchema,
      },
      dataExample: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Vi phạm chính sách',
          description:
            'Danh mục cho các vi phạm liên quan đến chính sách sử dụng',
          severity: 5,
          is_active: true,
          created_at: '2026-03-13T09:30:00.000Z',
          updated_at: '2026-03-13T10:00:00.000Z',
        },
      ],
    }),
  })
  @ApiAuthResponses()
  async findAllActive(@I18nLang() lang: string) {
    const items = await this.service.findAllActive(lang);
    return new GetResponse('warning-category.list.all', items);
  }

  @Get(':id')
  @RequirePermission('warning-category.list')
  @ApiOperation({
    summary: 'Lấy chi tiết danh mục cảnh báo',
    description:
      'Lấy thông tin chi tiết của một danh mục cảnh báo theo ID. Yêu cầu quyền `warning-category.list`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID danh mục cảnh báo',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết danh mục cảnh báo thành công',
    schema: buildSuccessResponseSchema({
      code: 'warning-category.read',
      message: 'Lấy chi tiết danh mục cảnh báo thành công',
      dataSchema: warningCategorySchema,
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Vi phạm chính sách',
        description:
          'Danh mục cho các vi phạm liên quan đến chính sách sử dụng',
        severity: 5,
        is_active: true,
        created_at: '2026-03-13T09:30:00.000Z',
        updated_at: '2026-03-13T10:00:00.000Z',
      },
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy danh mục cảnh báo',
    schema: buildErrorResponseSchema({
      code: 'warning-category.not_found',
      message: 'Không tìm thấy danh mục cảnh báo',
    }),
  })
  @ApiAuthResponses()
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ) {
    const category = await this.service.findById(id, lang);
    return new GetResponse('warning-category.read', category);
  }

  @Put(':id')
  @RequirePermission('warning-category.update')
  @ApiOperation({
    summary: 'Cập nhật danh mục cảnh báo',
    description:
      'Cập nhật một phần hoặc toàn bộ thông tin danh mục cảnh báo. Chỉ các trường được gửi trong request body mới được thay đổi. Yêu cầu quyền `warning-category.update`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID danh mục cảnh báo',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: UpdateWarningCategoryDto,
    description: 'Dữ liệu cập nhật danh mục cảnh báo',
    examples: {
      rename_category: {
        summary: 'Đổi tên danh mục',
        description: 'Chỉ cập nhật tên danh mục',
        value: {
          name: 'Vi phạm nội quy kho',
        },
      },
      update_full: {
        summary: 'Cập nhật đầy đủ',
        description:
          'Cập nhật tên, mô tả, mức độ nghiêm trọng và trạng thái active',
        value: {
          name: 'Vi phạm chính sách',
          description: 'Danh mục cho các trường hợp vi phạm nghiêm trọng',
          severity: 4,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật danh mục cảnh báo thành công',
    schema: buildSuccessResponseSchema({
      code: 'warning-category.update',
      message: 'Cập nhật danh mục cảnh báo thành công',
      dataSchema: warningCategorySchema,
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Vi phạm nội quy kho',
        description: 'Danh mục cho các trường hợp vi phạm nghiêm trọng',
        severity: 4,
        is_active: true,
        created_at: '2026-03-13T09:30:00.000Z',
        updated_at: '2026-03-13T10:00:00.000Z',
      },
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy danh mục cảnh báo',
    schema: buildErrorResponseSchema({
      code: 'warning-category.not_found',
      message: 'Không tìm thấy danh mục cảnh báo',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Tên danh mục cảnh báo bị trùng',
    schema: buildErrorResponseSchema({
      code: 'warning-category.name_conflict',
      message: 'Tên danh mục cảnh báo đã tồn tại trong hệ thống',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarningCategoryDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
    @Req() req: Request,
  ) {
    const category = await this.service.update(id, dto, userId, lang, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return new UpdatedResponse('warning-category.update', category);
  }

  @Delete(':id')
  @RequirePermission('warning-category.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa danh mục cảnh báo',
    description:
      'Soft delete một danh mục cảnh báo theo ID. Yêu cầu quyền `warning-category.delete`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID danh mục cảnh báo',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa danh mục cảnh báo thành công',
    schema: buildSuccessResponseSchema({
      code: 'warning-category.delete',
      message: 'Xóa danh mục cảnh báo thành công',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy danh mục cảnh báo',
    schema: buildErrorResponseSchema({
      code: 'warning-category.not_found',
      message: 'Không tìm thấy danh mục cảnh báo',
    }),
  })
  @ApiAuthResponses()
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
    @Req() req: Request,
  ) {
    await this.service.delete(id, userId, lang, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return new DeletedResponse('warning-category.delete');
  }

  @Delete()
  @RequirePermission('warning-category.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa nhiều danh mục cảnh báo',
    description:
      'Xóa mềm nhiều danh mục cảnh báo cùng lúc theo danh sách ID. Yêu cầu quyền `warning-category.delete`.',
  })
  @ApiBody({
    type: DeleteManyWarningCategoryDto,
    description: 'Danh sách ID danh mục cảnh báo cần xóa',
    examples: {
      delete_many: {
        summary: 'Xóa nhiều danh mục',
        description: 'Ví dụ xóa 2 danh mục cảnh báo cùng lúc',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều danh mục cảnh báo thành công',
    schema: buildSuccessResponseSchema({
      code: 'warning-category.delete-many',
      message: 'Xóa nhiều danh mục cảnh báo thành công',
      dataSchema: {
        type: 'object',
        properties: {
          count: { type: 'number', example: 2 },
        },
      },
      dataExample: {
        count: 2,
      },
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async deleteMany(
    @Body() dto: DeleteManyWarningCategoryDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
    @Req() req: Request,
  ) {
    const count = await this.service.deleteMany(dto.ids, userId, lang, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return new DeletedResponse('warning-category.delete-many', { count });
  }
}
