import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import { WarningCategoryService } from './warning-category.service';
import {
    CreateWarningCategoryDto,
    UpdateWarningCategoryDto,
    QueryWarningCategoryDto,
    DeleteManyWarningCategoryDto,
} from './dto';
import {
    CreatedResponse,
    GetResponse,
    UpdatedResponse,
    DeletedResponse,
} from '../../common/responses/success.response';
import type { Request } from 'express';

@ApiTags('Warning Category')
@ApiBearerAuth('JWT-auth')
@Controller('admin/warning-categories')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WarningCategoryController {
    constructor(private readonly service: WarningCategoryService) { }

    @Post()
    @RequirePermission('warning-category.create')
    @ApiOperation({ summary: 'Tạo danh mục cảnh báo mới' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    async create(
        @Body() dto: CreateWarningCategoryDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const category = await this.service.create(dto, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new CreatedResponse(
            'warning-category.create',
            category,
        );
    }

    @Get()
    @RequirePermission('warning-category.list')
    @ApiOperation({ summary: 'Lấy danh sách danh mục cảnh báo' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Query() query: QueryWarningCategoryDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findMany(query, lang);
        return new GetResponse('warning-category.list', result);
    }

    @Get('all')
    @RequirePermission('warning-category.list')
    @ApiOperation({ summary: 'Lấy tất cả danh mục active (cho dropdown)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findAllActive(@I18nLang() lang: string) {
        const items = await this.service.findAllActive(lang);
        return new GetResponse('warning-category.list.all', items);
    }

    @Get(':id')
    @RequirePermission('warning-category.list')
    @ApiOperation({ summary: 'Lấy chi tiết danh mục cảnh báo' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const category = await this.service.findById(id, lang);
        return new GetResponse('warning-category.read', category);
    }

    @Put(':id')
    @RequirePermission('warning-category.update')
    @ApiOperation({ summary: 'Cập nhật danh mục cảnh báo' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateWarningCategoryDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const category = await this.service.update(id, dto, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new UpdatedResponse('warning-category.update', category);
    }

    @Delete(':id')
    @RequirePermission('warning-category.delete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa danh mục cảnh báo' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        await this.service.delete(id, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse('warning-category.delete');
    }

    @Delete()
    @RequirePermission('warning-category.delete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa nhiều danh mục cảnh báo' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    async deleteMany(
        @Body() dto: DeleteManyWarningCategoryDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const count = await this.service.deleteMany(dto.ids, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse('warning-category.delete-many', { count });
    }
}
