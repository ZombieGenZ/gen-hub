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

import { RackTemplateService } from './rack-template.service';
import { CreateRackTemplateDto, UpdateRackTemplateDto, QueryRackTemplateDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses';

@ApiTags('Rack Templates')
@Controller('warehouse-templates/:warehouseTemplateId/rows/:rowId/racks')
export class RackTemplateController {
    constructor(private readonly service: RackTemplateService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('rack-template.create')
    @ApiOperation({ summary: 'Tạo kệ mới cho dãy' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy dãy' })
    async create(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Body() dto: CreateRackTemplateDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.create(rowId, dto, userId, lang);
        return new CreatedResponse('rack-template.success.created', result, 'Tạo kệ thành công');
    }

    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('rack-template.list')
    @ApiOperation({ summary: 'Lấy danh sách kệ của dãy' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy dãy' })
    async findMany(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Query() query: QueryRackTemplateDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findMany(rowId, query, lang);
        return new GetResponse('rack-template.success.fetched', result, 'Lấy danh sách kệ thành công');
    }

    @Get(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('rack-template.read')
    @ApiOperation({ summary: 'Lấy chi tiết kệ' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'id', description: 'ID của kệ' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findById(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findById(id, lang);
        return new GetResponse('rack-template.success.fetched', result, 'Lấy chi tiết kệ thành công');
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('rack-template.update')
    @ApiOperation({ summary: 'Cập nhật kệ' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'id', description: 'ID của kệ' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async update(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRackTemplateDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.update(id, dto, userId, lang);
        return new UpdatedResponse('rack-template.success.updated', result, 'Cập nhật kệ thành công');
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('rack-template.delete')
    @ApiOperation({ summary: 'Xóa nhiều kệ' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async deleteMany(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse('rack-template.success.deleted', null, 'Xóa nhiều kệ thành công');
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('rack-template.delete')
    @ApiOperation({ summary: 'Xóa kệ' })
    @ApiParam({ name: 'warehouseTemplateId', description: 'ID của warehouse template' })
    @ApiParam({ name: 'rowId', description: 'ID của dãy' })
    @ApiParam({ name: 'id', description: 'ID của kệ' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async delete(
        @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
        @Param('rowId', ParseUUIDPipe) rowId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.delete(id, userId, lang);
        return new DeletedResponse('rack-template.success.deleted', null, 'Xóa kệ thành công');
    }
}
