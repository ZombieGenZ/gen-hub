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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { OrganizationService } from './organization.service';
import {
    CreateOrganizationRoleDto,
    UpdateOrganizationRoleDto,
} from './dto';
import { DeleteManyDto } from '../../common/dto';
import { CurrentUser, RequirePermission } from '../../common/decorators';
import { PermissionGuard } from '../../common/guards';
import {
    CreatedResponse,
    GetResponse,
    UpdatedResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';

@ApiTags('Organization Roles')
@ApiBearerAuth()
@Controller('organizations/:orgId/roles')
@UseGuards(PermissionGuard)
export class OrganizationRoleController {
    constructor(private readonly service: OrganizationService) { }

    @Post()
    @RequirePermission('organization.list')
    @ApiOperation({ summary: 'Tạo vai trò mới trong tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
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
            'Tạo vai trò thành công',
        );
    }

    @Get()
    @RequirePermission('organization.list')
    @ApiOperation({ summary: 'Lấy danh sách vai trò của tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    async findMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.getRoles(orgId, userId, lang);
        return new GetResponse(
            ResponseCode.ORGANIZATION_ROLE_LIST_SUCCESS,
            result,
            'Lấy danh sách vai trò thành công',
        );
    }

    @Get(':roleId')
    @RequirePermission('organization.list')
    @ApiOperation({ summary: 'Lấy chi tiết vai trò' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'roleId', description: 'ID vai trò' })
    async findById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('roleId', ParseUUIDPipe) roleId: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.getRoleById(orgId, roleId, userId, lang);
        return new GetResponse(
            ResponseCode.ORGANIZATION_ROLE_LIST_SUCCESS,
            result,
            'Lấy chi tiết vai trò thành công',
        );
    }

    @Put(':roleId')
    @RequirePermission('organization.list')
    @ApiOperation({ summary: 'Cập nhật vai trò' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'roleId', description: 'ID vai trò' })
    async update(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('roleId', ParseUUIDPipe) roleId: string,
        @Body() dto: UpdateOrganizationRoleDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.updateRole(orgId, roleId, dto, userId, lang);
        return new UpdatedResponse(
            ResponseCode.ORGANIZATION_ROLE_UPDATE_SUCCESS,
            result,
            'Cập nhật vai trò thành công',
        );
    }

    @Delete(':roleId')
    @RequirePermission('organization.list')
    @ApiOperation({ summary: 'Xóa vai trò' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'roleId', description: 'ID vai trò' })
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
            'Xóa vai trò thành công',
        );
    }

    @Delete('delete/many')
    @RequirePermission('organization.list')
    @ApiOperation({ summary: 'Xóa nhiều vai trò' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiBody({ type: DeleteManyDto })
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
            'Xóa nhiều vai trò thành công',
        );
    }
}
