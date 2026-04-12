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
  ApiHeader,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { UnitService } from './unit.service';
import { CreateUnitDto, UpdateUnitDto, QueryUnitDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { CombinedAuthGuard, OrgPermissionGuard } from '../../common/guards';
import { CurrentActor, RequireOrgPermission } from '../../common/decorators';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators/api-common-responses.decorator';
import {
  CreatedResponse,
  UpdatedResponse,
  GetResponse,
  DeletedResponse,
  ResponseCode,
} from '../../common/responses';
import { IUnit, IPaginatedResponse } from './interfaces';

@ApiTags('Units')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'X-API-Key',
  description: 'API Key for authentication (alternative to JWT)',
  required: false,
})
@Controller('organizations/:orgId/units')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
export class UnitController {
  constructor(private readonly service: UnitService) {}

  @Post()
  @RequireOrgPermission('unit.create')
  @ApiOperation({
    summary: 'Tạo đơn vị tính mới',
    description:
      'Tạo một đơn vị tính mới trong tổ chức. Tên đơn vị tính phải duy nhất (không phân biệt hoa thường) trong tổ chức. Yêu cầu quyền `unit.create`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: CreateUnitDto,
    description: 'Thông tin đơn vị tính cần tạo',
    examples: {
      basic: {
        summary: 'Tạo đơn vị tính cơ bản',
        description: 'Ví dụ tạo đơn vị tính với thông tin đầy đủ',
        value: {
          name: 'Kilogram',
          description: 'Đơn vị đo khối lượng',
          is_used_multiple_languages: false,
          is_active: true,
        },
      },
      minimal: {
        summary: 'Tạo với thông tin tối thiểu',
        description: 'Ví dụ tạo đơn vị tính chỉ với trường bắt buộc',
        value: {
          name: 'Cái',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo đơn vị tính thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.create_success' },
        message: { type: 'string', example: 'Tạo đơn vị tính thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            organization_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', nullable: true, example: 'Kilogram' },
            description: {
              type: 'string',
              nullable: true,
              example: 'Đơn vị đo khối lượng',
            },
            is_used_multiple_languages: { type: 'boolean', example: false },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-01T09:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-01T09:00:00.000Z',
            },
            is_deleted: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tổ chức',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.organization_not_found' },
        message: { type: 'string', example: 'Không tìm thấy tổ chức' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên đơn vị tính đã tồn tại trong tổ chức',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.name_exists' },
        message: {
          type: 'string',
          example: 'Tên đơn vị tính đã tồn tại trong tổ chức',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateUnitDto,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IUnit>> {
    const result = await this.service.create(orgId, dto, actorId, lang);
    return new CreatedResponse(ResponseCode.UNIT_CREATE_SUCCESS, result);
  }

  @Get()
  @RequireOrgPermission('unit.list')
  @ApiOperation({
    summary: 'Lấy danh sách đơn vị tính',
    description:
      'Lấy danh sách đơn vị tính của tổ chức với hỗ trợ phân trang và tìm kiếm. Có thể lọc theo trạng thái hoạt động. Yêu cầu quyền `unit.list`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng bản ghi tối đa trả về (mặc định: 20)',
    type: Number,
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Vị trí bắt đầu lấy dữ liệu (mặc định: 0)',
    type: Number,
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    description: 'Từ khóa tìm kiếm (tên, mô tả)',
    type: String,
    example: 'kg',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    description: 'Lọc theo trạng thái hoạt động',
    type: Boolean,
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách đơn vị tính thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.list_success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách đơn vị tính thành công',
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
                  organization_id: { type: 'string', format: 'uuid' },
                  name: { type: 'string', nullable: true },
                  description: { type: 'string', nullable: true },
                  is_used_multiple_languages: { type: 'boolean' },
                  is_active: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  is_deleted: { type: 'boolean' },
                },
              },
            },
            total: { type: 'number', example: 10 },
            limit: { type: 'number', example: 20 },
            offset: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async findMany(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: QueryUnitDto,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IPaginatedResponse<IUnit>>> {
    const result = await this.service.findMany(orgId, query, lang);
    return new GetResponse(ResponseCode.UNIT_LIST_SUCCESS, result);
  }

  @Get(':id')
  @RequireOrgPermission('unit.read')
  @ApiOperation({
    summary: 'Lấy chi tiết đơn vị tính',
    description:
      'Lấy thông tin chi tiết của một đơn vị tính theo ID. Yêu cầu quyền `unit.read`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của đơn vị tính (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin đơn vị tính thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.get_success' },
        message: {
          type: 'string',
          example: 'Lấy thông tin đơn vị tính thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            organization_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', nullable: true, example: 'Kilogram' },
            description: {
              type: 'string',
              nullable: true,
              example: 'Đơn vị đo khối lượng',
            },
            is_used_multiple_languages: { type: 'boolean', example: false },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-01T09:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-01T09:00:00.000Z',
            },
            is_deleted: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn vị tính',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.not_found' },
        message: { type: 'string', example: 'Không tìm thấy đơn vị tính' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  async findById(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IUnit>> {
    const result = await this.service.findById(orgId, id, lang);
    return new GetResponse(ResponseCode.UNIT_GET_SUCCESS, result);
  }

  @Put(':id')
  @RequireOrgPermission('unit.update')
  @ApiOperation({
    summary: 'Cập nhật đơn vị tính',
    description:
      'Cập nhật thông tin đơn vị tính. Tất cả các trường đều tùy chọn, chỉ các trường được gửi mới được cập nhật. Yêu cầu quyền `unit.update`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của đơn vị tính (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: UpdateUnitDto,
    description:
      'Thông tin đơn vị tính cần cập nhật (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_name: {
        summary: 'Cập nhật tên',
        value: {
          name: 'Kilogram (kg)',
        },
      },
      update_status: {
        summary: 'Thay đổi trạng thái',
        value: {
          is_active: false,
        },
      },
      update_full: {
        summary: 'Cập nhật toàn bộ',
        value: {
          name: 'Kilogram',
          description: 'Đơn vị đo khối lượng quốc tế',
          is_used_multiple_languages: true,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật đơn vị tính thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.update_success' },
        message: { type: 'string', example: 'Cập nhật đơn vị tính thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            organization_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', nullable: true, example: 'Kilogram' },
            description: {
              type: 'string',
              nullable: true,
              example: 'Đơn vị đo khối lượng quốc tế',
            },
            is_used_multiple_languages: { type: 'boolean', example: true },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-01T09:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-01T10:30:00.000Z',
            },
            is_deleted: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn vị tính',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.not_found' },
        message: { type: 'string', example: 'Không tìm thấy đơn vị tính' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên đơn vị tính đã tồn tại trong tổ chức',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.name_exists' },
        message: {
          type: 'string',
          example: 'Tên đơn vị tính đã tồn tại trong tổ chức',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitDto,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IUnit>> {
    const result = await this.service.update(orgId, id, dto, actorId, lang);
    return new UpdatedResponse(ResponseCode.UNIT_UPDATE_SUCCESS, result);
  }

  @Delete('delete/many')
  @RequireOrgPermission('unit.delete')
  @ApiOperation({
    summary: 'Xóa nhiều đơn vị tính',
    description:
      'Xóa nhiều đơn vị tính cùng lúc theo danh sách ID. Không thể xóa đơn vị tính đang được sử dụng bởi sản phẩm. Yêu cầu quyền `unit.delete`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID các đơn vị tính cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa nhiều đơn vị tính',
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
    description: 'Xóa nhiều đơn vị tính thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.delete_success' },
        message: { type: 'string', example: 'Xóa đơn vị tính thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Đơn vị tính đang được sử dụng bởi sản phẩm',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.in_use' },
        message: {
          type: 'string',
          example: 'Đơn vị tính đang được sử dụng bởi sản phẩm, không thể xóa',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Một hoặc nhiều đơn vị tính không tìm thấy',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.not_found' },
        message: { type: 'string', example: 'Không tìm thấy đơn vị tính' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async deleteMany(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: DeleteManyDto,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.service.deleteMany(orgId, dto.ids, actorId, lang);
    return new DeletedResponse(ResponseCode.UNIT_DELETE_SUCCESS, null);
  }

  @Delete(':id')
  @RequireOrgPermission('unit.delete')
  @ApiOperation({
    summary: 'Xóa đơn vị tính',
    description:
      'Xóa một đơn vị tính theo ID. Không thể xóa đơn vị tính đang được sử dụng bởi sản phẩm. Yêu cầu quyền `unit.delete`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của đơn vị tính cần xóa (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa đơn vị tính thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.delete_success' },
        message: { type: 'string', example: 'Xóa đơn vị tính thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Đơn vị tính đang được sử dụng bởi sản phẩm',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.in_use' },
        message: {
          type: 'string',
          example: 'Đơn vị tính đang được sử dụng bởi sản phẩm, không thể xóa',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn vị tính',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'unit.not_found' },
        message: { type: 'string', example: 'Không tìm thấy đơn vị tính' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  async delete(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.service.delete(orgId, id, actorId, lang);
    return new DeletedResponse(ResponseCode.UNIT_DELETE_SUCCESS, null);
  }
}
