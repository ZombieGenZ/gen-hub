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
import { ArticleService } from './article.service';
import { CreateArticleDto, UpdateArticleDto, QueryArticleDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
    OkResponse,
} from '../../common/responses/success.response';

@ApiTags('Articles')
@Controller('articles')
export class ArticleController {
    constructor(private readonly articleService: ArticleService) { }

    @Post()
    @ApiOperation({ summary: 'Tạo bài viết mới' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.create')
    async create(
        @Body() dto: CreateArticleDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const article = await this.articleService.create(dto, userId, lang);
        return new CreatedResponse('article.created', article, 'Đã tạo bài viết thành công');
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách bài viết' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.list')
    async findAll(
        @Query() query: QueryArticleDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.articleService.findAll(query);
        return new GetResponse('article.list', result, 'Lấy danh sách bài viết thành công');
    }

    @Get('public')
    @ApiOperation({ summary: 'Lấy danh sách bài viết công khai (không cần đăng nhập)' })
    async findAllPublished(@Query() query: QueryArticleDto) {
        const result = await this.articleService.findAllPublished(query);
        return new GetResponse('article.public', result, 'Lấy danh sách bài viết thành công');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy chi tiết bài viết' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.read')
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const article = await this.articleService.findById(id, lang);
        return new GetResponse('article.read', article, 'Lấy chi tiết bài viết thành công');
    }

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật bài viết' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.update')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateArticleDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const article = await this.articleService.update(id, dto, userId, lang);
        return new UpdatedResponse('article.updated', article, 'Đã cập nhật bài viết thành công');
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa bài viết' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.delete')
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.articleService.delete(id, userId, lang);
        return new DeletedResponse('article.deleted', null, 'Đã xóa bài viết thành công');
    }

    @Delete('delete/many')
    @ApiOperation({ summary: 'Xóa nhiều bài viết' })
    @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.delete')
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.articleService.deleteMany(ids, userId, lang);
        return new DeletedResponse('article.deletedMany', null, 'Đã xóa các bài viết thành công');
    }

    @Post(':id/view')
    @ApiOperation({ summary: 'Tăng lượt xem bài viết' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    async incrementView(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        await this.articleService.incrementView(id, lang);
        return new OkResponse('article.viewed', null, 'Đã tăng lượt xem');
    }

    @Post(':id/share')
    @ApiOperation({ summary: 'Tăng lượt chia sẻ bài viết' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    async incrementShare(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        await this.articleService.incrementShare(id, lang);
        return new OkResponse('article.shared', null, 'Đã tăng lượt chia sẻ');
    }

    @Get(':id/history')
    @ApiOperation({ summary: 'Lấy lịch sử chỉnh sửa bài viết' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.read')
    async getEditHistory(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const history = await this.articleService.getEditHistory(id, lang);
        return new GetResponse('article.history', history, 'Lấy lịch sử chỉnh sửa thành công');
    }

    @Post(':id/generate-seo')
    @ApiOperation({ summary: 'Tạo SEO tự động bằng AI' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.update')
    async generateSeo(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const seo = await this.articleService.generateSeo(id, userId, lang);
        return new OkResponse('article.seo_generated', seo, 'Đã tạo SEO thành công');
    }
}
