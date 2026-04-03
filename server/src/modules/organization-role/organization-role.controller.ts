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
import { OrganizationRoleService } from './organization-role.service';
import { CreateOrganizationRoleDto, UpdateOrganizationRoleDto } from './dto/organization-role.dto';
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

@ApiTags('Organization Roles')
@ApiBearerAuth('JWT-auth')
@Controller('organizations/:orgId/roles')
@UseGuards(PermissionGuard)
export class OrganizationRoleController {
  constructor(private readonly service: OrganizationRoleService) { }

  @Post()
  @RequirePermission('organization.list')
  @ApiOperation({
    summary: 'Tạo vai trò mới trong tổ chức',
    description:
      'Tạo một vai trò mới với các permissions được gán. Yêu cầu quyền `organization.list`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID tổ chức (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: CreateOrganizationRoleDto,
    description: 'Thông tin vai trò cần tạo',
    examples: {
      basic: { summary: 'Vai trò cơ bản', value: { name: 'Editor' } },
      with_permissions: {
        summary: 'Vai trò với permissions',
        value: {
          name: 'Manager',
          description: 'Quản lý kho hàng',
          permission_ids: ['perm-uuid-1', 'perm-uuid-2'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo vai trò thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_ROLE_CREATE_SUCCESS',
        message: 'Tạo vai trò thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440300',
          name: 'Manager',
          description: 'Quản lý kho hàng',
          organization_id: '550e8400-e29b-41d4-a716-446655440000',
          permissions: [
            { id: 'perm-uuid-1', key: 'inventory.read', name: 'Xem tồn kho' },
            {
              id: 'perm-uuid-2',
              key: 'inventory.write',
              name: 'Quản lý tồn kho',
            },
          ],
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
    @Body() dto: CreateOrganizationRoleDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.createRole(orgId, dto, userId, lang);
    return new CreatedResponse(
      ResponseCode.ORGANIZATION_ROLE_CREATE_SUCCESS,
      result,
    );
  }

  @Get()
  @RequirePermission('organization.list')
  @ApiOperation({
    summary: 'Lấy danh sách vai trò của tổ chức',
    description:
      'Lấy danh sách tất cả vai trò trong tổ chức bao gồm permissions.',
  })
  @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách vai trò thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_ROLE_LIST_SUCCESS',
        message: 'Lấy danh sách vai trò thành công',
        success: true,
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440300',
            name: 'Admin',
            description: 'Quản trị viên',
            member_count: 5,
            permissions: [],
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440301',
            name: 'Editor',
            description: 'Biên tập viên',
            member_count: 10,
            permissions: [],
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
    const result = await this.service.getRoles(orgId, userId, lang);
    return new GetResponse(ResponseCode.ORGANIZATION_ROLE_LIST_SUCCESS, result);
  }

  @Get('permissions')
  @RequirePermission('organization.list')
  @ApiOperation({
    summary: 'Lấy danh sách quyền có thể gán cho vai trò',
    description:
      'Trả về toàn bộ permissions dùng để cấu hình vai trò trong tổ chức.',
  })
  @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách quyền thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_ROLE_LIST_SUCCESS',
        message: 'Lấy danh sách quyền thành công',
        success: true,
        data: [
          {
            id: 'perm-uuid-1',
            key: 'organization.role.list',
            name: 'Xem danh sách vai trò',
            description: 'Quyền xem danh sách vai trò trong tổ chức',
            module: 'organization-role',
            is_active: true,
          },
        ],
      },
    },
  })
  @ApiAuthResponses()
  async findPermissions(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.getPermissions(orgId, userId, lang);
    return new GetResponse(ResponseCode.ORGANIZATION_ROLE_LIST_SUCCESS, result);
  }

  @Get(':roleId')
  @RequirePermission('organization.list')
  @ApiOperation({
    summary: 'Lấy chi tiết vai trò',
    description:
      'Lấy thông tin chi tiết của một vai trò bao gồm danh sách permissions.',
  })
  @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiParam({
    name: 'roleId',
    description: 'ID vai trò (UUID)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết vai trò thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_ROLE_LIST_SUCCESS',
        message: 'Lấy chi tiết vai trò thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440300',
          name: 'Manager',
          description: 'Quản lý kho hàng',
          organization_id: '550e8400-e29b-41d4-a716-446655440000',
          permissions: [
            { id: 'perm-uuid-1', key: 'inventory.read', name: 'Xem tồn kho' },
            {
              id: 'perm-uuid-2',
              key: 'inventory.write',
              name: 'Quản lý tồn kho',
            },
          ],
          members: [
            {
              id: 'member-uuid-1',
              user: {
                id: 'user-uuid-1',
                email: 'member@example.com',
                full_name: 'Nguyễn Văn A',
              },
            },
          ],
          created_at: '2026-01-20T06:00:00.000Z',
          updated_at: '2026-01-20T06:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  @ApiAuthResponses()
  async findById(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.getRoleById(orgId, roleId, userId, lang);
    return new GetResponse(ResponseCode.ORGANIZATION_ROLE_LIST_SUCCESS, result);
  }

  @Put(':roleId')
  @RequirePermission('organization.list')
  @ApiOperation({
    summary: 'Cập nhật vai trò',
    description:
      'Cập nhật thông tin vai trò bao gồm tên, mô tả và permissions.',
  })
  @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiParam({
    name: 'roleId',
    description: 'ID vai trò (UUID)',
    type: 'string',
  })
  @ApiBody({
    type: UpdateOrganizationRoleDto,
    description: 'Thông tin cần cập nhật',
    examples: {
      update: {
        summary: 'Cập nhật vai trò',
        value: {
          name: 'Senior Editor',
          permission_ids: ['perm-uuid-1', 'perm-uuid-2', 'perm-uuid-3'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật vai trò thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_ROLE_UPDATE_SUCCESS',
        message: 'Cập nhật vai trò thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440300',
          name: 'Senior Editor',
          updated_at: '2026-01-20T07:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateOrganizationRoleDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.updateRole(
      orgId,
      roleId,
      dto,
      userId,
      lang,
    );
    return new UpdatedResponse(
      ResponseCode.ORGANIZATION_ROLE_UPDATE_SUCCESS,
      result,
    );
  }

  @Delete(':roleId')
  @RequirePermission('organization.list')
  @ApiOperation({
    summary: 'Xóa vai trò',
    description:
      'Xóa mềm một vai trò. Vai trò đang được sử dụng không thể xóa.',
  })
  @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiParam({
    name: 'roleId',
    description: 'ID vai trò (UUID)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa vai trò thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_ROLE_DELETE_SUCCESS',
        message: 'Xóa vai trò thành công',
        success: true,
        data: null,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Vai trò đang được sử dụng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  @ApiAuthResponses()
  async delete(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.deleteRole(orgId, roleId, userId, lang);
    return new DeletedResponse(
      ResponseCode.ORGANIZATION_ROLE_DELETE_SUCCESS,
      undefined,
    );
  }

  @Delete('delete/many')
  @RequirePermission('organization.list')
  @ApiOperation({
    summary: 'Xóa nhiều vai trò',
    description: 'Xóa mềm nhiều vai trò cùng lúc.',
  })
  @ApiParam({ name: 'orgId', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID vai trò cần xóa',
    examples: {
      delete: {
        summary: 'Xóa nhiều vai trò',
        value: { ids: ['role-uuid-1', 'role-uuid-2'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều vai trò thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_ROLE_DELETE_SUCCESS',
        message: 'Xóa nhiều vai trò thành công',
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
    await this.service.deleteManyRoles(orgId, dto.ids, userId, lang);
    return new DeletedResponse(
      ResponseCode.ORGANIZATION_ROLE_DELETE_SUCCESS,
      undefined,
    );
  }
}
