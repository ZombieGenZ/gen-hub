import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { ApiKeyService } from './api-key.service';
import { QueryAdminApiKeyDto, UpdateAdminApiKeyDto } from './dto/api-key.dto';
import { DeleteManyDto } from '../../common/dto';
import {
  CurrentUser,
  RequirePermission,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import { PermissionGuard } from '../../common/guards';
import {
  GetResponse,
  UpdatedResponse,
  DeletedResponse,
  ResponseCode,
} from '../../common/responses';

/**
 * Controller quản lý API Keys cho Admin (toàn hệ thống)
 */
@ApiTags('API Keys')
@ApiBearerAuth('JWT-auth')
@Controller('admin/api-keys')
@UseGuards(PermissionGuard)
export class ApiKeyController {
  constructor(private readonly service: ApiKeyService) {}

  @Get()
  @RequirePermission('apikey.admin.list')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả API keys (Admin)',
    description:
      'Lấy danh sách tất cả API keys trong hệ thống với phân trang và lọc. Yêu cầu quyền `apikey.admin.list`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa (mặc định 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu (mặc định 0)',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm (tên, mô tả, key prefix)',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái hoạt động',
  })
  @ApiQuery({
    name: 'organization_id',
    required: false,
    type: String,
    description: 'Lọc theo ID tổ chức',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách API keys thành công',
    schema: {
      example: {
        code: 'APIKEY_LIST_SUCCESS',
        message: 'Lấy danh sách API keys thành công',
        success: true,
        data: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440200',
              name: 'Production Key',
              key_preview: 'genhub_xxxx...xxxx',
              is_active: true,
              organization_id: '550e8400-e29b-41d4-a716-446655440000',
              organization: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Công ty ABC',
              },
              created_at: '2026-01-20T06:00:00.000Z',
            },
          ],
          total: 50,
          limit: 10,
          offset: 0,
        },
      },
    },
  })
  @ApiAuthResponses()
  async findMany(
    @Query() query: QueryAdminApiKeyDto,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.getAdminApiKeys(query, lang);
    return new GetResponse(
      ResponseCode.APIKEY_LIST_SUCCESS,
      result,
      'Lấy danh sách API keys thành công',
    );
  }

  @Get(':id')
  @RequirePermission('apikey.admin.read')
  @ApiOperation({
    summary: 'Xem chi tiết API key (Admin)',
    description:
      'Xem thông tin chi tiết một API key bất kỳ. Yêu cầu quyền `apikey.admin.read`.',
  })
  @ApiParam({ name: 'id', description: 'ID API key (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết API key thành công',
    schema: {
      example: {
        code: 'APIKEY_DETAIL_SUCCESS',
        message: 'Lấy chi tiết API key thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440200',
          name: 'Production Key',
          description: 'Key Production',
          key_preview: 'genhub_xxxx...xxxx',
          is_active: true,
          rate_limit_ttl: 60,
          rate_limit_max: 1000,
          allowed_origins: ['https://app.example.com'],
          organization_id: '550e8400-e29b-41d4-a716-446655440000',
          organization: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Công ty ABC',
          },
          created_at: '2026-01-20T06:00:00.000Z',
          updated_at: '2026-01-20T06:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy API key' })
  @ApiAuthResponses()
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.getAdminApiKeyById(id, lang);
    return new GetResponse(
      ResponseCode.APIKEY_DETAIL_SUCCESS,
      result,
      'Lấy chi tiết API key thành công',
    );
  }

  @Put(':id')
  @RequirePermission('apikey.admin.update')
  @ApiOperation({
    summary: 'Cập nhật API key (Admin)',
    description:
      'Cập nhật thông tin API key (tên, mô tả, trạng thái, rate limit). Yêu cầu quyền `apikey.admin.update`.',
  })
  @ApiParam({ name: 'id', description: 'ID API key (UUID)', type: 'string' })
  @ApiBody({
    type: UpdateAdminApiKeyDto,
    description: 'Thông tin cần cập nhật',
    examples: {
      update_status: {
        summary: 'Khóa API Key',
        value: { is_active: false },
      },
      update_rate_limit: {
        summary: 'Cập nhật Rate Limit',
        value: {
          rate_limit_ttl: 60,
          rate_limit_max: 5000,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật API key thành công',
    schema: {
      example: {
        code: 'APIKEY_UPDATE_SUCCESS',
        message: 'Cập nhật API key thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440200',
          name: 'Production Key',
          is_active: false,
          updated_at: '2026-01-20T07:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy API key' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminApiKeyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.updateAdminApiKey(id, dto, userId, lang);
    return new UpdatedResponse(
      ResponseCode.APIKEY_UPDATE_SUCCESS,
      result,
      'Cập nhật API key thành công',
    );
  }

  @Delete(':id')
  @RequirePermission('apikey.admin.delete')
  @ApiOperation({
    summary: 'Xóa API key (Admin)',
    description: 'Xóa mềm API Key. Yêu cầu quyền `apikey.admin.delete`.',
  })
  @ApiParam({ name: 'id', description: 'ID API key (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Xóa API key thành công',
    schema: {
      example: {
        code: 'APIKEY_DELETE_SUCCESS',
        message: 'Xóa API key thành công',
        success: true,
        data: null,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy API key' })
  @ApiAuthResponses()
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.deleteAdminApiKey(id, userId, lang);
    return new DeletedResponse(
      ResponseCode.APIKEY_DELETE_SUCCESS,
      undefined,
      'Xóa API key thành công',
    );
  }

  @Delete('delete/many')
  @RequirePermission('apikey.admin.delete')
  @ApiOperation({
    summary: 'Xóa nhiều API keys (Admin)',
    description:
      'Xóa mềm nhiều API Keys cùng lúc. Yêu cầu quyền `apikey.admin.delete`.',
  })
  @ApiBody({
    type: DeleteManyDto,
    examples: {
      delete_many: {
        summary: 'Xóa danh sách keys',
        value: { ids: ['uuid-1', 'uuid-2'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều API keys thành công',
    schema: {
      example: {
        code: 'APIKEY_DELETE_SUCCESS',
        message: 'Xóa nhiều API keys thành công',
        success: true,
        data: null,
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.deleteManyAdminApiKeys(dto.ids, userId, lang);
    return new DeletedResponse(
      ResponseCode.APIKEY_DELETE_SUCCESS,
      undefined,
      'Xóa nhiều API keys thành công',
    );
  }
}
