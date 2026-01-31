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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
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
import { ArticleStatus, ArticleType } from '@prisma/client';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators/api-common-responses.decorator';

@ApiTags('Articles')
@Controller('articles')
export class ArticleController {
    constructor(private readonly articleService: ArticleService) { }

    @Post()
    @ApiOperation({
        summary: 'Tạo bài viết mới',
        description: 'Tạo một bài viết mới với các thông tin cơ bản, nội dung, SEO và phân loại. Yêu cầu quyền `article.create`.',
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.create')
    @ApiBody({
        type: CreateArticleDto,
        description: 'Thông tin bài viết cần tạo',
        examples: {
            blog_post: {
                summary: 'Tạo bài viết Blog',
                description: 'Tạo một bài viết blog tiêu chuẩn',
                value: {
                    title: 'Hướng dẫn sử dụng NestJS cơ bản',
                    slug: 'huong-dan-su-dung-nestjs-co-ban',
                    excerpt: 'Bài viết này sẽ hướng dẫn bạn cách bắt đầu với NestJS...',
                    content: '<p>Nội dung chi tiết bài viết...</p>',
                    type: 'BLOG',
                    status: 'PUBLISHED',
                    is_featured: true,
                    category_ids: ['d0a3345e-0498-4853-b328-91255476717a']
                }
            },
            help_article: {
                summary: 'Tạo bài viết Hướng dẫn',
                description: 'Tạo một bài viết hướng dẫn (Help Center)',
                value: {
                    title: 'Làm sao để đổi mật khẩu?',
                    slug: 'lam-sao-de-doi-mat-khau',
                    content: '<p>Hướng dẫn chi tiết các bước đổi mật khẩu...</p>',
                    type: 'GUIDE',
                    status: 'DRAFT',
                    allow_comments: false
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo bài viết thành công',
        schema: {
            example: {
                code: 'article.created',
                message: 'Đã tạo bài viết thành công',
                success: true,
                data: {
                    id: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
                    title: 'Hướng dẫn sử dụng NestJS cơ bản',
                    slug: 'huong-dan-su-dung-nestjs-co-ban',
                    status: 'PUBLISHED',
                    created_at: '2023-10-25T08:00:00.000Z'
                }
            }
        }
    })
    async create(
        @Body() dto: CreateArticleDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const article = await this.articleService.create(dto, userId, lang);
        return new CreatedResponse('article.created', article, 'Đã tạo bài viết thành công');
    }

    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách bài viết (Admin)',
        description: 'Lấy danh sách bài viết có phân trang, lọc theo trạng thái, loại, danh mục... dành cho Admin quản lý. Yêu cầu quyền `article.list`.'
    })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.list')
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bài viết mỗi trang (Mặc định: 10)', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu (Mặc định: 0)', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm (Tiêu đề, slug)', example: 'nestjs' })
    @ApiQuery({ name: 'status', required: false, enum: ArticleStatus, description: 'Lọc theo trạng thái', example: 'PUBLISHED' })
    @ApiQuery({ name: 'type', required: false, enum: ArticleType, description: 'Lọc theo loại bài viết', example: 'BLOG' })
    @ApiQuery({ name: 'category_id', required: false, type: String, description: 'Lọc theo ID danh mục', example: 'd0a3345e-0498-4853-b328-91255476717a' })
    @ApiResponse({
        status: 200,
        description: 'Danh sách bài viết',
        schema: {
            example: {
                code: 'article.list',
                message: 'Lấy danh sách bài viết thành công',
                success: true,
                data: {
                    items: [
                        {
                            id: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
                            title: 'Hướng dẫn sử dụng NestJS cơ bản',
                            slug: 'huong-dan-su-dung-nestjs-co-ban',
                            status: 'PUBLISHED',
                            views_count: 150
                        }
                    ],
                    total: 1
                }
            }
        }
    })
    async findAll(
        @Query() query: QueryArticleDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.articleService.findAll(query);
        return new GetResponse('article.list', result, 'Lấy danh sách bài viết thành công');
    }

    @Get('public')
    @ApiOperation({
        summary: 'Lấy danh sách bài viết công khai',
        description: 'Lấy danh sách bài viết đã xuất bản (PUBLISHED) dành cho người dùng cuối (Không cần đăng nhập).'
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bài viết mỗi trang (Mặc định: 10)', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu (Mặc định: 0)', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm', example: 'tutorial' })
    @ApiQuery({ name: 'category_id', required: false, type: String, description: 'Lọc theo ID danh mục', example: 'd0a3345e-0498-4853-b328-91255476717a' })
    @ApiResponse({
        status: 200,
        description: 'Danh sách bài viết công khai',
        schema: {
            example: {
                code: 'article.public',
                message: 'Lấy danh sách bài viết thành công',
                success: true,
                data: {
                    items: [
                        {
                            id: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
                            title: 'Hướng dẫn sử dụng NestJS cơ bản',
                            slug: 'huong-dan-su-dung-nestjs-co-ban',
                            excerpt: 'Bài viết hướng dẫn...',
                            thumbnail: 'https://example.com/image.jpg',
                            published_at: '2023-10-25T08:00:00.000Z'
                        }
                    ],
                    total: 10
                }
            }
        }
    })
    async findAllPublished(@Query() query: QueryArticleDto) {
        const result = await this.articleService.findAllPublished(query);
        return new GetResponse('article.public', result, 'Lấy danh sách bài viết thành công');
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Lấy chi tiết bài viết (Admin)',
        description: 'Lấy thông tin chi tiết của một bài viết theo ID. Yêu cầu quyền `article.read`.'
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'id', description: 'ID của bài viết (UUID)', example: 'b6f48b98-5c49-436f-87a3-e4d355038e24' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.read')
    @ApiResponse({
        status: 200,
        description: 'Chi tiết bài viết',
        schema: {
            example: {
                code: 'article.read',
                message: 'Lấy chi tiết bài viết thành công',
                success: true,
                data: {
                    id: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
                    title: 'Hướng dẫn sử dụng NestJS cơ bản',
                    content: '<p>Nội dung...</p>',
                    seo_title: 'NestJS Tutorial',
                    author: { id: '...', name: 'Admin' }
                }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Bài viết không tồn tại',
        schema: {
            example: {
                code: 'error.article.not_found',
                message: 'Không tìm thấy bài viết',
                success: false
            }
        }
    })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const article = await this.articleService.findById(id, lang);
        return new GetResponse('article.read', article, 'Lấy chi tiết bài viết thành công');
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Cập nhật bài viết',
        description: 'Cập nhật thông tin bài viết theo ID. Yêu cầu quyền `article.update`.'
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({ name: 'id', description: 'ID của bài viết (UUID)', example: 'b6f48b98-5c49-436f-87a3-e4d355038e24' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.update')
    @ApiBody({
        type: UpdateArticleDto,
        description: 'Thông tin cần cập nhật',
        examples: {
            update_title: {
                summary: 'Cập nhật tiêu đề',
                value: { title: 'Tiêu đề mới cho bài viết' }
            },
            publish_article: {
                summary: 'Xuất bản bài viết',
                value: { status: 'PUBLISHED', published_at: '2023-11-01T10:00:00.000Z' }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật thành công',
        schema: {
            example: {
                code: 'article.updated',
                message: 'Đã cập nhật bài viết thành công',
                success: true,
                data: {
                    id: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
                    title: 'Tiêu đề mới',
                    updated_at: '2023-11-01T10:05:00.000Z'
                }
            }
        }
    })
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
    @ApiOperation({
        summary: 'Xóa bài viết',
        description: 'Xóa (soft delete) một bài viết theo ID. Yêu cầu quyền `article.delete`.'
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'id', description: 'ID của bài viết (UUID)', example: 'b6f48b98-5c49-436f-87a3-e4d355038e24' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.delete')
    @ApiResponse({
        status: 200,
        description: 'Xóa thành công',
        schema: {
            example: {
                code: 'article.deleted',
                message: 'Đã xóa bài viết thành công',
                success: true,
                data: null
            }
        }
    })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.articleService.delete(id, userId, lang);
        return new DeletedResponse('article.deleted', null, 'Đã xóa bài viết thành công');
    }

    @Delete('delete/many')
    @ApiOperation({
        summary: 'Xóa nhiều bài viết',
        description: 'Xóa (soft delete) nhiều bài viết cùng lúc theo danh sách ID. Yêu cầu quyền `article.delete`.'
    })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.delete')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                ids: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                    description: 'Danh sách ID bài viết cần xóa',
                    example: ['b6f48b98-5c49-436f-87a3-e4d355038e24', 'a1b2c3d4-e5f6-7890-1234-567890abcdef']
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa thành công',
        schema: {
            example: {
                code: 'article.deletedMany',
                message: 'Đã xóa các bài viết thành công',
                success: true,
                data: null
            }
        }
    })
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.articleService.deleteMany(ids, userId, lang);
        return new DeletedResponse('article.deletedMany', null, 'Đã xóa các bài viết thành công');
    }

    @Post(':id/view')
    @ApiOperation({
        summary: 'Tăng lượt xem bài viết',
        description: 'API public để tăng counter lượt xem cho bài viết.'
    })
    @ApiParam({ name: 'id', description: 'ID của bài viết (UUID)', example: 'b6f48b98-5c49-436f-87a3-e4d355038e24' })
    @ApiResponse({
        status: 200,
        description: 'Thành công',
        schema: {
            example: {
                code: 'article.viewed',
                message: 'Đã tăng lượt xem',
                success: true,
                data: null
            }
        }
    })
    async incrementView(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        await this.articleService.incrementView(id, lang);
        return new OkResponse('article.viewed', null, 'Đã tăng lượt xem');
    }

    @Post(':id/share')
    @ApiOperation({
        summary: 'Tăng lượt chia sẻ bài viết',
        description: 'API public để tăng counter lượt chia sẻ cho bài viết.'
    })
    @ApiParam({ name: 'id', description: 'ID của bài viết (UUID)', example: 'b6f48b98-5c49-436f-87a3-e4d355038e24' })
    @ApiResponse({
        status: 200,
        description: 'Thành công',
        schema: {
            example: {
                code: 'article.shared',
                message: 'Đã tăng lượt chia sẻ',
                success: true,
                data: null
            }
        }
    })
    async incrementShare(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        await this.articleService.incrementShare(id, lang);
        return new OkResponse('article.shared', null, 'Đã tăng lượt chia sẻ');
    }

    @Get(':id/history')
    @ApiOperation({
        summary: 'Lấy lịch sử chỉnh sửa bài viết',
        description: 'Xem lịch sử các thay đổi của bài viết. Yêu cầu quyền `article.read`.'
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'id', description: 'ID của bài viết (UUID)', example: 'b6f48b98-5c49-436f-87a3-e4d355038e24' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.read')
    @ApiResponse({
        status: 200,
        description: 'Danh sách lịch sử chỉnh sửa',
        schema: {
            example: {
                code: 'article.history',
                message: 'Lấy lịch sử chỉnh sửa thành công',
                success: true,
                data: [
                    {
                        id: '...',
                        action: 'UPDATE',
                        changes: { title: 'New Title' },
                        created_at: '2023-11-01T10:00:00.000Z',
                        created_by: 'Admin'
                    }
                ]
            }
        }
    })
    async getEditHistory(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const history = await this.articleService.getEditHistory(id, lang);
        return new GetResponse('article.history', history, 'Lấy lịch sử chỉnh sửa thành công');
    }

    @Post(':id/generate-seo')
    @ApiOperation({
        summary: 'Tạo SEO tự động bằng AI',
        description: 'Sử dụng AI để tự động tạo title, description và keywords cho bài viết dựa trên nội dung. Yêu cầu quyền `article.update`.'
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'id', description: 'ID của bài viết (UUID)', example: 'b6f48b98-5c49-436f-87a3-e4d355038e24' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.update')
    @ApiResponse({
        status: 200,
        description: 'Tạo SEO thành công',
        schema: {
            example: {
                code: 'article.seo_generated',
                message: 'Đã tạo SEO thành công',
                success: true,
                data: {
                    seo_title: 'Hướng dẫn NestJS từ A-Z',
                    seo_description: 'Bài viết chi tiết về cách xây dựng backend với NestJS Framework...',
                    seo_keywords: ['nestjs', 'backend', 'typescript']
                }
            }
        }
    })
    async generateSeo(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const seo = await this.articleService.generateSeo(id, userId, lang);
        return new OkResponse('article.seo_generated', seo, 'Đã tạo SEO thành công');
    }
}
