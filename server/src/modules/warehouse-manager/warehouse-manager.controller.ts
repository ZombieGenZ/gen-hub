import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { WarehouseManagerService } from './warehouse-manager.service';
import { AssignWarehouseManagerDto, UpdateWarehouseManagerDto } from './dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission, RequireAnyPermission, CurrentUser } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Warehouse Managers')
@Controller('warehouse-managers')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class WarehouseManagerController {
    constructor(
        private readonly warehouseManagerService: WarehouseManagerService,
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

    @Post('assign')
    @RequirePermission('warehouse-manager.create')
    @ApiOperation({ summary: 'Assign a manager to a warehouse template', description: 'Phân công một user làm quản lý cho một kho mẫu.' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBody({
        type: AssignWarehouseManagerDto,
        description: 'Thông tin phân công quản lý',
        examples: {
            example_1: {
                summary: 'Phân công cơ bản',
                description: 'Phân công quản lý với các vai trò cụ thể',
                value: {
                    warehouse_template_id: '550e8400-e29b-41d4-a716-446655440000',
                    user_id: '123e4567-e89b-12d3-a456-426614174000',
                    phone: '0901234567',
                    notes: 'Quản lý kho chính',
                    role_ids: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11']
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Phân công quản lý thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager.assign_success' },
                message: { type: 'string', example: 'Phân công quản lý thành công' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'b2f76b83-ce55-49bc-955c-4ddf49bc955c' },
                        warehouse_template_id: { type: 'string' },
                        user_id: { type: 'string' },
                        phone: { type: 'string' },
                        notes: { type: 'string' },
                        status: { type: 'string', example: 'ACTIVE' },
                    }
                }
            }
        }
    })
    assign(@Body() dto: AssignWarehouseManagerDto, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseManagerService.assignManager(dto, req.user.id, lang);
    }

    @Get()
    @RequireAnyPermission('warehouse-manager.list', 'warehouse-manager.list.all')
    @ApiOperation({ summary: 'Get all warehouse managers', description: 'Lấy danh sách quản lý kho (có thể lọc theo template)' })
    @ApiAuthResponses()
    @ApiQuery({ name: 'templateId', required: false, description: 'Lọc theo ID kho mẫu' })
    @ApiQuery({ name: 'userId', required: false, description: 'Lọc theo ID user' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiResponse({
        status: 200,
        description: 'Danh sách quản lý kho',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            user: { type: 'object', properties: { id: { type: 'string' }, full_name: { type: 'string' } } },
                            warehouse_template: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
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
    })
    async findAll(@Query() query: any, @CurrentUser('userId') userId: string) {
        const hasListAll = await this.hasPermission(userId, 'warehouse-manager.list.all');
        return this.warehouseManagerService.findAllManagers(query, hasListAll ? undefined : userId);
    }

    @Get(':id')
    @RequireAnyPermission('warehouse-manager.read', 'warehouse-manager.read.all')
    @ApiOperation({ summary: 'Get a warehouse manager by id', description: 'Lấy thông tin chi tiết của một quản lý kho' })
    @ApiAuthResponses()
    @ApiParam({ name: 'id', description: 'ID của quản lý kho' })
    @ApiResponse({
        status: 200,
        description: 'Thông tin chi tiết quản lý kho',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                user_id: { type: 'string' },
                notes: { type: 'string' },
                roles: { type: 'array', items: { type: 'object' } },
            }
        }
    })
    async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('userId') userId: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasReadAll = await this.hasPermission(userId, 'warehouse-manager.read.all');
        return this.warehouseManagerService.findManagerById(id, lang, hasReadAll ? undefined : userId);
    }

    @Patch(':id')
    @RequireAnyPermission('warehouse-manager.update', 'warehouse-manager.update.all')
    @ApiOperation({ summary: 'Update a warehouse manager', description: 'Cập nhật thông tin quản lý kho (SĐT, ghi chú, vai trò)' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({ name: 'id', description: 'ID của quản lý kho' })
    @ApiBody({
        type: UpdateWarehouseManagerDto,
        examples: {
            example_1: {
                summary: 'Cập nhật ghi chú và vai trò',
                value: {
                    notes: 'Cập nhật ghi chú mới',
                    role_ids: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1fde99-8d0c-4fa2-bc7e-7cc8be491b22']
                }
            }
        }
    })
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseManagerDto, @CurrentUser('userId') userId: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasUpdateAll = await this.hasPermission(userId, 'warehouse-manager.update.all');
        return this.warehouseManagerService.updateManager(id, dto, userId, lang, hasUpdateAll ? undefined : userId);
    }

    @Delete(':id')
    @RequireAnyPermission('warehouse-manager.delete', 'warehouse-manager.delete.all')
    @ApiOperation({ summary: 'Remove a warehouse manager', description: 'Xóa phân công quản lý kho' })
    @ApiAuthResponses()
    @ApiParam({ name: 'id', description: 'ID của quản lý kho' })
    @ApiResponse({
        status: 200,
        description: 'Xóa thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_manager.delete_success' },
                message: { type: 'string', example: 'Xóa quản lý kho thành công' },
            }
        }
    })
    async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('userId') userId: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasDeleteAll = await this.hasPermission(userId, 'warehouse-manager.delete.all');
        return this.warehouseManagerService.removeManager(id, userId, lang, hasDeleteAll ? undefined : userId);
    }
}
