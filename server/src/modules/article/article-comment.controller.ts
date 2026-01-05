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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { ArticleCommentService } from './article-comment.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { GetResponse, CreatedResponse, UpdatedResponse, DeletedResponse, OkResponse } from '../../common/responses/success.response';

@ApiTags('Article Comments')
@Controller('articles')
export class ArticleCommentController {
    constructor(private readonly commentService: ArticleCommentService) { }

    @Get(':id/comments')
    @ApiOperation({ summary: 'Lấy danh sách comments của bài viết' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'offset', required: false })
    async getComments(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('limit') limit: number = 10,
        @Query('offset') offset: number = 0,
        @I18nLang() lang: string,
    ) {
        const result = await this.commentService.getComments(id, +limit, +offset, lang);
        return new GetResponse('article.comments', result, 'Lấy comments thành công');
    }

    @Post(':id/comments')
    @ApiOperation({ summary: 'Tạo comment (đăng nhập hoặc guest)' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @UseGuards(OptionalJwtAuthGuard)
    async createComment(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CreateCommentDto,
        @CurrentUser('userId') userId: string | null,
        @I18nLang() lang: string,
    ) {
        const comment = await this.commentService.createComment(id, dto, userId, lang);
        return new CreatedResponse('article.comment_created', comment, 'Đã tạo comment thành công');
    }

    @Put(':id/comments/:commentId')
    @ApiOperation({ summary: 'Cập nhật comment (owner hoặc admin)' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @ApiParam({ name: 'commentId', description: 'ID comment' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.read')
    async updateComment(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('commentId', ParseUUIDPipe) commentId: string,
        @Body() dto: UpdateCommentDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        // Admin check được thực hiện trong service dựa trên userId
        const comment = await this.commentService.updateComment(id, commentId, dto, userId, false, lang);
        return new UpdatedResponse('article.comment_updated', comment, 'Đã cập nhật comment thành công');
    }

    @Delete(':id/comments/:commentId')
    @ApiOperation({ summary: 'Xóa comment (owner hoặc admin)' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @ApiParam({ name: 'commentId', description: 'ID comment' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.read')
    async deleteComment(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('commentId', ParseUUIDPipe) commentId: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        // User chỉ có thể xóa comment của mình, admin xóa qua route /admin/*
        await this.commentService.deleteComment(id, commentId, userId, false, lang);
        return new DeletedResponse('article.comment_deleted', null, 'Đã xóa comment thành công');
    }

    @Post(':id/comments/:commentId/approve')
    @ApiOperation({ summary: 'Duyệt comment (admin)' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @ApiParam({ name: 'commentId', description: 'ID comment' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.admin')
    async approveComment(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('commentId', ParseUUIDPipe) commentId: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.commentService.approveComment(id, commentId, userId, lang);
        return new OkResponse('article.comment_approved', null, 'Đã duyệt comment');
    }

    @Post(':id/comments/:commentId/reject')
    @ApiOperation({ summary: 'Từ chối comment (admin)' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @ApiParam({ name: 'commentId', description: 'ID comment' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('article.admin')
    async rejectComment(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('commentId', ParseUUIDPipe) commentId: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.commentService.rejectComment(id, commentId, userId, lang);
        return new OkResponse('article.comment_rejected', null, 'Đã từ chối comment');
    }

    @Get(':id/comments/:commentId/history')
    @ApiOperation({ summary: 'Lấy lịch sử chỉnh sửa comment' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @ApiParam({ name: 'commentId', description: 'ID comment' })
    async getCommentHistory(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('commentId', ParseUUIDPipe) commentId: string,
        @I18nLang() lang: string,
    ) {
        const history = await this.commentService.getCommentEditHistory(id, commentId, lang);
        return new GetResponse('article.comment_history', history, 'Lấy lịch sử chỉnh sửa thành công');
    }
}

/**
 * Admin controller for comment moderation
 */
@ApiTags('Admin - Article Comments')
@Controller('admin/articles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ArticleCommentAdminController {
    constructor(private readonly commentService: ArticleCommentService) { }

    @Put(':articleId/comments/:commentId')
    @ApiOperation({ summary: 'Admin sửa comment (lưu lịch sử)' })
    @ApiBearerAuth()
    @RequirePermission('article.admin')
    async adminUpdateComment(
        @Param('articleId', ParseUUIDPipe) articleId: string,
        @Param('commentId', ParseUUIDPipe) commentId: string,
        @Body() dto: UpdateCommentDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const comment = await this.commentService.updateComment(articleId, commentId, dto, userId, true, lang);
        return new UpdatedResponse('article.comment_updated', comment, 'Đã cập nhật comment thành công');
    }

    @Delete(':articleId/comments/:commentId')
    @ApiOperation({ summary: 'Admin xóa comment' })
    @ApiBearerAuth()
    @RequirePermission('article.admin')
    async adminDeleteComment(
        @Param('articleId', ParseUUIDPipe) articleId: string,
        @Param('commentId', ParseUUIDPipe) commentId: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.commentService.deleteComment(articleId, commentId, userId, true, lang);
        return new DeletedResponse('article.comment_deleted', null, 'Đã xóa comment thành công');
    }
}
