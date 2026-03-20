import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { WarehouseManagerRoleService } from './warehouse-manager-role.service';
import { CreateWarehouseManagerRoleDto, UpdateWarehouseManagerRoleDto } from './dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequireAnyPermission } from '../../common/decorators/require-any-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatedResponse, GetResponse, OkResponse, ResponseCode, UpdatedResponse, DeletedResponse } from '../../common/responses';

@ApiTags('Warehouse Manager Roles')
@Controller('warehouse-manager-roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class WarehouseManagerRoleController {
    constructor(
        private readonly warehouseManagerRoleService: WarehouseManagerRoleService,
        private readonly prisma: PrismaService,
    ) { }

    private async hasPermission(userId: string, permission: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                system_roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user || !user.system_roles) return false;

        return user.system_roles.some(userRole =>
            userRole.role?.permissions.some(p => p.permission.key === permission)
        );
    }

    @Post()
    @RequireAnyPermission('warehouse-manager-role.create')
    @ApiOperation({
        summary: 'Tạo vai trò quản lý kho mới',
        description:
            'Tạo mới một vai trò quản lý kho với danh sách quyền hạn cụ thể. ' +
            'Yêu cầu quyền `warehouse-manager-role.create`.',
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBody({
        type: CreateWarehouseManagerRoleDto,
        description: 'Thông tin vai trò mới',
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo vai trò thành công',
    })
    async create(@Body() dto: CreateWarehouseManagerRoleDto) {
        const data = await this.warehouseManagerRoleService.createRole(dto);
        return new CreatedResponse(ResponseCode.WAREHOUSE_MANAGER_ROLE_CREATE_SUCCESS, data, 'Tạo vai trò thành công');
    }

    @Get()
    @RequireAnyPermission('warehouse-manager-role.list', 'warehouse-manager-role.list.all')
    @ApiOperation({
        summary: 'Lấy danh sách vai trò quản lý kho',
        description: 'Lấy danh sách các vai trò quản lý kho có phân trang và tìm kiếm.',
    })
    @ApiAuthResponses()
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Trang hiện tại (mặc định: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Số lượng record mỗi trang (mặc định: 10)' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Tìm kiếm theo tên hoặc mô tả', example: 'Quản lý' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
    })
    async findAll(@Query() query: any) {
        const data = await this.warehouseManagerRoleService.findAllRoles(query);
        return new GetResponse(ResponseCode.WAREHOUSE_MANAGER_ROLE_LIST_SUCCESS, data, 'Lấy danh sách vai trò thành công');
    }

    @Get('permissions')
    @RequireAnyPermission('warehouse-manager-role.list', 'warehouse-manager-role.list.all')
    @ApiOperation({
        summary: 'Lấy danh sách quyền hạn',
        description: 'Lấy danh sách tất cả các quyền hạn có thể gán cho vai trò quản lý kho.',
    })
    @ApiAuthResponses()
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách quyền hạn thành công',
    })
    async findAllPermissions() {
        const data = await this.warehouseManagerRoleService.findAllPermissions();
        return new GetResponse(ResponseCode.WAREHOUSE_MANAGER_ROLE_PERMISSIONS_LIST_SUCCESS, data, 'Lấy danh sách quyền hạn thành công');
    }

    @Get(':id')
    @RequireAnyPermission('warehouse-manager-role.read', 'warehouse-manager-role.read.all')
    @ApiOperation({
        summary: 'Lấy chi tiết vai trò',
        description: 'Lấy thông tin chi tiết của một vai trò bao gồm danh sách quyền hạn đã được gán.',
    })
    @ApiAuthResponses()
    @ApiParam({
        name: 'id',
        type: 'string',
        description: 'ID của vai trò (UUID)',
        example: 'b2f76b83-ce55-49bc-955c-4ddf49bc955c'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết thành công',
    })
    async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const data = await this.warehouseManagerRoleService.findRoleById(id, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_MANAGER_ROLE_GET_SUCCESS, data, 'Lấy thông tin vai trò thành công');
    }

    @Patch(':id')
    @RequireAnyPermission('warehouse-manager-role.update', 'warehouse-manager-role.update.all')
    @ApiOperation({
        summary: 'Cập nhật vai trò',
        description: 'Cập nhật thông tin vai trò (tên, mô tả, quyền hạn).',
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({
        name: 'id',
        type: 'string',
        description: 'ID của vai trò (UUID)',
        example: 'b2f76b83-ce55-49bc-955c-4ddf49bc955c'
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật thành công',
    })
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseManagerRoleDto, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const data = await this.warehouseManagerRoleService.updateRole(id, dto, lang);
        return new UpdatedResponse(ResponseCode.WAREHOUSE_MANAGER_ROLE_UPDATE_SUCCESS, data, 'Cập nhật vai trò thành công');
    }

    @Delete(':id')
    @RequireAnyPermission('warehouse-manager-role.delete', 'warehouse-manager-role.delete.all')
    @ApiOperation({
        summary: 'Xóa vai trò',
        description: 'Xóa vai trò quản lý kho (Soft delete). Lưu ý: Không thể xóa vai trò đang được gán cho user.',
    })
    @ApiAuthResponses()
    @ApiParam({
        name: 'id',
        type: 'string',
        description: 'ID của vai trò (UUID)',
        example: 'b2f76b83-ce55-49bc-955c-4ddf49bc955c'
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa thành công',
    })
    async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        await this.warehouseManagerRoleService.deleteRole(id, req.user.id, lang);
        return new DeletedResponse(ResponseCode.WAREHOUSE_MANAGER_ROLE_DELETE_SUCCESS, null, 'Xóa vai trò thành công');
    }
}

}
