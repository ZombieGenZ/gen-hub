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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto, QueryCategoryDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses/success.response';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) { }

    @Post()
    @ApiOperation({ summary: 'Tạo chủ đề mới' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('category.create')
    async create(
        @Body() dto: CreateCategoryDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const category = await this.categoryService.create(dto, userId, lang);
        return new CreatedResponse('category.created', category, 'Đã tạo chủ đề thành công');
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách chủ đề' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('category.list')
    async findAll(
        @Query() query: QueryCategoryDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.categoryService.findAll(query);
        return new GetResponse('category.list', result, 'Lấy danh sách chủ đề thành công');
    }

    @Get('active')
    @ApiOperation({ summary: 'Lấy danh sách chủ đề active (không cần đăng nhập)' })
    async findAllActive() {
        const result = await this.categoryService.findAllActive();
        return new GetResponse('category.active', result, 'Lấy danh sách chủ đề thành công');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy chi tiết chủ đề' })
    @ApiParam({ name: 'id', description: 'ID chủ đề' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('category.read')
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const category = await this.categoryService.findById(id, lang);
        return new GetResponse('category.read', category, 'Lấy chi tiết chủ đề thành công');
    }

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật chủ đề' })
    @ApiParam({ name: 'id', description: 'ID chủ đề' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('category.update')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCategoryDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const category = await this.categoryService.update(id, dto, userId, lang);
        return new UpdatedResponse('category.updated', category, 'Đã cập nhật chủ đề thành công');
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa chủ đề' })
    @ApiParam({ name: 'id', description: 'ID chủ đề' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('category.delete')
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.categoryService.delete(id, userId, lang);
        return new DeletedResponse('category.deleted', null, 'Đã xóa chủ đề thành công');
    }

    @Delete('delete/many')
    @ApiOperation({ summary: 'Xóa nhiều chủ đề' })
    @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('category.delete')
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.categoryService.deleteMany(ids, userId, lang);
        return new DeletedResponse('category.deletedMany', null, 'Đã xóa các chủ đề thành công');
    }
}
