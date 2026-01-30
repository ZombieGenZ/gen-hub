import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { WarehouseManagerRoleService } from './warehouse-manager-role.service';
import { CreateWarehouseManagerRoleDto, UpdateWarehouseManagerRoleDto } from './dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequireAnyPermission } from '../../common/decorators/require-any-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Warehouse Manager Roles')
@Controller('warehouse-manager-roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
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
    @ApiOperation({ summary: 'Create a new warehouse manager role', description: 'Tạo vai trò quản lý kho mới với các quyền hạn cụ thể' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBody({
        type: CreateWarehouseManagerRoleDto,
        description: 'Thông tin vai trò mới',
        examples: {
            example_1: {
                summary: 'Vai trò quản lý kho',
                value: {
                    name: 'Quản lý Kho A',
                    description: 'Chỉ quản lý nhập xuất kho A',
                    permission_ids: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1fde99-8d0c-4fa2-bc7e-7cc8be491b22']
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo vai trò thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager_role.create_success' },
                message: { type: 'string', example: 'Tạo vai trò thành công' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        status: { type: 'string', example: 'ACTIVE' }
                    }
                }
            }
        }
    })
    create(@Body() dto: CreateWarehouseManagerRoleDto) {
        return this.warehouseManagerRoleService.createRole(dto);
    }

    @Get()
    @RequireAnyPermission('warehouse-manager-role.list', 'warehouse-manager-role.list.all')
    @ApiOperation({ summary: 'Get all warehouse manager roles', description: 'Lấy danh sách các vai trò quản lý kho' })
    @ApiAuthResponses()
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Tìm kiếm theo tên hoặc mô tả' })
    @ApiResponse({
        status: 200,
        description: 'Danh sách vai trò',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string' },
                            permissions: { type: 'array', items: { type: 'object' } }
                        }
                    }
                },
                meta: {
                    type: 'object',
                    properties: {
                        total: { type: 'number' },
                        page: { type: 'number' },
                        limit: { type: 'number' },
                    }
                }
            }
        }
    })
    async findAll(@Query() query: any, @Request() req: any) {
        // Tạm thời chưa filter theo ownerId cho roles vì logic roles thường là system wide
        // Nhưng vẫn update decorator để chuẩn hóa
        return this.warehouseManagerRoleService.findAllRoles(query);
    }

    @Get('permissions')
    @RequireAnyPermission('warehouse-manager-role.list', 'warehouse-manager-role.list.all')
    @ApiOperation({ summary: 'Get all warehouse manager permissions', description: 'Lấy danh sách tất cả các quyền hạn có thể gán cho vai trò' })
    @ApiAuthResponses()
    @ApiResponse({
        status: 200,
        description: 'Danh sách quyền hạn',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            code: { type: 'string' },
                            name: { type: 'string' },
                            module: { type: 'string' }
                        }
                    }
                }
            }
        }
    })
    findAllPermissions() {
        return this.warehouseManagerRoleService.findAllPermissions();
    }

    @Get(':id')
    @RequireAnyPermission('warehouse-manager-role.read', 'warehouse-manager-role.read.all')
    @ApiOperation({ summary: 'Get a warehouse manager role by id', description: 'Lấy thông tin chi tiết của một vai trò' })
    @ApiAuthResponses()
    @ApiParam({ name: 'id', description: 'ID của vai trò' })
    @ApiResponse({
        status: 200,
        description: 'Thông tin chi tiết vai trò',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                permissions: { type: 'array', items: { type: 'object' } }
            }
        }
    })
    async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasAll = await this.hasPermission(req.user.id, 'warehouse-manager-role.read.all');
        // TODO: Pass ownerId logic if needed in future
        return this.warehouseManagerRoleService.findRoleById(id, lang);
    }

    @Patch(':id')
    @RequireAnyPermission('warehouse-manager-role.update', 'warehouse-manager-role.update.all')
    @ApiOperation({ summary: 'Update a warehouse manager role', description: 'Cập nhật thông tin vai trò (tên, mô tả, quyền hạn)' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({ name: 'id', description: 'ID của vai trò' })
    @ApiBody({
        type: UpdateWarehouseManagerRoleDto,
        examples: {
            example_1: {
                summary: 'Cập nhật quyền hạn',
                value: {
                    name: 'Quản lý Kho A (Updated)',
                    permission_ids: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11']
                }
            }
        }
    })
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseManagerRoleDto, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasAll = await this.hasPermission(req.user.id, 'warehouse-manager-role.update.all');
        return this.warehouseManagerRoleService.updateRole(id, dto, lang);
    }

    @Delete(':id')
    @RequireAnyPermission('warehouse-manager-role.delete', 'warehouse-manager-role.delete.all')
    @ApiOperation({ summary: 'Delete a warehouse manager role', description: 'Xóa vai trò quản lý kho' })
    @ApiAuthResponses()
    @ApiParam({ name: 'id', description: 'ID của vai trò' })
    async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasAll = await this.hasPermission(req.user.id, 'warehouse-manager-role.delete.all');
        return this.warehouseManagerRoleService.deleteRole(id, req.user.id, lang);
    }
}
