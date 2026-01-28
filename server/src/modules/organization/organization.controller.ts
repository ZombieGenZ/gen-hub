import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
  ApiQuery,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { OrganizationService } from './organization.service';
import { OrganizationUpdateRequestService } from '../organization-update-request/organization-update-request.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  QueryOrganizationDto,
  TransferOwnershipDto,
  InviteMemberDto,
  AssignMemberRolesDto,
  AssignMemberPermissionsDto,
  UpdateMemberDisplayNameDto,
} from './dto';
import { CreateOrganizationUpdateRequestDto } from '../organization-update-request/dto';
import { DeleteManyDto } from '../../common/dto';
import {
  CurrentUser,
  RequirePermission,
  Public,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import { PermissionGuard } from '../../common/guards';
import {
  CreatedResponse,
  GetResponse,
  UpdatedResponse,
  DeletedResponse,
  OkResponse,
  ResponseCode,
} from '../../common/responses';

@ApiTags('Organizations')
@ApiBearerAuth('JWT-auth')
@Controller('organizations')
@UseGuards(PermissionGuard)
export class OrganizationController {
  constructor(
    private readonly service: OrganizationService,
    private readonly prisma: PrismaService,
    private readonly updateRequestService: OrganizationUpdateRequestService,
  ) {}

  private async hasPermission(
    userId: string,
    permissionKey: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
        system_roles: {
          where: { is_deleted: false, is_active: true },
          include: {
            role: {
              include: {
                permissions: {
                  where: { is_deleted: false, is_active: true },
                  include: { permission: true },
                },
              },
            },
          },
        },
        system_permissions: {
          where: { is_deleted: false, is_active: true },
          include: { permission: true },
        },
      },
    });
    if (!user) return false;
    const hasDirectPerm = user.system_permissions.some(
      (p) => p.permission.key === permissionKey,
    );
    if (hasDirectPerm) return true;
    return user.system_roles.some((ur) =>
      ur.role.permissions.some((rp) => rp.permission.key === permissionKey),
    );
  }

  @Post()
  @RequirePermission('organization.create')
  @ApiOperation({
    summary: 'Tạo tổ chức mới',
    description:
      'Tạo mới một tổ chức với đầy đủ thông tin bao gồm thông tin đại diện, mã số thuế và cấu hình email. Yêu cầu quyền `organization.create`.',
  })
  @ApiBody({
    type: CreateOrganizationDto,
    description: 'Thông tin tổ chức cần tạo',
    examples: {
      basic: {
        summary: 'Tổ chức cơ bản',
        value: { name: 'Công ty ABC', tax_code: '0123456789' },
      },
      full: {
        summary: 'Tổ chức đầy đủ',
        value: {
          name: 'Công ty XYZ',
          international_name: 'XYZ Company',
          tax_code: '0123456789',
          headquarters_address: '123 Nguyễn Văn Linh, Quận 7, TP.HCM',
          representative_name: 'Nguyễn Văn A',
          representative_title: 'Giám đốc',
          representative_phone: '0901234567',
          representative_email: 'contact@xyz.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo tổ chức thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_CREATE_SUCCESS',
        message: 'Tạo tổ chức thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Công ty XYZ',
          international_name: 'XYZ Company',
          tax_code: '0123456789',
          headquarters_address: '123 Nguyễn Văn Linh, Quận 7, TP.HCM',
          representative_name: 'Nguyễn Văn A',
          representative_title: 'Giám đốc',
          owner_id: '550e8400-e29b-41d4-a716-446655440001',
          is_active: true,
          created_at: '2026-01-20T06:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên tổ chức hoặc mã số thuế đã tồn tại',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.create(dto, userId, lang);
    return new CreatedResponse(
      ResponseCode.ORGANIZATION_CREATE_SUCCESS,
      result,
    );
  }

  @Get()
  @RequirePermission('organization.list')
  @ApiOperation({
    summary: 'Lấy danh sách tổ chức',
    description:
      'Lấy danh sách các tổ chức với phân trang và tìm kiếm. Yêu cầu quyền `organization.list`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Số bản ghi bỏ qua',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách tổ chức thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_LIST_SUCCESS',
        message: 'Lấy danh sách tổ chức thành công',
        success: true,
        data: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Công ty ABC',
              tax_code: '0123456789',
              is_active: true,
              created_at: '2026-01-20T06:00:00.000Z',
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              name: 'Công ty XYZ',
              tax_code: '9876543210',
              is_active: true,
              created_at: '2026-01-21T06:00:00.000Z',
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
    @Query() query: QueryOrganizationDto,
    @CurrentUser('userId') userId: string,
  ) {
    const hasListAllPermission = await this.hasPermission(
      userId,
      'organization.list.all',
    );
    const result = await this.service.findMany(
      query,
      userId,
      hasListAllPermission,
    );
    return new GetResponse(ResponseCode.ORGANIZATION_LIST_SUCCESS, result);
  }

  @Get(':id')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Lấy chi tiết tổ chức',
    description:
      'Lấy thông tin chi tiết của một tổ chức bao gồm thông tin đại diện và cấu hình. Yêu cầu quyền `organization.read`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID tổ chức (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin tổ chức thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_GET_SUCCESS',
        message: 'Lấy thông tin tổ chức thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Công ty XYZ',
          international_name: 'XYZ Company',
          tax_code: '0123456789',
          headquarters_address: '123 Nguyễn Văn Linh, Quận 7, TP.HCM',
          representative_name: 'Nguyễn Văn A',
          representative_title: 'Giám đốc',
          representative_phone: '0901234567',
          representative_email: 'contact@xyz.com',
          owner: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            email: 'owner@xyz.com',
            full_name: 'Nguyễn Văn A',
          },
          is_active: true,
          created_at: '2026-01-20T06:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
  @ApiAuthResponses()
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const hasReadAllPermission = await this.hasPermission(
      userId,
      'organization.read.all',
    );
    const result = await this.service.findById(
      id,
      lang,
      userId,
      hasReadAllPermission,
    );
    return new GetResponse(ResponseCode.ORGANIZATION_GET_SUCCESS, result);
  }

  @Post(':id/update-request')
  @RequirePermission('organization.update_request')
  @ApiOperation({
    summary: 'Gửi yêu cầu cập nhật thông tin tổ chức',
    description:
      'Gửi yêu cầu cập nhật thông tin tổ chức để admin phê duyệt. Yêu cầu quyền `organization.update_request`.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiResponse({
    status: 201,
    description: 'Gửi yêu cầu cập nhật thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_UPDATE_REQUEST_CREATE_SUCCESS',
        message: 'Gửi yêu cầu cập nhật thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440100',
          status: 'pending',
          created_at: '2026-01-20T06:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async submitUpdateRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrganizationUpdateRequestDto,
    @I18nLang() lang: string,
  ) {
    const data = await this.updateRequestService.create(userId, id, dto, lang);
    return new CreatedResponse(
      ResponseCode.ORGANIZATION_UPDATE_REQUEST_CREATE_SUCCESS,
      data,
    );
  }

  @Put(':id')
  @RequirePermission('organization.update')
  @ApiOperation({
    summary: 'Cập nhật tổ chức',
    description:
      'Cập nhật thông tin tổ chức. Yêu cầu quyền `organization.update`.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiBody({
    type: UpdateOrganizationDto,
    description: 'Thông tin cần cập nhật',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật tổ chức thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_UPDATE_SUCCESS',
        message: 'Cập nhật tổ chức thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Công ty XYZ Updated',
          updated_at: '2026-01-20T07:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
  @ApiResponse({ status: 409, description: 'Tên tổ chức đã tồn tại' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const hasUpdateAllPermission = await this.hasPermission(
      userId,
      'organization.update.all',
    );
    const result = await this.service.update(
      id,
      dto,
      userId,
      lang,
      hasUpdateAllPermission,
    );
    return new UpdatedResponse(
      ResponseCode.ORGANIZATION_UPDATE_SUCCESS,
      result,
    );
  }

  @Delete('delete/many')
  @RequirePermission('organization.delete')
  @ApiOperation({
    summary: 'Xóa nhiều tổ chức',
    description:
      'Xóa mềm nhiều tổ chức cùng lúc. Yêu cầu quyền `organization.delete`.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID tổ chức cần xóa',
    examples: {
      delete: {
        summary: 'Xóa 2 tổ chức',
        value: { ids: ['uuid-1', 'uuid-2'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều tổ chức thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_DELETE_SUCCESS',
        message: 'Xóa nhiều tổ chức thành công',
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
    const hasDeleteAllPermission = await this.hasPermission(
      userId,
      'organization.delete.all',
    );
    await this.service.deleteMany(
      dto.ids,
      userId,
      lang,
      hasDeleteAllPermission,
    );
    return new DeletedResponse(
      ResponseCode.ORGANIZATION_DELETE_SUCCESS,
      undefined,
    );
  }

  @Delete(':id')
  @RequirePermission('organization.delete')
  @ApiOperation({
    summary: 'Xóa tổ chức',
    description: 'Xóa mềm một tổ chức. Yêu cầu quyền `organization.delete`.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Xóa tổ chức thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_DELETE_SUCCESS',
        message: 'Xóa tổ chức thành công',
        success: true,
        data: null,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
  @ApiAuthResponses()
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const hasDeleteAllPermission = await this.hasPermission(
      userId,
      'organization.delete.all',
    );
    await this.service.delete(id, userId, lang, hasDeleteAllPermission);
    return new DeletedResponse(
      ResponseCode.ORGANIZATION_DELETE_SUCCESS,
      undefined,
    );
  }

  @Post(':id/leave')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Rời khỏi tổ chức',
    description:
      'Thành viên tự rời khỏi tổ chức. Chủ sở hữu không thể rời nếu chưa chuyển quyền.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Rời khỏi tổ chức thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_MEMBER_LEAVE_SUCCESS',
        message: 'Đã rời khỏi tổ chức thành công',
        success: true,
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Chủ sở hữu không thể rời khỏi tổ chức',
  })
  @ApiAuthResponses()
  async leaveOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.leaveOrganization(id, userId, lang);
    return new OkResponse(
      ResponseCode.ORGANIZATION_MEMBER_LEAVE_SUCCESS,
      undefined,
    );
  }

  @Post(':id/transfer-ownership')
  @RequirePermission('organization.update')
  @ApiOperation({
    summary: 'Chuyển quyền sở hữu tổ chức',
    description:
      'Chuyển quyền sở hữu tổ chức cho thành viên khác. Chỉ chủ sở hữu hiện tại mới có quyền.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiBody({
    type: TransferOwnershipDto,
    examples: {
      transfer: {
        summary: 'Chuyển sở hữu',
        value: { new_owner_email: 'newowner@example.com' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Chuyển quyền sở hữu thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_TRANSFER_OWNERSHIP_SUCCESS',
        message: 'Chuyển quyền sở hữu thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          new_owner_id: '550e8400-e29b-41d4-a716-446655440002',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Không thể chuyển cho chính mình hoặc người không phải thành viên',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async transferOwnership(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.transferOwnership(id, dto, userId, lang);
    return new UpdatedResponse(
      ResponseCode.ORGANIZATION_TRANSFER_OWNERSHIP_SUCCESS,
      result,
    );
  }

  @Post(':id/members/invite')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Mời thành viên vào tổ chức',
    description: 'Gửi lời mời cho một hoặc nhiều người dùng tham gia tổ chức.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiBody({
    type: InviteMemberDto,
    examples: {
      invite: {
        summary: 'Mời thành viên',
        value: { emails: ['user1@example.com', 'user2@example.com'] },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Gửi lời mời thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_MEMBER_INVITE_SUCCESS',
        message: 'Đã gửi lời mời thành công',
        success: true,
        data: {
          success: ['user1@example.com', 'user2@example.com'],
          failed: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Người dùng đã là thành viên hoặc đã được mời',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async inviteMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.inviteMember(id, dto, userId, lang);
    return new CreatedResponse(
      ResponseCode.ORGANIZATION_MEMBER_INVITE_SUCCESS,
      result,
    );
  }

  @Delete(':id/members/:memberId/invite')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Hủy lời mời',
    description: 'Hủy lời mời đã gửi cho một thành viên.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiParam({
    name: 'memberId',
    description: 'ID thành viên (UUID)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Hủy lời mời thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_MEMBER_INVITE_REMOVE_SUCCESS',
        message: 'Đã hủy lời mời thành công',
        success: true,
        data: null,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lời mời' })
  @ApiAuthResponses()
  async cancelInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.cancelInvite(id, memberId, userId, lang);
    return new DeletedResponse(
      ResponseCode.ORGANIZATION_MEMBER_INVITE_REMOVE_SUCCESS,
      undefined,
    );
  }

  @Post(':id/members/accept')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Chấp nhận lời mời',
    description: 'Chấp nhận lời mời tham gia tổ chức.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Chấp nhận lời mời thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_MEMBER_ACCEPT_SUCCESS',
        message: 'Đã chấp nhận lời mời thành công',
        success: true,
        data: {
          member_id: '550e8400-e29b-41d4-a716-446655440100',
          organization_id: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lời mời' })
  @ApiAuthResponses()
  async acceptInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.acceptInvite(id, userId, lang);
    return new OkResponse(
      ResponseCode.ORGANIZATION_MEMBER_ACCEPT_SUCCESS,
      result,
    );
  }

  @Post(':id/members/reject')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Từ chối lời mời',
    description: 'Từ chối lời mời tham gia tổ chức.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Từ chối lời mời thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_MEMBER_REJECT_SUCCESS',
        message: 'Đã từ chối lời mời thành công',
        success: true,
        data: null,
      },
    },
  })
  @ApiAuthResponses()
  async rejectInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.rejectInvite(id, userId, lang);
    return new OkResponse(
      ResponseCode.ORGANIZATION_MEMBER_REJECT_SUCCESS,
      undefined,
    );
  }

  @Get('invite/verify/:token')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Kiểm tra token mời',
    description:
      'Kiểm tra token mời có hợp lệ không (chỉ kiểm tra token của user hiện tại).',
  })
  @ApiParam({ name: 'token', description: 'Token mời', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Token hợp lệ',
    schema: {
      example: {
        code: 'ORGANIZATION_MEMBER_INVITE_VERIFY_SUCCESS',
        message: 'Token hợp lệ',
        success: true,
        data: {
          organization: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Công ty XYZ',
          },
          expires_at: '2026-01-27T06:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token không hợp lệ hoặc đã hết hạn',
  })
  @ApiAuthResponses()
  async verifyInviteToken(
    @Param('token') token: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.verifyInviteToken(token, userId, lang);
    return new GetResponse(
      ResponseCode.ORGANIZATION_MEMBER_INVITE_VERIFY_SUCCESS,
      result,
    );
  }

  @Post('invite/accept/:token')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Chấp nhận lời mời bằng token',
    description: 'Chấp nhận lời mời tham gia tổ chức bằng token.',
  })
  @ApiParam({ name: 'token', description: 'Token mời', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Chấp nhận lời mời thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_MEMBER_ACCEPT_SUCCESS',
        message: 'Đã chấp nhận lời mời thành công',
        success: true,
        data: { member_id: '550e8400-e29b-41d4-a716-446655440100' },
      },
    },
  })
  @ApiAuthResponses()
  async acceptInviteByToken(
    @Param('token') token: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.acceptInviteByToken(token, userId, lang);
    return new OkResponse(
      ResponseCode.ORGANIZATION_MEMBER_ACCEPT_SUCCESS,
      result,
    );
  }

  @Post('invite/reject/:token')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Từ chối lời mời bằng token',
    description: 'Từ chối lời mời tham gia tổ chức bằng token.',
  })
  @ApiParam({ name: 'token', description: 'Token mời', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Từ chối lời mời thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_MEMBER_REJECT_SUCCESS',
        message: 'Đã từ chối lời mời thành công',
        success: true,
        data: null,
      },
    },
  })
  @ApiAuthResponses()
  async rejectInviteByToken(
    @Param('token') token: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.rejectInviteByToken(token, userId, lang);
    return new OkResponse(
      ResponseCode.ORGANIZATION_MEMBER_REJECT_SUCCESS,
      undefined,
    );
  }

  @Get(':id/members')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Lấy danh sách thành viên',
    description: 'Lấy danh sách thành viên của tổ chức với phân trang.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Số bản ghi bỏ qua',
    example: 0,
  })
  @ApiQuery({
    name: 'is_accepted',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái chấp nhận',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành viên thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_MEMBER_LIST_SUCCESS',
        message: 'Lấy danh sách thành viên thành công',
        success: true,
        data: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440100',
              user: {
                id: '550e8400-e29b-41d4-a716-446655440001',
                email: 'member@example.com',
                full_name: 'Nguyễn Văn B',
              },
              display_name: 'Product Manager',
              is_accepted: true,
              is_owner: false,
              roles: [],
              permissions: [],
            },
          ],
          total: 10,
        },
      },
    },
  })
  @ApiAuthResponses()
  async getMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Query('is_accepted') is_accepted: boolean,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.getMembers(
      id,
      userId,
      { limit, offset, is_accepted },
      lang,
    );
    return new GetResponse(
      ResponseCode.ORGANIZATION_MEMBER_LIST_SUCCESS,
      result,
    );
  }

  @Put(':id/members/:memberId/roles')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Gán vai trò cho thành viên',
    description: 'Gán một hoặc nhiều vai trò cho thành viên trong tổ chức.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiParam({
    name: 'memberId',
    description: 'ID thành viên (UUID)',
    type: 'string',
  })
  @ApiBody({
    type: AssignMemberRolesDto,
    examples: {
      assign: {
        summary: 'Gán vai trò',
        value: { role_ids: ['role-uuid-1', 'role-uuid-2'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Gán vai trò thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_MEMBER_ROLE_ASSIGN_SUCCESS',
        message: 'Đã gán vai trò cho thành viên thành công',
        success: true,
        data: {
          member_id: '550e8400-e29b-41d4-a716-446655440100',
          roles: ['role-uuid-1', 'role-uuid-2'],
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async assignMemberRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: AssignMemberRolesDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.assignMemberRoles(
      id,
      memberId,
      dto,
      userId,
      lang,
    );
    return new UpdatedResponse(
      ResponseCode.ORGANIZATION_MEMBER_ROLE_ASSIGN_SUCCESS,
      result,
    );
  }

  @Put(':id/members/:memberId/permissions')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Gán quyền cho thành viên',
    description: 'Gán quyền trực tiếp cho thành viên trong tổ chức.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiParam({
    name: 'memberId',
    description: 'ID thành viên (UUID)',
    type: 'string',
  })
  @ApiBody({
    type: AssignMemberPermissionsDto,
    examples: {
      assign: {
        summary: 'Gán quyền',
        value: { permission_ids: ['perm-uuid-1', 'perm-uuid-2'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Gán quyền thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_MEMBER_PERMISSION_ASSIGN_SUCCESS',
        message: 'Đã gán quyền cho thành viên thành công',
        success: true,
        data: {
          member_id: '550e8400-e29b-41d4-a716-446655440100',
          permissions: ['perm-uuid-1', 'perm-uuid-2'],
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async assignMemberPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: AssignMemberPermissionsDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.assignMemberPermissions(
      id,
      memberId,
      dto,
      userId,
      lang,
    );
    return new UpdatedResponse(
      ResponseCode.ORGANIZATION_MEMBER_PERMISSION_ASSIGN_SUCCESS,
      result,
    );
  }

  @Delete(':id/members/:memberId')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Xóa thành viên',
    description: 'Xóa thành viên khỏi tổ chức. Không thể xóa chủ sở hữu.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiParam({
    name: 'memberId',
    description: 'ID thành viên (UUID)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành viên thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_MEMBER_REMOVE_SUCCESS',
        message: 'Đã xóa thành viên thành công',
        success: true,
        data: null,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Không thể xóa chủ sở hữu' })
  @ApiAuthResponses()
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.service.removeMember(id, memberId, userId, lang);
    return new DeletedResponse(
      ResponseCode.ORGANIZATION_MEMBER_REMOVE_SUCCESS,
      undefined,
    );
  }

  @Patch(':id/members/:memberId/display-name')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Cập nhật display name của thành viên',
    description: 'Admin cập nhật display name của thành viên trong tổ chức.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiParam({
    name: 'memberId',
    description: 'ID thành viên (UUID)',
    type: 'string',
  })
  @ApiBody({ type: UpdateMemberDisplayNameDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật display name thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_UPDATE_SUCCESS',
        message: 'Cập nhật display name thành công',
        success: true,
        data: {
          member_id: '550e8400-e29b-41d4-a716-446655440100',
          display_name: 'Senior Manager',
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async updateMemberDisplayName(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDisplayNameDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.updateMemberDisplayName(
      id,
      memberId,
      dto.display_name,
      userId,
      lang,
      false,
    );
    return new UpdatedResponse(
      ResponseCode.ORGANIZATION_UPDATE_SUCCESS,
      result,
    );
  }

  @Patch(':id/me/display-name')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Cập nhật display name của bản thân',
    description: 'Thành viên tự cập nhật display name của mình trong tổ chức.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
  @ApiBody({ type: UpdateMemberDisplayNameDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật display name thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_UPDATE_SUCCESS',
        message: 'Cập nhật display name thành công',
        success: true,
        data: { display_name: 'My New Name' },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async updateMyDisplayName(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberDisplayNameDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const member = await this.service.findMemberByUserAndOrg(userId, id, lang);
    const result = await this.service.updateMemberDisplayName(
      id,
      member.id,
      dto.display_name,
      userId,
      lang,
      true,
    );
    return new UpdatedResponse(
      ResponseCode.ORGANIZATION_UPDATE_SUCCESS,
      result,
    );
  }

  @Get(':id/permissions')
  @RequirePermission('organization.read')
  @ApiOperation({
    summary: 'Lấy danh sách quyền của tổ chức',
    description: 'Lấy danh sách tất cả quyền có thể gán trong tổ chức.',
  })
  @ApiParam({ name: 'id', description: 'ID tổ chức (UUID)', type: 'string' })
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
            id: '550e8400-e29b-41d4-a716-446655440200',
            key: 'inventory.read',
            name: 'Xem tồn kho',
            allow_api_key: true,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440201',
            key: 'inventory.write',
            name: 'Quản lý tồn kho',
            allow_api_key: false,
          },
        ],
      },
    },
  })
  @ApiAuthResponses()
  async getPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.getPermissions(id, userId, lang);
    return new GetResponse(ResponseCode.ORGANIZATION_ROLE_LIST_SUCCESS, result);
  }

  @Get('permissions/api-key-enabled')
  @Public()
  @ApiOperation({
    summary: 'Lấy danh sách permissions cho phép API key',
    description: 'API công khai để lấy danh sách permissions hỗ trợ API key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách permissions thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_PERMISSION_LIST_SUCCESS',
        message: 'Lấy danh sách permissions thành công',
        success: true,
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440200',
            key: 'inventory.read',
            name: 'Xem tồn kho',
            allow_api_key: true,
          },
        ],
      },
    },
  })
  async getApiKeyEnabledPermissions() {
    const permissions = await this.prisma.organizationPermission.findMany({
      where: { is_deleted: false, is_active: true, allow_api_key: true },
      orderBy: { key: 'asc' },
    });
    return new GetResponse(
      ResponseCode.ORGANIZATION_PERMISSION_LIST_SUCCESS,
      permissions,
    );
  }
}
