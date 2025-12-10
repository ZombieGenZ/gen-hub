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
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { WarehouseTemplateService } from './warehouse-template.service';
import {
    CreateWarehouseTemplateDto,
    UpdateWarehouseTemplateDto,
    QueryWarehouseTemplateDto,
    UpsertLayoutDto,
} from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses';
import { IWarehouseTemplateWithRelations, IPaginatedResponse } from './interfaces';

@ApiTags('Warehouse Templates')
@ApiBearerAuth('JWT-auth')
@Controller('warehouse-templates')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WarehouseTemplateController {
    constructor(private readonly service: WarehouseTemplateService) { }

    @Post()
    @RequirePermission('warehouse-template.create')
    @ApiOperation({ summary: 'Tạo mới template kho hàng' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 409, description: 'Tên template đã tồn tại' })
    async create(
        @Body() dto: CreateWarehouseTemplateDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IWarehouseTemplateWithRelations>> {
        const result = await this.service.create(dto, userId, lang);
        return new CreatedResponse(result);
    }

    @Get()
    @RequirePermission('warehouse-template.list')
    @ApiOperation({ summary: 'Lấy danh sách template kho hàng' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Query() query: QueryWarehouseTemplateDto,
    ): Promise<GetResponse<IPaginatedResponse<IWarehouseTemplateWithRelations>>> {
        const result = await this.service.findMany(query);
        return new GetResponse(result);
    }

    @Get(':id')
    @RequirePermission('warehouse-template.read')
    @ApiOperation({ summary: 'Lấy chi tiết template kho hàng' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IWarehouseTemplateWithRelations>> {
        const result = await this.service.findById(id, lang);
        return new GetResponse(result);
    }

    @Put(':id')
    @RequirePermission('warehouse-template.update')
    @ApiOperation({ summary: 'Cập nhật thông tin template kho hàng' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    @ApiResponse({ status: 409, description: 'Tên template đã tồn tại' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateWarehouseTemplateDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IWarehouseTemplateWithRelations>> {
        const result = await this.service.update(id, dto, userId, lang);
        return new UpdatedResponse(result);
    }

    @Delete(':id')
    @RequirePermission('warehouse-template.delete')
    @ApiOperation({ summary: 'Xóa template kho hàng' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.delete(id, userId, lang);
        return new DeletedResponse(null);
    }

    @Put(':id/layout')
    @RequirePermission('warehouse-template.design')
    @ApiOperation({ summary: 'Cập nhật layout (rows, racks, shelves, blocks)' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật layout thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    async upsertLayout(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpsertLayoutDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IWarehouseTemplateWithRelations>> {
        const result = await this.service.upsertLayout(id, dto, userId, lang);
        return new UpdatedResponse(result);
    }
}
