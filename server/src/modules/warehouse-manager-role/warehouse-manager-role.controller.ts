import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { WarehouseManagerRoleService } from './warehouse-manager-role.service';
import { CreateWarehouseManagerRoleDto, UpdateWarehouseManagerRoleDto } from './dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Warehouse Manager Roles')
@Controller('warehouse-manager-roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class WarehouseManagerRoleController {
    constructor(private readonly warehouseManagerRoleService: WarehouseManagerRoleService) { }

    @Post()
    @RequirePermission('warehouse_manager_role.create')
    @ApiOperation({ summary: 'Create a new warehouse manager role' })
    create(@Body() dto: CreateWarehouseManagerRoleDto) {
        return this.warehouseManagerRoleService.createRole(dto);
    }

    @Get()
    @RequirePermission('warehouse_manager_role.list')
    @ApiOperation({ summary: 'Get all warehouse manager roles' })
    findAll(@Query() query: any) {
        return this.warehouseManagerRoleService.findAllRoles(query);
    }

    @Get('permissions')
    @RequirePermission('warehouse_manager_role.list')
    @ApiOperation({ summary: 'Get all warehouse manager permissions' })
    findAllPermissions() {
        return this.warehouseManagerRoleService.findAllPermissions();
    }

    @Get(':id')
    @RequirePermission('warehouse_manager_role.read')
    @ApiOperation({ summary: 'Get a warehouse manager role by id' })
    findOne(@Param('id') id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseManagerRoleService.findRoleById(id, lang);
    }

    @Patch(':id')
    @RequirePermission('warehouse_manager_role.update')
    @ApiOperation({ summary: 'Update a warehouse manager role' })
    update(@Param('id') id: string, @Body() dto: UpdateWarehouseManagerRoleDto, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseManagerRoleService.updateRole(id, dto, lang);
    }

    @Delete(':id')
    @RequirePermission('warehouse_manager_role.delete')
    @ApiOperation({ summary: 'Delete a warehouse manager role' })
    remove(@Param('id') id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseManagerRoleService.deleteRole(id, req.user.id, lang);
    }
}
