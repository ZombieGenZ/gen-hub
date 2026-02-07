import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
    ApiBody,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { PermissionService } from './permission.service';
import { QueryPermissionDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import { GetResponse, ResponseCode } from '../../common/responses';
import { IPermissionListResult, IPermissionWithAssignmentListResult } from './interfaces';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionController {
    constructor(private readonly service: PermissionService) { }

    /**
     * Lấy danh sách modules (prefix) duy nhất từ permission keys
     */
    @Get('modules')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('permission.read')
    @ApiOperation({
        summary: 'Lấy danh sách modules',
        description: 'Trả về danh sách các module (prefix của permission key) duy nhất. Ví dụ: từ `user.create`, `user.read`, `role.create` sẽ trả về `["user", "role"]`. Yêu cầu quyền `permission.read`.',
    })
    @ApiResponse({
        status: 200,
        description: 'Danh sách modules',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'permission.list.success' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['user', 'role', 'permission', 'warehouse', 'organization'],
                },
            },
        },
    })
    @ApiAuthResponses()
    async getModules(): Promise<GetResponse<string[]>> {
        const result = await this.service.getModules();
        return new GetResponse(ResponseCode.PERMISSION_LIST_SUCCESS, result);
    }

    /**
     * Lấy danh sách permissions trong hệ thống
     */
    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('permission.read')
    @ApiOperation({
        summary: 'Lấy danh sách permissions',
        description: 'Lấy danh sách tất cả permissions trong hệ thống. Nếu truyền thêm `type` (role/user) và `id` sẽ trả về permissions với trạng thái `is_assigned` để biết permission đã được gán cho role/user đó chưa. Yêu cầu quyền `permission.read`.',
    })
    @ApiQuery({ name: 'module', required: false, type: String, description: 'Lọc theo module (prefix)', example: 'user' })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Tìm kiếm theo tên permission' })
    @ApiQuery({ name: 'type', required: false, enum: ['role', 'user'], description: 'Loại đối tượng để kiểm tra assignment' })
    @ApiQuery({ name: 'id', required: false, type: String, description: 'ID của role/user để kiểm tra assignment' })
    @ApiResponse({
        status: 200,
        description: 'Danh sách permissions',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'permission.list.success' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    key: { type: 'string', example: 'user.create' },
                                    name: { type: 'string', example: 'Tạo người dùng' },
                                    description: { type: 'string' },
                                    module: { type: 'string', example: 'user' },
                                    is_assigned: { type: 'boolean', description: 'Chỉ có khi truyền type và id' },
                                },
                            },
                        },
                        total: { type: 'number', example: 50 },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    async findMany(
        @Query() query: QueryPermissionDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IPermissionListResult | IPermissionWithAssignmentListResult>> {
        const result = await this.service.findMany(query, lang);
        return new GetResponse(ResponseCode.PERMISSION_LIST_SUCCESS, result);
    }

    /**
     * Lấy danh sách permission IDs theo role IDs
     */
    @Post('by-roles')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('permission.read')
    @ApiOperation({
        summary: 'Lấy permission IDs theo role IDs',
        description: 'Trả về danh sách permission IDs được gán cho các roles được chỉ định. Dùng cho frontend để tính toán permissions kế thừa từ roles. Yêu cầu quyền `permission.read`.',
    })
    @ApiBody({
        description: 'Danh sách role IDs',
        schema: {
            type: 'object',
            properties: {
                role_ids: { type: 'array', items: { type: 'string' }, example: ['role-uuid-1', 'role-uuid-2'] },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Danh sách permission IDs',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'permission.list.success' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['perm-uuid-1', 'perm-uuid-2', 'perm-uuid-3'],
                },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async getPermissionIdsByRoleIds(
        @Body() dto: { role_ids: string[] },
    ): Promise<GetResponse<string[]>> {
        const result = await this.service.getPermissionIdsByRoleIds(dto.role_ids);
        return new GetResponse(ResponseCode.PERMISSION_LIST_SUCCESS, result);
    }
}
