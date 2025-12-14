import {
    Controller,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { WarehouseService } from './warehouse.service';
import { UpdateWarehouseDto, QueryWarehouseDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, RequireOrgPermission } from '../../common/decorators';
import { GetResponse, UpdatedResponse, DeletedResponse } from '../../common/responses';

@ApiTags('Warehouses')
@ApiBearerAuth()
@Controller('warehouses')
@UseGuards(JwtAuthGuard)
export class WarehouseController {
    constructor(private readonly warehouseService: WarehouseService) { }

    /**
     * Lấy danh sách warehouse
     */
    @Get()
    @UseGuards(PermissionGuard)
    @RequirePermission('warehouse.list')
    @ApiOperation({ summary: 'Lấy danh sách warehouse' })
    async findMany(
        @Query() query: QueryWarehouseDto,
        @Request() req: any,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.findMany(query, req.user.id);
        return new GetResponse('warehouse.list.success', data, 'Lấy danh sách kho thành công');
    }

    /**
     * Lấy chi tiết warehouse
     */
    @Get(':id')
    @UseGuards(PermissionGuard)
    @RequirePermission('warehouse.read')
    @ApiOperation({ summary: 'Lấy chi tiết warehouse' })
    async findById(
        @Param('id') id: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.findById(id, lang);
        return new GetResponse('warehouse.read.success', data, 'Lấy thông tin kho thành công');
    }

    /**
     * Lấy layout warehouse
     */
    @Get(':id/layout')
    @UseGuards(PermissionGuard)
    @RequirePermission('warehouse.layout.view')
    @ApiOperation({ summary: 'Lấy layout warehouse' })
    async getLayout(
        @Param('id') id: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.getLayout(id, lang);
        return new GetResponse('warehouse.layout.success', data, 'Lấy layout kho thành công');
    }

    /**
     * Cập nhật warehouse (chỉ name/description)
     */
    @Put(':id')
    @UseGuards(PermissionGuard)
    @RequireOrgPermission('warehouse.update')
    @ApiOperation({ summary: 'Cập nhật warehouse' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateWarehouseDto,
        @Request() req: any,
        @I18nLang() lang: string,
    ) {
        const organizationId = req.headers['x-organization-id'];
        const data = await this.warehouseService.update(id, dto, req.user.id, organizationId, lang);
        return new UpdatedResponse('warehouse.update.success', data, 'Cập nhật kho thành công');
    }

    /**
     * Xóa warehouse
     */
    @Delete(':id')
    @UseGuards(PermissionGuard)
    @RequireOrgPermission('warehouse.delete')
    @ApiOperation({ summary: 'Xóa warehouse' })
    async delete(
        @Param('id') id: string,
        @Request() req: any,
        @I18nLang() lang: string,
    ) {
        const organizationId = req.headers['x-organization-id'];
        await this.warehouseService.delete(id, req.user.id, organizationId, lang);
        return new DeletedResponse('warehouse.delete.success', null, 'Xóa kho thành công');
    }
}

