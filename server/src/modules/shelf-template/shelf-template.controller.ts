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
    ApiBody,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { ShelfTemplateService } from './shelf-template.service';
import { CreateShelfTemplateDto, UpdateShelfTemplateDto, QueryShelfTemplateDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses';

@ApiTags('Shelf Templates')
@Controller('warehouse-templates/:warehouseTemplateId/rows/:rowId/racks/:rackId/shelves')
export class ShelfTemplateController {
    constructor(private readonly service: ShelfTemplateService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('shelf-template.create')
    @ApiOperation({ summary: 'Tạo tầng mới cho kệ' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'rackId', description: 'ID của kệ' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy kệ' })
    async create(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Body() dto: CreateShelfTemplateDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.create(rackId, dto, userId, lang);
        return new CreatedResponse('shelf-template.success.created', result, 'Tạo tầng thành công');
    }

    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('shelf-template.list')
    @ApiOperation({ summary: 'Lấy danh sách tầng của kệ' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'rackId', description: 'ID của kệ' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy kệ' })
    async findMany(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Query() query: QueryShelfTemplateDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findMany(rackId, query, lang);
        return new GetResponse('shelf-template.success.fetched', result, 'Lấy danh sách tầng thành công');
    }

    @Get(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('shelf-template.read')
    @ApiOperation({ summary: 'Lấy chi tiết tầng' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'rackId', description: 'ID của kệ' })
    @ApiParam({ name: 'id', description: 'ID của tầng' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findById(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findById(id, lang);
        return new GetResponse('shelf-template.success.fetched', result, 'Lấy chi tiết tầng thành công');
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('shelf-template.update')
    @ApiOperation({ summary: 'Cập nhật tầng' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'rackId', description: 'ID của kệ' })
    @ApiParam({ name: 'id', description: 'ID của tầng' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async update(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateShelfTemplateDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.update(id, dto, userId, lang);
        return new UpdatedResponse('shelf-template.success.updated', result, 'Cập nhật tầng thành công');
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('shelf-template.delete')
    @ApiOperation({ summary: 'Xóa nhiều tầng' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'rackId', description: 'ID của kệ' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async deleteMany(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse('shelf-template.success.deleted', null, 'Xóa nhiều tầng thành công');
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('shelf-template.delete')
    @ApiOperation({ summary: 'Xóa tầng' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'rackId', description: 'ID của kệ' })
    @ApiParam({ name: 'id', description: 'ID của tầng' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async delete(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.delete(id, userId, lang);
        return new DeletedResponse('shelf-template.success.deleted', null, 'Xóa tầng thành công');
    }
}
