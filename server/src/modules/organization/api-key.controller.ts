import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { OrganizationService } from './organization.service';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import {
  CurrentUser,
  RequirePermission,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import { PermissionGuard } from '../../common/guards';
import {
  CreatedResponse,
  GetResponse,
  UpdatedResponse,
  DeletedResponse,
  ResponseCode,
} from '../../common/responses';

@ApiTags('Organization API Keys')
@ApiBearerAuth('JWT-auth')
@Controller('organizations/:orgId/api-keys')
@UseGuards(PermissionGuard)
export class ApiKeyController {
  constructor(private readonly service: OrganizationService) {}

  @Post()
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Tạo API key mới',
    description:
      'Tạo một API key mới cho tổ chức với các permissions và cấu hình rate limit. Key chỉ hiển thị một lần duy nhất sau khi tạo.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID tổ chức (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: CreateApiKeyDto,
    description: 'Thông tin API key cần tạo',
    examples: {
      basic: {
        summary: 'API key cơ bản',
        value: { name: 'Production API Key' },
      },
      with_permissions: {
        summary: 'API key với permissions',
        value: {
          name: 'Integration Key',
          description: 'Key cho hệ thống tích hợp',
          permission_ids: ['perm-uuid-1', 'perm-uuid-2'],
          expires_at: '2027-01-01T00:00:00Z',
        },
      },
      with_origins: {
        summary: 'API key với allowed origins',
        value: {
          name: 'Web Client Key',
          allowed_origins: [
            'https://app.example.com',
            'https://admin.example.com',
          ],
          rate_limit_ttl: 60,
          rate_limit_max: 100,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo API key thành công. Key chỉ hiển thị một lần.',
    schema: {
      example: {
        code: 'APIKEY_CREATE_SUCCESS',
        message: 'Tạo API key thành công. Key chỉ hiển thị một lần.',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440200',
          name: 'Production API Key',
          key: 'genhub_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          description: 'Key cho production',
          expires_at: '2027-01-01T00:00:00.000Z',
          is_active: true,
          created_at: '2026-01-20T06:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateApiKeyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.createApiKey(orgId, dto, userId, lang);
    return new CreatedResponse(ResponseCode.APIKEY_CREATE_SUCCESS, result);
  }

  @Get()
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Lấy danh sách API keys',
    description:
      'Lấy danh sách tất cả API keys của tổ chức. Key value không được trả về.',
  })
  @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách API keys thành công',
    schema: {
      example: {
        code: 'APIKEY_LIST_SUCCESS',
        message: 'Lấy danh sách API keys thành công',
        success: true,
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440200',
            name: 'Production Key',
            key_preview: 'genhub_xxxx...xxxx',
            is_active: true,
            expires_at: '2027-01-01T00:00:00.000Z',
            created_at: '2026-01-20T06:00:00.000Z',
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440201',
            name: 'Test Key',
            key_preview: 'genhub_yyyy...yyyy',
            is_active: true,
            expires_at: null,
            created_at: '2026-01-21T06:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiAuthResponses()
  async findMany(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.getApiKeys(orgId, userId, lang);
    return new GetResponse(ResponseCode.APIKEY_LIST_SUCCESS, result);
  }

  @Get(':keyId')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Lấy chi tiết API key',
    description:
      'Lấy thông tin chi tiết của một API key bao gồm permissions và cấu hình.',
  })
  @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiParam({ name: 'keyId', description: 'ID API key (UUID)', type: 'string' })
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
          description: 'Key cho production environment',
          key_preview: 'genhub_xxxx...xxxx',
          is_active: true,
          expires_at: '2027-01-01T00:00:00.000Z',
          allowed_origins: ['https://app.example.com'],
          rate_limit_ttl: 60,
          rate_limit_max: 100,
          permissions: [
            { id: 'perm-uuid-1', key: 'inventory.read', name: 'Xem tồn kho' },
          ],
          created_at: '2026-01-20T06:00:00.000Z',
          updated_at: '2026-01-20T06:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy API key' })
  @ApiAuthResponses()
  async findOne(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('keyId', ParseUUIDPipe) keyId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.getApiKeyById(orgId, keyId, userId, lang);
    return new GetResponse(ResponseCode.APIKEY_DETAIL_SUCCESS, result);
  }

  @Put(':keyId')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Cập nhật API key',
    description:
      'Cập nhật thông tin API key bao gồm tên, mô tả, permissions và cấu hình.',
  })
  @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiParam({ name: 'keyId', description: 'ID API key (UUID)', type: 'string' })
  @ApiBody({
    type: UpdateApiKeyDto,
    description: 'Thông tin cần cập nhật',
    examples: {
      update: {
        summary: 'Cập nhật API key',
        value: { name: 'Updated Key Name', is_active: true },
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
          name: 'Updated Key Name',
          is_active: true,
          updated_at: '2026-01-20T07:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy API key' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('keyId', ParseUUIDPipe) keyId: string,
    @Body() dto: UpdateApiKeyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.updateApiKey(
      orgId,
      keyId,
      dto,
      userId,
      lang,
    );
    return new UpdatedResponse(ResponseCode.APIKEY_UPDATE_SUCCESS, result);
  }

  @Post(':keyId/reset')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Reset API key',
    description:
      'Tạo lại giá trị API key mới. Key cũ sẽ không còn hoạt động. Key mới chỉ hiển thị một lần.',
  })
  @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiParam({ name: 'keyId', description: 'ID API key (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Reset API key thành công. Key mới chỉ hiển thị một lần.',
    schema: {
      example: {
        code: 'APIKEY_RESET_SUCCESS',
        message: 'Reset API key thành công. Key mới chỉ hiển thị một lần.',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440200',
          name: 'Production Key',
          key: 'genhub_newkeyxxxxxxxxxxxxxxxxxxxxxx',
          updated_at: '2026-01-20T07:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy API key' })
  @ApiAuthResponses()
  async reset(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('keyId', ParseUUIDPipe) keyId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.resetApiKey(orgId, keyId, userId, lang);
    return new UpdatedResponse(ResponseCode.APIKEY_RESET_SUCCESS, result);
  }

  @Delete(':keyId')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Xóa API key',
    description: 'Xóa mềm một API key. Key sẽ không còn hoạt động.',
  })
  @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiParam({ name: 'keyId', description: 'ID API key (UUID)', type: 'string' })
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
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('keyId', ParseUUIDPipe) keyId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.deleteApiKey(orgId, keyId, userId, lang);
    return new DeletedResponse(ResponseCode.APIKEY_DELETE_SUCCESS, undefined);
  }

  @Delete('delete/many')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Xóa nhiều API keys',
    description: 'Xóa mềm nhiều API keys cùng lúc.',
  })
  @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID API keys cần xóa',
    examples: {
      delete: {
        summary: 'Xóa nhiều keys',
        value: { ids: ['key-uuid-1', 'key-uuid-2'] },
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
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.deleteManyApiKeys(orgId, dto.ids, userId, lang);
    return new DeletedResponse(ResponseCode.APIKEY_DELETE_SUCCESS, undefined);
  }
}
