import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { OrganizationService } from './organization.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CreateOrganizationDto,
    UpdateOrganizationDto,
    QueryOrganizationDto,
    TransferOwnershipDto,
    InviteMemberDto,
    AssignMemberRolesDto,
    AssignMemberPermissionsDto,
} from './dto';
import { CurrentUser, RequirePermission } from '../../common/decorators';
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
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(PermissionGuard)
export class OrganizationController {
    constructor(
        private readonly service: OrganizationService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Kiểm tra user có permission cụ thể không
     */
    private async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
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

        // Check direct permissions
        const hasDirectPerm = user.system_permissions.some(
            (p) => p.permission.key === permissionKey,
        );
        if (hasDirectPerm) return true;

        // Check role permissions
        const hasRolePerm = user.system_roles.some((ur) =>
            ur.role.permissions.some((rp) => rp.permission.key === permissionKey),
        );
        return hasRolePerm;
    }

    @Post()
    @RequirePermission('organization.create')
    @ApiOperation({ summary: 'Tạo tổ chức mới' })
    async create(
        @Body() dto: CreateOrganizationDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.create(dto, userId, lang);
        return new CreatedResponse(
            ResponseCode.ORGANIZATION_CREATE_SUCCESS,
            result,
            'Tạo tổ chức thành công',
        );
    }

    @Get()
    @RequirePermission('organization.list')
    @ApiOperation({ summary: 'Lấy danh sách tổ chức' })
    async findMany(
        @Query() query: QueryOrganizationDto,
        @CurrentUser('userId') userId: string,
    ) {
        // Kiểm tra có quyền xem tất cả không
        const hasListAllPermission = await this.hasPermission(userId, 'organization.list.all');
        const result = await this.service.findMany(query, userId, hasListAllPermission);
        return new GetResponse(
            ResponseCode.ORGANIZATION_LIST_SUCCESS,
            result,
            'Lấy danh sách tổ chức thành công',
        );
    }

    @Get(':id')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Lấy chi tiết tổ chức' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        // Kiểm tra có quyền xem tất cả không
        const hasReadAllPermission = await this.hasPermission(userId, 'organization.read.all');
        const result = await this.service.findById(id, lang, userId, hasReadAllPermission);
        return new GetResponse(
            ResponseCode.ORGANIZATION_GET_SUCCESS,
            result,
            'Lấy thông tin tổ chức thành công',
        );
    }

    @Put(':id')
    @RequirePermission('organization.update')
    @ApiOperation({ summary: 'Cập nhật tổ chức' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOrganizationDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.update(id, dto, userId, lang);
        return new UpdatedResponse(
            ResponseCode.ORGANIZATION_UPDATE_SUCCESS,
            result,
            'Cập nhật tổ chức thành công',
        );
    }

    @Delete(':id')
    @RequirePermission('organization.delete')
    @ApiOperation({ summary: 'Xóa tổ chức' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.delete(id, userId, lang);
        return new DeletedResponse(
            ResponseCode.ORGANIZATION_DELETE_SUCCESS,
            undefined,
            'Xóa tổ chức thành công',
        );
    }

    @Post(':id/transfer-ownership')
    @RequirePermission('organization.update')
    @ApiOperation({ summary: 'Chuyển quyền sở hữu tổ chức' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
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
            'Chuyển quyền sở hữu thành công',
        );
    }

    @Post(':id/members/invite')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Mời thành viên vào tổ chức' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
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
            'Đã gửi lời mời thành công',
        );
    }

    @Delete(':id/members/:memberId/invite')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Hủy lời mời' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
    @ApiParam({ name: 'memberId', description: 'ID thành viên' })
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
            'Đã hủy lời mời thành công',
        );
    }

    @Post(':id/members/accept')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Chấp nhận lời mời' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
    async acceptInvite(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.acceptInvite(id, userId, lang);
        return new OkResponse(
            ResponseCode.ORGANIZATION_MEMBER_ACCEPT_SUCCESS,
            result,
            'Đã chấp nhận lời mời thành công',
        );
    }

    @Post(':id/members/reject')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Từ chối lời mời' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
    async rejectInvite(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.rejectInvite(id, userId, lang);
        return new OkResponse(
            ResponseCode.ORGANIZATION_MEMBER_REJECT_SUCCESS,
            undefined,
            'Đã từ chối lời mời thành công',
        );
    }

    @Get(':id/members')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Lấy danh sách thành viên' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    @ApiQuery({ name: 'is_accepted', required: false, type: Boolean })
    async getMembers(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('limit') limit: number,
        @Query('offset') offset: number,
        @Query('is_accepted') is_accepted: boolean,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.getMembers(id, userId, { limit, offset, is_accepted }, lang);
        return new GetResponse(
            ResponseCode.ORGANIZATION_MEMBER_LIST_SUCCESS,
            result,
            'Lấy danh sách thành viên thành công',
        );
    }

    @Put(':id/members/:memberId/roles')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Gán vai trò cho thành viên' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
    @ApiParam({ name: 'memberId', description: 'ID thành viên' })
    async assignMemberRoles(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('memberId', ParseUUIDPipe) memberId: string,
        @Body() dto: AssignMemberRolesDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.assignMemberRoles(id, memberId, dto, userId, lang);
        return new UpdatedResponse(
            ResponseCode.ORGANIZATION_MEMBER_ROLE_ASSIGN_SUCCESS,
            result,
            'Đã gán vai trò cho thành viên thành công',
        );
    }

    @Put(':id/members/:memberId/permissions')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Gán quyền cho thành viên' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
    @ApiParam({ name: 'memberId', description: 'ID thành viên' })
    async assignMemberPermissions(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('memberId', ParseUUIDPipe) memberId: string,
        @Body() dto: AssignMemberPermissionsDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.assignMemberPermissions(id, memberId, dto, userId, lang);
        return new UpdatedResponse(
            ResponseCode.ORGANIZATION_MEMBER_PERMISSION_ASSIGN_SUCCESS,
            result,
            'Đã gán quyền cho thành viên thành công',
        );
    }

    @Delete(':id/members/:memberId')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Xóa thành viên' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
    @ApiParam({ name: 'memberId', description: 'ID thành viên' })
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
            'Đã xóa thành viên thành công',
        );
    }

    @Get(':id/permissions')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Lấy danh sách quyền của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID tổ chức' })
    async getPermissions(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.getPermissions(id, userId, lang);
        return new GetResponse(
            ResponseCode.ORGANIZATION_ROLE_LIST_SUCCESS,
            result,
            'Lấy danh sách quyền thành công',
        );
    }
}
