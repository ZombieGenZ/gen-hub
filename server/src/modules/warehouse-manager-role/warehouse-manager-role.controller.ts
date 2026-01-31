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
        examples: {
            example_1: {
                summary: 'Vai trò quản lý nhập kho',
                description: 'Vai trò chỉ có quyền nhập kho',
                value: {
                    name: 'Quản lý Nhập Kho',
                    description: 'Chỉ quản lý nhập hàng vào kho',
                    permission_ids: ['uuid-perm-1', 'uuid-perm-2']
                }
            },
            example_2: {
                summary: 'Vai trò quản lý toàn diện',
                description: 'Vai trò có đầy đủ quyền hạn',
                value: {
                    name: 'Trưởng Kho',
                    description: 'Quản lý toàn bộ hoạt động kho',
                    permission_ids: ['uuid-perm-1', 'uuid-perm-2', 'uuid-perm-3']
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
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'b2f76b83-ce55-49bc-955c-4ddf49bc955c' },
                        name: { type: 'string', example: 'Quản lý Nhập Kho' },
                        description: { type: 'string', example: 'Chỉ quản lý nhập hàng vào kho' },
                        status: { type: 'string', example: 'ACTIVE' },
                        created_at: { type: 'string', format: 'date-time' },
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: 409,
        description: 'Tên vai trò đã tồn tại',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager_role.already_exists' },
                message: { type: 'string', example: 'Tên vai trò đã tồn tại' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    create(@Body() dto: CreateWarehouseManagerRoleDto) {
        return this.warehouseManagerRoleService.createRole(dto);
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
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager_role.list_success' },
                message: { type: 'string', example: 'Lấy danh sách vai trò thành công' },
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
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    permissions: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                name: { type: 'string' },
                                                code: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                total: { type: 'number' },
                                page: { type: 'number' },
                                limit: { type: 'number' },
                                totalPages: { type: 'number' },
                            }
                        }
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
    @ApiOperation({
        summary: 'Lấy danh sách quyền hạn',
        description: 'Lấy danh sách tất cả các quyền hạn có thể gán cho vai trò quản lý kho.',
    })
    @ApiAuthResponses()
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách quyền hạn thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager_role.permissions_list_success' },
                message: { type: 'string', example: 'Lấy danh sách quyền hạn thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            code: { type: 'string', example: 'warehouse.create' },
                            name: { type: 'string', example: 'Tạo kho' },
                            module: { type: 'string', example: 'WAREHOUSE' },
                            description: { type: 'string' }
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
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager_role.get_success' },
                message: { type: 'string', example: 'Lấy thông tin vai trò thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        permissions: { type: 'array', items: { type: 'object' } },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy vai trò',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager_role.not_found' },
                message: { type: 'string', example: 'Không tìm thấy vai trò' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasAll = await this.hasPermission(req.user.id, 'warehouse-manager-role.read.all');
        // TODO: Pass ownerId logic if needed in future
        return this.warehouseManagerRoleService.findRoleById(id, lang);
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
    @ApiBody({
        type: UpdateWarehouseManagerRoleDto,
        description: 'Thông tin cần cập nhật',
        examples: {
            example_1: {
                summary: 'Cập nhật quyền hạn',
                value: {
                    name: 'Quản lý Kho A (Updated)',
                    description: 'Mô tả mới',
                    permission_ids: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11']
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager_role.update_success' },
                message: { type: 'string', example: 'Cập nhật vai trò thành công' },
                success: { type: 'boolean', example: true },
                data: { type: 'object' },
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy vai trò',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager_role.not_found' },
                message: { type: 'string', example: 'Không tìm thấy vai trò' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseManagerRoleDto, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasAll = await this.hasPermission(req.user.id, 'warehouse-manager-role.update.all');
        return this.warehouseManagerRoleService.updateRole(id, dto, lang);
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
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager_role.delete_success' },
                message: { type: 'string', example: 'Xóa vai trò thành công' },
                success: { type: 'boolean', example: true },
                data: { type: 'null' },
            }
        }
    })
    @ApiResponse({
        status: 409,
        description: 'Vai trò đang được sử dụng',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager_role.in_use' },
                message: { type: 'string', example: 'Vai trò đang được gán cho user, không thể xóa' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy vai trò',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager_role.not_found' },
                message: { type: 'string', example: 'Không tìm thấy vai trò' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasAll = await this.hasPermission(req.user.id, 'warehouse-manager-role.delete.all');
        return this.warehouseManagerRoleService.deleteRole(id, req.user.id, lang);
    }
}
