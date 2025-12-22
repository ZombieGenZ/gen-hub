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

import { RowTemplateService } from './row-template.service';
import { CreateRowTemplateDto, UpdateRowTemplateDto, QueryRowTemplateDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses';

@ApiTags('Row Templates')
@Controller('warehouse-templates/:warehouseTemplateId/rows')
export class RowTemplateController {
    constructor(private readonly service: RowTemplateService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('row-template.create')
    @ApiOperation({ summary: 'Tạo dãy mới cho warehouse template' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy warehouse template' })
    async create(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Body() dto: CreateRowTemplateDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.create(warehouseTemplateId, dto, userId, lang);
        return new CreatedResponse('row-template.success.created', result, 'Tạo dãy thành công');
    }

    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('row-template.list')
    @ApiOperation({ summary: 'Lấy danh sách dãy của warehouse template' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy warehouse template' })
    async findMany(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Query() query: QueryRowTemplateDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findMany(warehouseTemplateId, query, lang);
        return new GetResponse('row-template.success.fetched', result, 'Lấy danh sách dãy thành công');
    }

    @Get(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('row-template.read')
    @ApiOperation({ summary: 'Lấy chi tiết dãy' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'id', description: 'ID của dãy' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findById(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findById(id, lang);
        return new GetResponse('row-template.success.fetched', result, 'Lấy chi tiết dãy thành công');
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('row-template.update')
    @ApiOperation({ summary: 'Cập nhật dãy' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'id', description: 'ID của dãy' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async update(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRowTemplateDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.update(id, dto, userId, lang);
        return new UpdatedResponse('row-template.success.updated', result, 'Cập nhật dãy thành công');
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('row-template.delete')
    @ApiOperation({ summary: 'Xóa nhiều dãy' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async deleteMany(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse('row-template.success.deleted', null, 'Xóa nhiều dãy thành công');
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('row-template.delete')
    @ApiOperation({ summary: 'Xóa dãy' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'id', description: 'ID của dãy' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async delete(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.delete(id, userId, lang);
        return new DeletedResponse('row-template.success.deleted', null, 'Xóa dãy thành công');
    }
}
