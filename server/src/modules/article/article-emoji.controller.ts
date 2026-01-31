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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { ArticleEmojiService } from './article-emoji.service';
import { CreateReactionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { GetResponse, OkResponse, DeletedResponse } from '../../common/responses/success.response';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators/api-common-responses.decorator';

@ApiTags('Article Emojis & Reactions')
@Controller('articles')
export class ArticleEmojiController {
    constructor(private readonly emojiService: ArticleEmojiService) { }

    @Get('emojis')
    @ApiOperation({
        summary: 'Lấy danh sách emoji',
        description: 'Lấy danh sách các emoji có thể sử dụng (được lưu trong hệ thống).'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách emoji thành công',
        schema: {
            example: {
                code: 'article.emojis',
                message: 'Lấy danh sách emoji thành công',
                success: true,
                data: [
                    { id: 'use_heart_123', code: 'heart', url: '/emojis/heart.png' }
                ]
            }
        }
    })
    async getAllEmojis() {
        const emojis = await this.emojiService.getAllEmojis();
        return new GetResponse('article.emojis', emojis, 'Lấy danh sách emoji thành công');
    }

    @Post(':id/reactions')
    @ApiOperation({
        summary: 'Thả reaction vào bài viết (toggle)',
        description: 'Thả hoặc bỏ reaction cho bài viết. Nếu user chưa react emoji này -> Thêm. Nếu đã react -> Bỏ (Toggle). Hỗ trợ user đăng nhập và guest (qua `guest_identifier`).'
    })
    @ApiParam({ name: 'id', description: 'ID của bài viết (UUID)', example: 'b6f48b98-5c49-436f-87a3-e4d355038e24' })
    @ApiValidationErrorResponse()
    @UseGuards(OptionalJwtAuthGuard)
    @ApiBody({
        type: CreateReactionDto,
        description: 'Thông tin reaction',
        examples: {
            heart: {
                summary: 'Thả tim',
                value: {
                    emoji: 'heart',
                    guest_identifier: 'guest_123456'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật reaction thành công (Thêm hoặc Xóa)',
        schema: {
            example: {
                code: 'article.reaction',
                message: 'Đã cập nhật reaction',
                success: true,
                data: {
                    action: 'ADDED', // hoặc REMOVED
                    emoji: 'heart',
                    count: 10
                }
            }
        }
    })
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
    @ApiOperation({
        summary: 'Bỏ reaction',
        description: 'Bỏ reaction cụ thể. Sử dụng API này nếu muốn explicit remove, còn API POST ở trên là Toggle.'
    })
    @ApiParam({ name: 'id', description: 'ID của bài viết (UUID)', example: 'b6f48b98-5c49-436f-87a3-e4d355038e24' })
    @ApiParam({ name: 'emojiId', description: 'ID hoặc Code của emoji', example: 'heart' })
    @ApiQuery({ name: 'guest_identifier', required: false, description: 'Định danh guest (nếu không đăng nhập)', example: 'guest_123456' })
    @UseGuards(OptionalJwtAuthGuard)
    @ApiResponse({
        status: 200,
        description: 'Bỏ reaction thành công',
        schema: {
            example: {
                code: 'article.reaction_removed',
                message: 'Đã bỏ reaction',
                success: true,
                data: null
            }
        }
    })
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
    @ApiOperation({
        summary: 'Lấy reaction summary của bài viết',
        description: 'Lấy tổng hợp số lượng từng loại reaction của bài viết.'
    })
    @ApiParam({ name: 'id', description: 'ID của bài viết (UUID)', example: 'b6f48b98-5c49-436f-87a3-e4d355038e24' })
    @ApiResponse({
        status: 200,
        description: 'Lấy summary thành công',
        schema: {
            example: {
                code: 'article.reactions',
                message: 'Lấy reactions thành công',
                success: true,
                data: {
                    total: 100,
                    details: [
                        { emoji: 'heart', count: 50 },
                        { emoji: 'like', count: 50 }
                    ]
                }
            }
        }
    })
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
    @ApiOperation({
        summary: 'Admin xóa reaction',
        description: 'Admin xóa một reaction cụ thể (Moderation). Yêu cầu quyền `article.admin`.'
    })
    @ApiAuthResponses()
    @ApiParam({ name: 'articleId', description: 'ID của bài viết (UUID)', example: 'b6f48b98-5c49-436f-87a3-e4d355038e24' })
    @ApiParam({ name: 'reactionId', description: 'ID của reaction (UUID)', example: 'r123456' })
    @ApiBearerAuth('JWT-auth')
    @RequirePermission('article.admin')
    @ApiResponse({
        status: 200,
        description: 'Xóa reaction thành công',
        schema: {
            example: {
                code: 'article.reaction_deleted',
                message: 'Đã xóa reaction',
                success: true,
                data: null
            }
        }
    })
    async adminDeleteReaction(
        @Param('articleId', ParseUUIDPipe) articleId: string,
        @Param('reactionId', ParseUUIDPipe) reactionId: string,
        @CurrentUser('userId') userId: string,
    ) {
        await this.emojiService.adminDeleteReaction(reactionId, userId);
        return new DeletedResponse('article.reaction_deleted', null, 'Đã xóa reaction');
    }
}
