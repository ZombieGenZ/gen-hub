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

import { BlockTemplateService } from './block-template.service';
import { CreateBlockTemplateDto, UpdateBlockTemplateDto, QueryBlockTemplateDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses';

@ApiTags('Block Templates')
@Controller('warehouse-templates/:warehouseTemplateId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks')
export class BlockTemplateController {
    constructor(private readonly service: BlockTemplateService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('block-template.create')
    @ApiOperation({ summary: 'Tạo ô mới cho tầng' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'rackId', description: 'ID của kệ' })
    @ApiParam({ name: 'shelfId', description: 'ID của tầng' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tầng' })
    async create(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @Body() dto: CreateBlockTemplateDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.create(shelfId, dto, userId, lang);
        return new CreatedResponse('block-template.success.created', result, 'Tạo ô thành công');
    }

    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('block-template.list')
    @ApiOperation({ summary: 'Lấy danh sách ô của tầng' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'rackId', description: 'ID của kệ' })
    @ApiParam({ name: 'shelfId', description: 'ID của tầng' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tầng' })
    async findMany(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @Query() query: QueryBlockTemplateDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findMany(shelfId, query, lang);
        return new GetResponse('block-template.success.fetched', result, 'Lấy danh sách ô thành công');
    }

    @Get(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('block-template.read')
    @ApiOperation({ summary: 'Lấy chi tiết ô' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'rackId', description: 'ID của kệ' })
    @ApiParam({ name: 'shelfId', description: 'ID của tầng' })
    @ApiParam({ name: 'id', description: 'ID của ô' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findById(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findById(id, lang);
        return new GetResponse('block-template.success.fetched', result, 'Lấy chi tiết ô thành công');
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('block-template.update')
    @ApiOperation({ summary: 'Cập nhật ô' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'rackId', description: 'ID của kệ' })
    @ApiParam({ name: 'shelfId', description: 'ID của tầng' })
    @ApiParam({ name: 'id', description: 'ID của ô' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async update(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateBlockTemplateDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.update(id, dto, userId, lang);
        return new UpdatedResponse('block-template.success.updated', result, 'Cập nhật ô thành công');
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('block-template.delete')
    @ApiOperation({ summary: 'Xóa nhiều ô' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'rackId', description: 'ID của kệ' })
    @ApiParam({ name: 'shelfId', description: 'ID của tầng' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async deleteMany(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse('block-template.success.deleted', null, 'Xóa nhiều ô thành công');
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('block-template.delete')
    @ApiOperation({ summary: 'Xóa ô' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'rackId', description: 'ID của kệ' })
    @ApiParam({ name: 'shelfId', description: 'ID của tầng' })
    @ApiParam({ name: 'id', description: 'ID của ô' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async delete(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('rackId', ParseUUIDPipe) rackId: string,
        @Param('shelfId', ParseUUIDPipe) shelfId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.delete(id, userId, lang);
        return new DeletedResponse('block-template.success.deleted', null, 'Xóa ô thành công');
    }
}
