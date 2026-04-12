import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DatabaseAdminGuard } from './guards/database-admin.guard';
import { DatabaseAdminService } from './database-admin.service';
import { ApiAuthResponses } from '../../common/decorators';
import {
  buildErrorResponseSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/swagger-response.helper';
import {
  CreatedResponse,
  DeletedResponse,
  GetResponse,
  OkResponse,
  UpdatedResponse,
} from '../../common/responses/success.response';

export interface FilterCondition {
  column: string;
  operator:
    | 'equals'
    | 'not'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'in'
    | 'isNull'
    | 'isNotNull';
  value?: any;
}

export interface BatchChanges {
  created: any[];
  updated: { id: string; data: any }[];
  deleted: string[];
}

const tableItemSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Tên bảng trong database',
      example: 'user',
    },
    displayName: {
      type: 'string',
      description: 'Tên hiển thị để render trên giao diện admin',
      example: 'User',
    },
  },
};

const tableStatisticsSchema = {
  type: 'object',
  properties: {
    tableName: { type: 'string', description: 'Tên bảng', example: 'user' },
    rowCount: {
      type: 'number',
      description: 'Số lượng record hiện có',
      example: 1520,
    },
    columnCount: {
      type: 'number',
      description: 'Số lượng cột trong bảng',
      example: 18,
    },
    sizeBytes: {
      type: 'number',
      description: 'Dung lượng bảng tính theo byte',
      example: 245760,
    },
    lastUpdated: {
      type: 'string',
      format: 'date-time',
      description: 'Thời điểm hệ thống tổng hợp số liệu gần nhất',
      example: '2026-03-13T10:30:00.000Z',
    },
  },
};

const tableFieldSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Tên field', example: 'email' },
    type: {
      type: 'string',
      description: 'Kiểu dữ liệu Prisma',
      example: 'String',
    },
    isRequired: {
      type: 'boolean',
      description: 'Field bắt buộc',
      example: true,
    },
    isList: { type: 'boolean', description: 'Field là mảng', example: false },
    isId: {
      type: 'boolean',
      description: 'Field là khóa chính',
      example: false,
    },
    isUnique: {
      type: 'boolean',
      description: 'Field có unique constraint',
      example: true,
    },
    hasDefaultValue: {
      type: 'boolean',
      description: 'Field có giá trị mặc định',
      example: false,
    },
    isRelation: {
      type: 'boolean',
      description: 'Field là relation',
      example: false,
    },
    enumValues: {
      type: 'array',
      nullable: true,
      description: 'Danh sách giá trị enum nếu field là enum',
      items: { type: 'string' },
      example: ['ACTIVE', 'INACTIVE'],
    },
  },
};

const relationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'rentalContract_user_id_user_id' },
    sourceTable: { type: 'string', example: 'rentalContract' },
    sourceField: { type: 'string', example: 'user_id' },
    targetTable: { type: 'string', example: 'user' },
    targetField: { type: 'string', example: 'id' },
    type: { type: 'string', example: 'one-to-many' },
  },
};

const tableSchemaResponse = {
  type: 'object',
  properties: {
    tableName: { type: 'string', example: 'user' },
    displayName: { type: 'string', example: 'User' },
    sensitiveFields: {
      type: 'array',
      items: { type: 'string' },
      example: ['password', 'two_factor_token'],
    },
    fields: {
      type: 'array',
      items: tableFieldSchema,
    },
  },
};

const recordsResponseSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      description:
        'Danh sách record đã được serialize và ẩn field nhạy cảm nếu có',
      items: {
        type: 'object',
        additionalProperties: true,
      },
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          email: 'user@genhub.vn',
          full_name: 'Nguyễn Văn A',
          created_at: '2026-03-13T10:00:00.000Z',
        },
      ],
    },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 120 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        totalPages: { type: 'number', example: 6 },
      },
    },
  },
};

const diagramTableSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'user' },
    displayName: { type: 'string', example: 'User' },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'id' },
          type: { type: 'string', example: 'String' },
          isId: { type: 'boolean', example: true },
          isRequired: { type: 'boolean', example: true },
          isUnique: { type: 'boolean', example: true },
          isList: { type: 'boolean', example: false },
          hasDefaultValue: { type: 'boolean', example: true },
        },
      },
    },
  },
};

const diagramConfigSchema = {
  type: 'object',
  properties: {
    node_positions: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          x: { type: 'number', example: 120 },
          y: { type: 'number', example: 240 },
        },
      },
    },
    table_colors: {
      type: 'object',
      additionalProperties: { type: 'string', example: '#0F766E' },
    },
    show_relations: { type: 'boolean', example: true },
    dark_mode: { type: 'boolean', example: true },
  },
};

const saveDiagramConfigSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    config: diagramConfigSchema,
  },
};

const batchResultSchema = {
  type: 'object',
  properties: {
    created: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
    },
    updated: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
    },
    deleted: {
      type: 'array',
      items: { type: 'string' },
    },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', example: 'update' },
          id: {
            type: 'string',
            nullable: true,
            example: '550e8400-e29b-41d4-a716-446655440001',
          },
          error: { type: 'string', example: 'Record not found' },
        },
      },
    },
  },
};

const bulkDeleteResultSchema = {
  type: 'object',
  properties: {
    deleted: {
      type: 'array',
      items: { type: 'string' },
      example: ['550e8400-e29b-41d4-a716-446655440001'],
    },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: '550e8400-e29b-41d4-a716-446655440099',
          },
          error: { type: 'string', example: 'Record not found' },
        },
      },
    },
  },
};

const rawQuerySelectResultSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
      example: [
        { id: '550e8400-e29b-41d4-a716-446655440001', email: 'user@genhub.vn' },
      ],
    },
    columns: {
      type: 'array',
      items: { type: 'string' },
      example: ['id', 'email'],
    },
    executionTime: { type: 'number', example: 12 },
  },
};

@ApiTags('Database')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, DatabaseAdminGuard)
export class DatabaseAdminController {
  constructor(private readonly databaseAdminService: DatabaseAdminService) {}

  @Get('tables')
  @ApiOperation({
    summary: 'Lấy danh sách các bảng có thể quản trị',
    description:
      'Trả về danh sách các bảng trong database mà Database Admin được phép xem và thao tác trên giao diện quản trị. Endpoint này hữu ích để dựng sidebar, dropdown chọn bảng và kiểm tra phạm vi dữ liệu có thể quản lý.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bảng thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.tables',
      message: 'Lấy danh sách bảng thành công',
      dataSchema: { type: 'array', items: tableItemSchema },
      dataExample: [
        { name: 'user', displayName: 'User' },
        { name: 'organization', displayName: 'Organization' },
      ],
    }),
  })
  @ApiAuthResponses()
  async getTables() {
    return new GetResponse(
      'database.tables',
      await this.databaseAdminService.getTables(),
      'Lấy danh sách bảng thành công',
    );
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Lấy thống kê tổng quan database',
    description:
      'Tổng hợp thống kê số lượng record, số cột, dung lượng lưu trữ và thời điểm hệ thống tính toán gần nhất cho tất cả bảng có thể quản trị. Dùng để hiển thị dashboard database admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê database thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.statistics',
      message: 'Lấy thống kê database thành công',
      dataSchema: { type: 'array', items: tableStatisticsSchema },
      dataExample: [
        {
          tableName: 'user',
          rowCount: 1520,
          columnCount: 18,
          sizeBytes: 245760,
          lastUpdated: '2026-03-13T10:30:00.000Z',
        },
      ],
    }),
  })
  @ApiAuthResponses()
  async getStatistics() {
    return new GetResponse(
      'database.statistics',
      await this.databaseAdminService.getStatistics(),
      'Lấy thống kê database thành công',
    );
  }

  @Get('tables/:tableName/schema')
  @ApiOperation({
    summary: 'Lấy schema chi tiết của một bảng',
    description:
      'Trả về cấu trúc schema của bảng bao gồm danh sách field, kiểu dữ liệu, cờ bắt buộc, unique, relation và các field nhạy cảm cần che khi hiển thị. Dùng để dựng form động hoặc bảng dữ liệu tổng quát.',
  })
  @ApiParam({
    name: 'tableName',
    required: true,
    description:
      'Tên bảng cần xem schema. Giá trị phải thuộc danh sách bảng được hệ thống cho phép quản trị.',
    example: 'user',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy schema bảng thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.table_schema',
      message: 'Lấy schema bảng thành công',
      dataSchema: tableSchemaResponse,
      dataExample: {
        tableName: 'user',
        displayName: 'User',
        sensitiveFields: ['password', 'two_factor_token'],
        fields: [
          {
            name: 'email',
            type: 'String',
            isRequired: true,
            isList: false,
            isId: false,
            isUnique: true,
            hasDefaultValue: false,
            isRelation: false,
          },
        ],
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'Tên bảng không hợp lệ hoặc không được phép thao tác',
    schema: buildErrorResponseSchema({
      code: 'database.invalid_table',
      message: 'Bảng không tồn tại hoặc không được phép thao tác',
    }),
  })
  @ApiAuthResponses()
  async getTableSchema(@Param('tableName') tableName: string) {
    return new GetResponse(
      'database.table_schema',
      await this.databaseAdminService.getTableSchema(tableName),
      'Lấy schema bảng thành công',
    );
  }

  @Get('tables/:tableName')
  @ApiOperation({
    summary: 'Lấy danh sách record của một bảng',
    description:
      'Lấy dữ liệu của bảng với phân trang, sắp xếp và bộ lọc động. Query `filters` nhận JSON array các điều kiện lọc theo cột, toán tử và giá trị để hỗ trợ màn hình quản trị dữ liệu tổng quát.',
  })
  @ApiParam({
    name: 'tableName',
    required: true,
    description: 'Tên bảng cần lấy dữ liệu',
    example: 'user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Số trang hiện tại, bắt đầu từ 1. Mặc định là 1.',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng record trên mỗi trang. Mặc định là 20.',
    example: 20,
  })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    type: String,
    description: 'Tên cột dùng để sắp xếp dữ liệu.',
    example: 'created_at',
  })
  @ApiQuery({
    name: 'orderDirection',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Chiều sắp xếp. Nếu không truyền thì mặc định là `desc`.',
    example: 'desc',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    type: String,
    description:
      'JSON string biểu diễn mảng điều kiện lọc. Ví dụ: `[{\"column\":\"email\",\"operator\":\"contains\",\"value\":\"genhub\"}]`.',
    example: '[{"column":"email","operator":"contains","value":"genhub"}]',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách record thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.records',
      message: 'Lấy danh sách record thành công',
      dataSchema: recordsResponseSchema,
      dataExample: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            email: 'user@genhub.vn',
            full_name: 'Nguyễn Văn A',
          },
        ],
        meta: { total: 120, page: 1, limit: 20, totalPages: 6 },
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description:
      'Tên bảng không hợp lệ hoặc chuỗi filters không đúng định dạng',
    schema: buildErrorResponseSchema({
      code: 'database.invalid_request',
      message: 'Bảng không hợp lệ hoặc bộ lọc không đúng định dạng',
    }),
  })
  @ApiAuthResponses()
  async getRecords(
    @Param('tableName') tableName: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDirection') orderDirection?: 'asc' | 'desc',
    @Query('search') search?: string,
    @Query('filters') filters?: string,
  ) {
    let parsedFilters: FilterCondition[] | undefined;
    if (filters) {
      try {
        parsedFilters = JSON.parse(filters);
      } catch {
        parsedFilters = undefined;
      }
    }

    const result = await this.databaseAdminService.getRecords(tableName, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      orderBy,
      orderDirection,
      search,
      filters: parsedFilters,
    });

    return new GetResponse(
      'database.records',
      result,
      'Lấy danh sách record thành công',
    );
  }

  @Get('tables/:tableName/:id')
  @ApiOperation({
    summary: 'Lấy chi tiết một record theo ID',
    description:
      'Trả về dữ liệu chi tiết của một record trong bảng tương ứng. Dùng để xem chi tiết hoặc nạp dữ liệu vào form chỉnh sửa trên trang admin.',
  })
  @ApiParam({
    name: 'tableName',
    required: true,
    description: 'Tên bảng chứa record cần lấy',
    example: 'user',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID của record cần xem chi tiết',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết record thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.record',
      message: 'Lấy chi tiết record thành công',
      dataSchema: { type: 'object', additionalProperties: true },
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'user@genhub.vn',
        full_name: 'Nguyễn Văn A',
      },
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy record theo ID',
    schema: buildErrorResponseSchema({
      code: 'database.record_not_found',
      message: 'Không tìm thấy record',
    }),
  })
  @ApiAuthResponses()
  async getRecord(
    @Param('tableName') tableName: string,
    @Param('id') id: string,
  ) {
    return new GetResponse(
      'database.record',
      await this.databaseAdminService.getRecord(tableName, id),
      'Lấy chi tiết record thành công',
    );
  }

  @Post('tables/:tableName')
  @ApiOperation({
    summary: 'Tạo mới một record trong bảng',
    description:
      'Tạo record mới trong bảng được chỉ định. Body nhận object dữ liệu động theo schema của bảng. Tất cả thao tác tạo đều được ghi log để phục vụ audit.',
  })
  @ApiParam({
    name: 'tableName',
    required: true,
    description: 'Tên bảng cần tạo record mới',
    example: 'user',
  })
  @ApiBody({
    description:
      'Dữ liệu record cần tạo. Chỉ gửi các field hợp lệ theo schema của bảng.',
    examples: {
      create_user: {
        summary: 'Tạo record user',
        description: 'Ví dụ tạo một user mới trong bảng `user`.',
        value: {
          email: 'new-user@genhub.vn',
          full_name: 'Nguyễn Văn B',
        },
      },
      create_tag: {
        summary: 'Tạo record bảng đơn giản',
        description: 'Ví dụ tạo một record chỉ có vài field cơ bản.',
        value: {
          name: 'Khách hàng VIP',
          slug: 'khach-hang-vip',
        },
      },
    },
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo record thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.record_created',
      message: 'Tạo record thành công',
      dataSchema: { type: 'object', additionalProperties: true },
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'new-user@genhub.vn',
        full_name: 'Nguyễn Văn B',
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu tạo mới không hợp lệ',
    schema: buildErrorResponseSchema({
      code: 'database.create_invalid',
      message: 'Dữ liệu tạo mới không hợp lệ',
    }),
  })
  @ApiAuthResponses()
  async createRecord(
    @Param('tableName') tableName: string,
    @Body() data: any,
    @Req() req: Request,
  ) {
    const context = this.extractContext(req);
    return new CreatedResponse(
      'database.record_created',
      await this.databaseAdminService.createRecord(tableName, data, context),
      'Tạo record thành công',
    );
  }

  @Post('tables/:tableName/batch')
  @ApiOperation({
    summary: 'Thực hiện batch create, update, delete',
    description:
      'Thực hiện nhiều thao tác tạo, cập nhật và xóa trong cùng một transaction. Kết quả trả về phân tách rõ danh sách thành công và lỗi để giao diện admin có thể hiển thị trạng thái từng item.',
  })
  @ApiParam({
    name: 'tableName',
    required: true,
    description: 'Tên bảng cần thao tác hàng loạt',
    example: 'user',
  })
  @ApiBody({
    description: 'Danh sách thay đổi cần thực hiện trong một transaction.',
    examples: {
      mixed_changes: {
        summary: 'Tạo, cập nhật và xóa cùng lúc',
        value: {
          created: [{ full_name: 'Nguyễn Văn C' }],
          updated: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              data: { full_name: 'Nguyễn Văn A cập nhật' },
            },
          ],
          deleted: ['550e8400-e29b-41d4-a716-446655440099'],
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        created: { type: 'array', items: { type: 'object' } },
        updated: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              data: { type: 'object' },
            },
          },
        },
        deleted: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Batch update thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.batch_update',
      message: 'Thực hiện batch update thành công',
      dataSchema: batchResultSchema,
      dataExample: {
        created: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            full_name: 'Nguyễn Văn C',
          },
        ],
        updated: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            full_name: 'Nguyễn Văn A cập nhật',
          },
        ],
        deleted: ['550e8400-e29b-41d4-a716-446655440099'],
        errors: [],
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'Payload batch không hợp lệ hoặc chứa dữ liệu không thể xử lý',
    schema: buildErrorResponseSchema({
      code: 'database.batch_invalid',
      message: 'Dữ liệu batch không hợp lệ',
    }),
  })
  @ApiAuthResponses()
  async batchUpdate(
    @Param('tableName') tableName: string,
    @Body() changes: BatchChanges,
    @Req() req: Request,
  ) {
    const context = this.extractContext(req);
    return new OkResponse(
      'database.batch_update',
      await this.databaseAdminService.batchUpdate(tableName, changes, context),
      'Thực hiện batch update thành công',
    );
  }

  @Delete('tables/:tableName/bulk')
  @ApiOperation({
    summary: 'Xóa nhiều record theo danh sách ID',
    description:
      'Xóa nhiều record của cùng một bảng trong một lần gọi API. Kết quả trả về danh sách ID đã xóa thành công và danh sách lỗi phát sinh để hỗ trợ audit và phản hồi trên UI.',
  })
  @ApiParam({
    name: 'tableName',
    required: true,
    description: 'Tên bảng cần xóa dữ liệu hàng loạt',
    example: 'user',
  })
  @ApiBody({
    description: 'Danh sách ID cần xóa.',
    examples: {
      delete_many: {
        summary: 'Xóa nhiều record',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
          ],
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều record thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.bulk_delete',
      message: 'Xóa nhiều record thành công',
      dataSchema: bulkDeleteResultSchema,
      dataExample: {
        deleted: ['550e8400-e29b-41d4-a716-446655440001'],
        errors: [
          {
            id: '550e8400-e29b-41d4-a716-446655440099',
            error: 'Record not found',
          },
        ],
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'Danh sách ID trống hoặc dữ liệu không hợp lệ',
    schema: buildErrorResponseSchema({
      code: 'database.bulk_delete_invalid',
      message: 'Danh sách ID cần xóa không hợp lệ',
    }),
  })
  @ApiAuthResponses()
  async bulkDelete(
    @Param('tableName') tableName: string,
    @Body() body: { ids: string[] },
    @Req() req: Request,
  ) {
    const context = this.extractContext(req);
    return new DeletedResponse(
      'database.bulk_delete',
      await this.databaseAdminService.bulkDelete(tableName, body.ids, context),
      'Xóa nhiều record thành công',
    );
  }

  @Put('tables/:tableName/:id')
  @ApiOperation({
    summary: 'Cập nhật một record theo ID',
    description:
      'Cập nhật một phần dữ liệu của record. Chỉ các field được gửi trong body mới được thay đổi, các field khác sẽ giữ nguyên. Hệ thống ghi log trước và sau cập nhật để phục vụ audit.',
  })
  @ApiParam({
    name: 'tableName',
    required: true,
    description: 'Tên bảng chứa record cần cập nhật',
    example: 'user',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID của record cần cập nhật',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    description: 'Dữ liệu cần cập nhật một phần.',
    examples: {
      update_user_name: {
        summary: 'Cập nhật tên hiển thị',
        value: { full_name: 'Nguyễn Văn A cập nhật' },
      },
      update_status: {
        summary: 'Cập nhật trạng thái',
        value: { status: 'ACTIVE' },
      },
    },
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật record thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.record_updated',
      message: 'Cập nhật record thành công',
      dataSchema: { type: 'object', additionalProperties: true },
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        full_name: 'Nguyễn Văn A cập nhật',
      },
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy record cần cập nhật',
    schema: buildErrorResponseSchema({
      code: 'database.record_not_found',
      message: 'Không tìm thấy record cần cập nhật',
    }),
  })
  @ApiAuthResponses()
  async updateRecord(
    @Param('tableName') tableName: string,
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: Request,
  ) {
    const context = this.extractContext(req);
    return new UpdatedResponse(
      'database.record_updated',
      await this.databaseAdminService.updateRecord(
        tableName,
        id,
        data,
        context,
      ),
      'Cập nhật record thành công',
    );
  }

  @Delete('tables/:tableName/:id')
  @ApiOperation({
    summary: 'Xóa một record theo ID',
    description:
      'Xóa một record cụ thể trong bảng. Thao tác này được ghi log để phục vụ audit và truy vết lịch sử chỉnh sửa dữ liệu.',
  })
  @ApiParam({
    name: 'tableName',
    required: true,
    description: 'Tên bảng chứa record cần xóa',
    example: 'user',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID của record cần xóa',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa record thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.record_deleted',
      message: 'Xóa record thành công',
      dataSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: {
            type: 'string',
            example:
              'Record 550e8400-e29b-41d4-a716-446655440001 deleted from user',
          },
        },
      },
      dataExample: {
        success: true,
        message:
          'Record 550e8400-e29b-41d4-a716-446655440001 deleted from user',
      },
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy record cần xóa',
    schema: buildErrorResponseSchema({
      code: 'database.record_not_found',
      message: 'Không tìm thấy record cần xóa',
    }),
  })
  @ApiAuthResponses()
  async deleteRecord(
    @Param('tableName') tableName: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const context = this.extractContext(req);
    return new DeletedResponse(
      'database.record_deleted',
      await this.databaseAdminService.deleteRecord(tableName, id, context),
      'Xóa record thành công',
    );
  }

  @Get('diagram/schema')
  @ApiOperation({
    summary: 'Lấy schema ER diagram',
    description:
      'Trả về cấu trúc schema đầy đủ để vẽ ER diagram, bao gồm danh sách bảng, các field chính và quan hệ giữa các bảng. Dùng cho màn hình trực quan hóa database.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy schema ER diagram thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.diagram_schema',
      message: 'Lấy schema ER diagram thành công',
      dataSchema: {
        type: 'object',
        properties: {
          tables: { type: 'array', items: diagramTableSchema },
          relations: { type: 'array', items: relationSchema },
        },
      },
      dataExample: {
        tables: [
          {
            name: 'user',
            displayName: 'User',
            fields: [
              {
                name: 'id',
                type: 'String',
                isId: true,
                isRequired: true,
                isUnique: true,
                isList: false,
                hasDefaultValue: true,
              },
            ],
          },
        ],
        relations: [
          {
            id: 'rentalContract_user_id_user_id',
            sourceTable: 'rentalContract',
            sourceField: 'user_id',
            targetTable: 'user',
            targetField: 'id',
            type: 'one-to-many',
          },
        ],
      },
    }),
  })
  @ApiAuthResponses()
  async getDiagramSchema() {
    return new GetResponse(
      'database.diagram_schema',
      await this.databaseAdminService.getDiagramSchema(),
      'Lấy schema ER diagram thành công',
    );
  }

  @Get('diagram/config')
  @ApiOperation({
    summary: 'Lấy cấu hình ER diagram đã lưu',
    description:
      'Lấy cấu hình layout diagram đã lưu của user hiện tại theo tên cấu hình. Nếu không tìm thấy, hệ thống trả về cấu hình mặc định để giao diện có thể render ngay.',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description:
      'Tên cấu hình diagram cần lấy. Nếu bỏ trống, hệ thống dùng giá trị `default`.',
    example: 'default',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy cấu hình diagram thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.diagram_config',
      message: 'Lấy cấu hình diagram thành công',
      dataSchema: diagramConfigSchema,
      dataExample: {
        node_positions: { user: { x: 120, y: 240 } },
        table_colors: { user: '#0F766E' },
        show_relations: true,
        dark_mode: true,
      },
    }),
  })
  @ApiAuthResponses()
  async getDiagramConfig(@Req() req: Request, @Query('name') name?: string) {
    const user = req.user as any;
    return new GetResponse(
      'database.diagram_config',
      await this.databaseAdminService.getDiagramConfig(user.userId, name),
      'Lấy cấu hình diagram thành công',
    );
  }

  @Put('diagram/config')
  @ApiOperation({
    summary: 'Lưu cấu hình ER diagram',
    description:
      'Lưu layout, màu sắc và các tùy chỉnh hiển thị của ER diagram cho user hiện tại để sử dụng lại ở các lần truy cập sau.',
  })
  @ApiBody({
    description: 'Cấu hình diagram cần lưu.',
    examples: {
      save_layout: {
        summary: 'Lưu layout mặc định',
        value: {
          name: 'default',
          node_positions: {
            user: { x: 120, y: 240 },
            organization: { x: 480, y: 240 },
          },
          table_colors: {
            user: '#0F766E',
            organization: '#0EA5E9',
          },
          show_relations: true,
          dark_mode: false,
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Tên cấu hình',
          example: 'default',
        },
        node_positions: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
            },
          },
        },
        table_colors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        show_relations: { type: 'boolean', example: true },
        dark_mode: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Lưu cấu hình diagram thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.diagram_config_saved',
      message: 'Lưu cấu hình diagram thành công',
      dataSchema: saveDiagramConfigSchema,
      dataExample: {
        success: true,
        config: {
          node_positions: { user: { x: 120, y: 240 } },
          table_colors: { user: '#0F766E' },
          show_relations: true,
          dark_mode: false,
        },
      },
    }),
  })
  @ApiAuthResponses()
  async saveDiagramConfig(
    @Req() req: Request,
    @Body()
    config: {
      name?: string;
      node_positions?: Record<string, { x: number; y: number }>;
      table_colors?: Record<string, string>;
      show_relations?: boolean;
      dark_mode?: boolean;
    },
  ) {
    const user = req.user as any;
    return new UpdatedResponse(
      'database.diagram_config_saved',
      await this.databaseAdminService.saveDiagramConfig(user.userId, config),
      'Lưu cấu hình diagram thành công',
    );
  }

  @Post('query/execute')
  @ApiOperation({
    summary: 'Thực thi raw SQL query',
    description:
      'Cho phép Database Admin chạy câu lệnh SQL trực tiếp trên hệ thống. Đây là endpoint nguy hiểm, chỉ nên dùng khi cần kiểm tra hoặc xử lý dữ liệu đặc biệt. Mọi truy vấn đều được ghi log để audit.',
  })
  @ApiBody({
    description: 'Câu lệnh SQL cần thực thi.',
    examples: {
      select_query: {
        summary: 'Truy vấn SELECT an toàn',
        value: { query: 'SELECT id, email FROM "User" LIMIT 10' },
      },
      aggregate_query: {
        summary: 'Truy vấn tổng hợp',
        value: { query: 'SELECT COUNT(*) AS total_users FROM "User"' },
      },
    },
    schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Câu lệnh SQL cần thực thi',
          example: 'SELECT id, email FROM "User" LIMIT 10',
        },
      },
      required: ['query'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thực thi query thành công',
    schema: buildSuccessResponseSchema({
      code: 'database.query_executed',
      message: 'Thực thi query thành công',
      dataSchema: rawQuerySelectResultSchema,
      dataExample: {
        success: true,
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            email: 'user@genhub.vn',
          },
        ],
        columns: ['id', 'email'],
        executionTime: 12,
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'Query trống, sai cú pháp hoặc bị hệ thống từ chối',
    schema: buildErrorResponseSchema({
      code: 'database.query_invalid',
      message: 'Query không hợp lệ hoặc không được phép thực thi',
    }),
  })
  @ApiAuthResponses()
  async executeRawQuery(@Body() body: { query: string }, @Req() req: Request) {
    const context = this.extractContext(req);
    return new OkResponse(
      'database.query_executed',
      await this.databaseAdminService.executeRawQuery(body.query, context),
      'Thực thi query thành công',
    );
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
