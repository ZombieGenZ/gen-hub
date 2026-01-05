import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { ArticleEmojiService } from './article-emoji.service';
import { CreateReactionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { GetResponse, OkResponse, DeletedResponse } from '../../common/responses/success.response';

@ApiTags('Article Emojis & Reactions')
@Controller('articles')
export class ArticleEmojiController {
    constructor(private readonly emojiService: ArticleEmojiService) { }

    @Get('emojis')
    @ApiOperation({ summary: 'Lấy danh sách emoji' })
    async getAllEmojis() {
        const emojis = await this.emojiService.getAllEmojis();
        return new GetResponse('article.emojis', emojis, 'Lấy danh sách emoji thành công');
    }

    @Post(':id/reactions')
    @ApiOperation({ summary: 'Thả reaction vào bài viết (toggle)' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @UseGuards(OptionalJwtAuthGuard)
    async addReaction(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CreateReactionDto,
        @CurrentUser('userId') userId: string | null,
        @I18nLang() lang: string,
    ) {
        const result = await this.emojiService.addReaction(id, dto, userId, lang);
        return new OkResponse('article.reaction', result, 'Đã cập nhật reaction');
    }

    @Delete(':id/reactions/:emojiId')
    @ApiOperation({ summary: 'Bỏ reaction' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    @ApiParam({ name: 'emojiId', description: 'ID emoji' })
    @UseGuards(OptionalJwtAuthGuard)
    async removeReaction(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('emojiId', ParseUUIDPipe) emojiId: string,
        @Query('guest_identifier') guestIdentifier: string,
        @CurrentUser('userId') userId: string | null,
        @I18nLang() lang: string,
    ) {
        await this.emojiService.removeReaction(id, emojiId, userId, guestIdentifier, lang);
        return new DeletedResponse('article.reaction_removed', null, 'Đã bỏ reaction');
    }

    @Get(':id/reactions')
    @ApiOperation({ summary: 'Lấy reaction summary của bài viết' })
    @ApiParam({ name: 'id', description: 'ID bài viết' })
    async getReactionSummary(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const summary = await this.emojiService.getReactionSummary(id, lang);
        return new GetResponse('article.reactions', summary, 'Lấy reactions thành công');
    }
}

/**
 * Admin controller for reaction moderation
 */
@ApiTags('Admin - Article Reactions')
@Controller('admin/articles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ArticleReactionAdminController {
    constructor(private readonly emojiService: ArticleEmojiService) { }

    @Delete(':articleId/reactions/:reactionId')
    @ApiOperation({ summary: 'Admin xóa reaction' })
    @ApiBearerAuth()
    @RequirePermission('article.admin')
    async adminDeleteReaction(
        @Param('articleId', ParseUUIDPipe) articleId: string,
        @Param('reactionId', ParseUUIDPipe) reactionId: string,
        @CurrentUser('userId') userId: string,
    ) {
        await this.emojiService.adminDeleteReaction(reactionId, userId);
        return new DeletedResponse('article.reaction_deleted', null, 'Đã xóa reaction');
    }
}
