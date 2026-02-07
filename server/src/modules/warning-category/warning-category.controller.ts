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
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiQuery,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
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
    @ApiOperation({
        summary: 'Tạo danh mục cảnh báo mới',
        description: 'Tạo một danh mục cảnh báo mới để phân loại các loại warning khác nhau (vi phạm, nhắc nhở, etc.). Yêu cầu quyền `warning-category.create`.',
    })
    @ApiBody({
        type: CreateWarningCategoryDto,
        examples: {
            violation: {
                summary: 'Danh mục vi phạm',
                value: { name: 'Vi phạm quy định', description: 'Vi phạm nội quy hệ thống', severity: 'HIGH', is_active: true },
            },
            reminder: {
                summary: 'Danh mục nhắc nhở',
                value: { name: 'Nhắc nhở', description: 'Nhắc nhở nhẹ', severity: 'LOW', is_active: true },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo danh mục thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warning-category.create' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Vi phạm quy định' },
                        description: { type: 'string' },
                        severity: { type: 'string', example: 'HIGH' },
                        is_active: { type: 'boolean', example: true },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
        return new CreatedResponse('warning-category.create', category);
    }

    @Get()
    @RequirePermission('warning-category.list')
    @ApiOperation({
        summary: 'Lấy danh sách danh mục cảnh báo',
        description: 'Lấy danh sách tất cả danh mục cảnh báo với phân trang và tìm kiếm. Yêu cầu quyền `warning-category.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Tìm theo tên' })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Lọc theo trạng thái' })
    @ApiResponse({ status: 200, description: 'Danh sách danh mục' })
    @ApiAuthResponses()
    async findMany(
        @Query() query: QueryWarningCategoryDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findMany(query, lang);
        return new GetResponse('warning-category.list', result);
    }

    @Get('all')
    @RequirePermission('warning-category.list')
    @ApiOperation({
        summary: 'Lấy tất cả danh mục active (cho dropdown)',
        description: 'Lấy danh sách tất cả danh mục đang active để hiển thị trong dropdown. Yêu cầu quyền `warning-category.list`.',
    })
    @ApiResponse({ status: 200, description: 'Danh sách danh mục active' })
    @ApiAuthResponses()
    async findAllActive(@I18nLang() lang: string) {
        const items = await this.service.findAllActive(lang);
        return new GetResponse('warning-category.list.all', items);
    }

    @Get(':id')
    @RequirePermission('warning-category.list')
    @ApiOperation({
        summary: 'Lấy chi tiết danh mục cảnh báo',
        description: 'Lấy thông tin chi tiết của một danh mục cảnh báo. Yêu cầu quyền `warning-category.list`.',
    })
    @ApiParam({ name: 'id', description: 'ID danh mục (UUID)', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiResponse({ status: 200, description: 'Chi tiết danh mục' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiAuthResponses()
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const category = await this.service.findById(id, lang);
        return new GetResponse('warning-category.read', category);
    }

    @Put(':id')
    @RequirePermission('warning-category.update')
    @ApiOperation({
        summary: 'Cập nhật danh mục cảnh báo',
        description: 'Cập nhật thông tin danh mục cảnh báo. Yêu cầu quyền `warning-category.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID danh mục (UUID)' })
    @ApiBody({ type: UpdateWarningCategoryDto })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
    @ApiOperation({
        summary: 'Xóa danh mục cảnh báo',
        description: 'Soft delete danh mục cảnh báo. Yêu cầu quyền `warning-category.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID danh mục (UUID)' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Xóa nhiều danh mục cảnh báo',
        description: 'Xóa nhiều danh mục cùng lúc. Yêu cầu quyền `warning-category.delete`.',
    })
    @ApiBody({ type: DeleteManyWarningCategoryDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
