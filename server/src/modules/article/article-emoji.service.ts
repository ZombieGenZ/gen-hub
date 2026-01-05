import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ArticleRepository } from './article.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateReactionDto } from './dto';
import { IReactionSummary } from './interfaces';

@Injectable()
export class ArticleEmojiService {
    private readonly emojiCacheTTL: number;

    constructor(
        private readonly repository: ArticleRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.emojiCacheTTL = this.configService.get<number>('REDIS_ARTICLE_EMOJI_CACHE_TTL', 3600);
    }

    /**
     * Lấy danh sách emoji
     */
    async getAllEmojis() {
        const cacheKey = 'article:emojis';
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const emojis = await this.repository.findAllEmojis();
        await this.redisService.set(cacheKey, JSON.stringify(emojis), this.emojiCacheTTL);

        return emojis;
    }

    /**
     * Thả reaction vào bài viết
     */
    async addReaction(articleId: string, dto: CreateReactionDto, userId: string | null, lang: string) {
        // Kiểm tra article tồn tại
        const article = await this.repository.findById(articleId);
        if (!article) {
            throw new NotFoundException(
                this.i18n.t('article.errors.not_found', { lang }),
            );
        }

        // Kiểm tra emoji tồn tại
        const emoji = await this.repository.findEmojiById(dto.emoji_id);
        if (!emoji) {
            throw new NotFoundException(
                this.i18n.t('article.errors.emoji_not_found', { lang }),
            );
        }

        // Kiểm tra đã thả reaction chưa
        const existingReaction = await this.repository.findReaction(
            articleId,
            userId,
            dto.emoji_id,
            dto.guest_identifier,
        );

        if (existingReaction) {
            // Đã thả rồi thì xóa đi (toggle)
            await this.repository.deleteReaction(existingReaction.id);
        } else {
            // Chưa thả thì tạo mới
            await this.repository.createReaction({
                article: { connect: { id: articleId } },
                emoji: { connect: { id: dto.emoji_id } },
                user_id: userId,
                guest_identifier: dto.guest_identifier,
            });
        }

        // Sync like count
        await this.repository.syncLikeCount(articleId);

        // Invalidate cache
        await this.redisService.del(`article:${articleId}`);
        await this.redisService.del(`article:reactions:${articleId}`);

        // Emit socket event
        this.websocketGateway.server.emit('article:reaction', {
            articleId,
            emojiId: dto.emoji_id,
            emoji: emoji.emoji,
            action: existingReaction ? 'removed' : 'added',
            userId,
            timestamp: new Date().toISOString(),
        });

        return { toggled: !existingReaction };
    }

    /**
     * Bỏ reaction
     */
    async removeReaction(articleId: string, emojiId: string, userId: string | null, guestIdentifier: string | undefined, lang: string) {
        const reaction = await this.repository.findReaction(articleId, userId, emojiId, guestIdentifier);

        if (!reaction) {
            throw new NotFoundException(
                this.i18n.t('article.errors.reaction_not_found', { lang }),
            );
        }

        await this.repository.deleteReaction(reaction.id);
        await this.repository.syncLikeCount(articleId);

        // Invalidate cache
        await this.redisService.del(`article:${articleId}`);
        await this.redisService.del(`article:reactions:${articleId}`);

        // Emit socket event
        this.websocketGateway.server.emit('article:reaction', {
            articleId,
            emojiId,
            action: 'removed',
            userId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Lấy reaction summary của bài viết
     */
    async getReactionSummary(articleId: string, lang: string): Promise<IReactionSummary[]> {
        const article = await this.repository.findById(articleId);
        if (!article) {
            throw new NotFoundException(
                this.i18n.t('article.errors.not_found', { lang }),
            );
        }

        const cacheKey = `article:reactions:${articleId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const summary = await this.repository.getReactionSummary(articleId);
        await this.redisService.set(cacheKey, JSON.stringify(summary), 60);

        return summary;
    }

    /**
     * Admin xóa reaction
     */
    async adminDeleteReaction(reactionId: string, userId: string) {
        await this.repository.deleteReaction(reactionId);

        this.systemLogService.info('Article', 'ADMIN_DELETE_REACTION', `Admin xóa reaction`, {
            userId,
            metaData: { reactionId },
        });
    }
}
