import {
    Controller,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiHeader, ApiBody } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { WarehouseService } from './warehouse.service';
import { UpdateWarehouseDto, QueryWarehouseDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { CombinedAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentActor } from '../../common/decorators';
import { GetResponse, UpdatedResponse, DeletedResponse, ResponseCode } from '../../common/responses';

@ApiTags('Organization Warehouses')
@ApiBearerAuth()
@ApiHeader({ name: 'X-API-Key', description: 'API Key for authentication (alternative to JWT)', required: false })
@Controller('organizations/:orgId/warehouses')
@UseGuards(CombinedAuthGuard, PermissionGuard)
export class WarehouseController {
    constructor(private readonly warehouseService: WarehouseService) { }

    /**
     * Lấy danh sách warehouse của tổ chức
     */
    @Get()
    @RequirePermission('warehouse.list')
    @ApiOperation({ summary: 'Lấy danh sách warehouse của tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    async findMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryWarehouseDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.findMany(query, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_LIST_SUCCESS, data, 'Lấy danh sách kho thành công');
    }

    /**
     * Lấy chi tiết warehouse
     */
    @Get(':id')
    @RequirePermission('warehouse.read')
    @ApiOperation({ summary: 'Lấy chi tiết warehouse' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'id', description: 'ID warehouse' })
    async findById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.findById(id, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_READ_SUCCESS, data, 'Lấy thông tin kho thành công');
    }

    /**
     * Lấy layout warehouse
     */
    @Get(':id/layout')
    @RequirePermission('warehouse.layout.view')
    @ApiOperation({ summary: 'Lấy layout warehouse' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'id', description: 'ID warehouse' })
    async getLayout(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.getLayout(id, actorId, orgId, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_LAYOUT_SUCCESS, data, 'Lấy layout kho thành công');
    }

    /**
     * Cập nhật warehouse (chỉ name/description)
     */
    @Put(':id')
    @RequirePermission('warehouse.update')
    @ApiOperation({ summary: 'Cập nhật warehouse' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'id', description: 'ID warehouse' })
    async update(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateWarehouseDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.warehouseService.update(id, dto, actorId, orgId, lang);
        return new UpdatedResponse(ResponseCode.WAREHOUSE_UPDATE_SUCCESS, data, 'Cập nhật kho thành công');
    }

    /**
     * Xóa nhiều warehouse
     */
    @Delete('delete/many')
    @RequirePermission('warehouse.delete')
    @ApiOperation({ summary: 'Xóa nhiều warehouse' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiBody({ type: DeleteManyDto })
    async deleteMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: DeleteManyDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        await this.warehouseService.deleteMany(dto.ids, actorId, orgId, lang);
        return new DeletedResponse(ResponseCode.WAREHOUSE_DELETE_SUCCESS, null, 'Xóa nhiều kho thành công');
    }

    /**
     * Xóa warehouse
     */
    @Delete(':id')
    @RequirePermission('warehouse.delete')
    @ApiOperation({ summary: 'Xóa warehouse' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'id', description: 'ID warehouse' })
    async delete(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ) {
        await this.warehouseService.delete(id, actorId, orgId, lang);
        return new DeletedResponse(ResponseCode.WAREHOUSE_DELETE_SUCCESS, null, 'Xóa kho thành công');
    }
}

