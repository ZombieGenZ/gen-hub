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
    Req,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiQuery,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import type { Request } from 'express';

import { RoleService } from './role.service';
import {
    CreateRoleDto,
    UpdateRoleDto,
    QueryRoleDto,
} from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';
import { IRoleListResult, IRoleWithPermissions } from './interfaces';
import { Role } from '@prisma/client';

@ApiTags('Roles')
@Controller('roles')
export class RoleController {
    constructor(private readonly service: RoleService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('role.create')
    @ApiOperation({
        summary: 'Tạo role mới',
        description: 'Tạo một role (vai trò) mới trong hệ thống với tên, mô tả và danh sách permissions. Yêu cầu quyền `role.create`.',
    })
    @ApiBody({
        type: CreateRoleDto,
        description: 'Thông tin role cần tạo',
        examples: {
            basic_role: {
                summary: 'Role cơ bản',
                value: {
                    name: 'Nhân viên kho',
                    description: 'Role cho nhân viên quản lý kho hàng',
                    permissions: ['warehouse.read', 'warehouse.update'],
                },
            },
            admin_role: {
                summary: 'Role quản trị',
                value: {
                    name: 'Quản lý',
                    description: 'Role cho quản lý với nhiều quyền hơn',
                    permissions: ['user.read', 'user.create', 'role.read', 'warehouse.admin'],
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo role thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'role.create.success' },
                message: { type: 'string', example: 'Tạo role thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
                        name: { type: 'string', example: 'Nhân viên kho' },
                        description: { type: 'string', example: 'Role cho nhân viên quản lý kho hàng' },
                        is_system: { type: 'boolean', example: false },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc tên role đã tồn tại' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async create(
        @Body() dto: CreateRoleDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ): Promise<CreatedResponse<Role>> {
        const result = await this.service.create(dto, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new CreatedResponse(ResponseCode.ROLE_CREATE_SUCCESS, result);
    }

    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('role.read')
    @ApiOperation({
        summary: 'Lấy danh sách roles',
        description: 'Lấy danh sách tất cả roles trong hệ thống với phân trang và tìm kiếm. Yêu cầu quyền `role.read`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng tối đa', example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Tìm kiếm theo tên role' })
    @ApiResponse({
        status: 200,
        description: 'Danh sách roles',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'role.list.success' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: { type: 'array', items: { type: 'object' } },
                        total: { type: 'number', example: 10 },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    async findMany(
        @Query() query: QueryRoleDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IRoleListResult>> {
        const result = await this.service.findMany(query, lang);
        return new GetResponse(ResponseCode.ROLE_LIST_SUCCESS, result);
    }

    @Get(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('role.read')
    @ApiOperation({
        summary: 'Lấy chi tiết role',
        description: 'Lấy thông tin chi tiết của một role bao gồm danh sách permissions được gán. Yêu cầu quyền `role.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID của role (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiResponse({ status: 200, description: 'Chi tiết role với danh sách permissions' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy role' })
    @ApiAuthResponses()
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IRoleWithPermissions>> {
        const result = await this.service.findById(id, lang);
        return new GetResponse(ResponseCode.ROLE_GET_SUCCESS, result);
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('role.update')
    @ApiOperation({
        summary: 'Cập nhật role',
        description: 'Cập nhật thông tin role và danh sách permissions. Role hệ thống (is_system=true) không thể xóa nhưng có thể cập nhật permissions. Yêu cầu quyền `role.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID của role (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiBody({
        type: UpdateRoleDto,
        description: 'Thông tin cập nhật (partial update)',
        examples: {
            update_name: { summary: 'Cập nhật tên', value: { name: 'Tên role mới' } },
            update_permissions: { summary: 'Cập nhật permissions', value: { permissions: ['warehouse.read', 'warehouse.create', 'warehouse.update'] } },
        },
    })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy role' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRoleDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ): Promise<UpdatedResponse<Role>> {
        const result = await this.service.update(id, dto, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new UpdatedResponse(ResponseCode.ROLE_UPDATE_SUCCESS, result);
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('role.delete')
    @ApiOperation({
        summary: 'Xóa nhiều roles',
        description: 'Xóa nhiều roles cùng lúc. Không thể xóa role hệ thống (is_system=true). Yêu cầu quyền `role.delete`.',
    })
    @ApiBody({
        type: DeleteManyDto,
        description: 'Danh sách ID roles cần xóa',
        examples: {
            delete_multiple: {
                summary: 'Xóa 2 roles',
                value: { ids: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'] },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 400, description: 'Không thể xóa role hệ thống' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async deleteMany(
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ): Promise<DeletedResponse<null>> {
        await this.service.deleteMany(dto.ids, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse(ResponseCode.ROLE_DELETE_SUCCESS, null);
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('role.delete')
    @ApiOperation({
        summary: 'Xóa role',
        description: 'Xóa một role theo ID. Không thể xóa role hệ thống (is_system=true) hoặc role đang được gán cho users. Yêu cầu quyền `role.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID của role (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 400, description: 'Không thể xóa role hệ thống hoặc role đang được sử dụng' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy role' })
    @ApiAuthResponses()
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ): Promise<DeletedResponse<null>> {
        await this.service.delete(id, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse(ResponseCode.ROLE_DELETE_SUCCESS, null);
    }
}
