import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { WarehouseManagerService } from './warehouse-manager.service';
import { AssignWarehouseManagerDto, UpdateWarehouseManagerDto } from './dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Warehouse Managers')
@Controller('warehouse-managers')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class WarehouseManagerController {
    constructor(private readonly warehouseManagerService: WarehouseManagerService) { }

    @Post('assign')
    @RequirePermission('warehouse_manager.assign')
    @ApiOperation({ summary: 'Assign a manager to a warehouse template' })
    assign(@Body() dto: AssignWarehouseManagerDto, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseManagerService.assignManager(dto, req.user.id, lang);
    }

    @Get()
    @RequirePermission('warehouse_manager.list')
    @ApiOperation({ summary: 'Get all warehouse managers (with filter by template)' })
    findAll(@Query() query: any) {
        return this.warehouseManagerService.findAllManagers(query);
    }

    @Get(':id')
    @RequirePermission('warehouse_manager.read')
    @ApiOperation({ summary: 'Get a warehouse manager by id' })
    findOne(@Param('id') id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseManagerService.findManagerById(id, lang);
    }

    @Patch(':id')
    @RequirePermission('warehouse_manager.update')
    @ApiOperation({ summary: 'Update a warehouse manager' })
    update(@Param('id') id: string, @Body() dto: UpdateWarehouseManagerDto, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseManagerService.updateManager(id, dto, req.user.id, lang);
    }

    @Delete(':id')
    @RequirePermission('warehouse_manager.remove')
    @ApiOperation({ summary: 'Remove a warehouse manager' })
    remove(@Param('id') id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseManagerService.removeManager(id, req.user.id, lang);
    }
}
