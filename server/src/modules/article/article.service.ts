import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ArticleRepository } from './article.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateArticleDto, UpdateArticleDto, QueryArticleDto } from './dto';
import { IArticlePaginatedResponse, ISeoGenerationResult } from './interfaces';

@Injectable()
export class ArticleService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: ArticleRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_ARTICLE_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_ARTICLE_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        return `article:${id}`;
    }

    private getListCacheKey(query: QueryArticleDto): string {
        return `article:list:${JSON.stringify(query)}`;
    }

    async create(dto: CreateArticleDto, userId: string, lang: string) {
        // Kiểm tra slug đã tồn tại
        const slugExists = await this.repository.checkSlugExists(dto.slug);
        if (slugExists) {
            throw new ConflictException(
                this.i18n.t('article.errors.slug_exists', { lang }),
            );
        }

        const { category_ids, published_at, scheduled_at, ...articleData } = dto;

        const article = await this.repository.create({
            ...articleData,
            published_at: published_at ? new Date(published_at) : undefined,
            scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
            author_id: userId,
            created_by: userId,
        });

        // Cập nhật categories nếu có
        if (category_ids && category_ids.length > 0) {
            await this.repository.updateCategories(article.id, category_ids, userId);
        }

        // Xóa cache list
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Article', 'CREATE', `Tạo bài viết mới: ${article.title}`, {
            userId,
            metaData: { articleId: article.id },
        });

        // Emit socket event
        this.websocketGateway.server.emit('article:created', {
            articleId: article.id,
            title: article.title,
            slug: article.slug,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Reload article to get categories
        return this.repository.findById(article.id);
    }

    async findAll(query: QueryArticleDto): Promise<IArticlePaginatedResponse> {
        const { limit = 10, offset = 0, keywords, status, type, is_active, is_featured, category_id } = query;

        // Check cache
        const cacheKey = this.getListCacheKey(query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const where: any = { is_deleted: false };

        if (status !== undefined) {
            where.status = status;
        }

        if (type !== undefined) {
            where.type = type;
        }

        if (is_active !== undefined) {
            where.is_active = is_active;
        }

        if (is_featured !== undefined) {
            where.is_featured = is_featured;
        }

        if (category_id) {
            where.categories = {
                some: {
                    category_id: category_id,
                    is_deleted: false,
                },
            };
        }

        if (keywords) {
            where.OR = [
                { title: { contains: keywords, mode: 'insensitive' } },
                { excerpt: { contains: keywords, mode: 'insensitive' } },
                { content: { contains: keywords, mode: 'insensitive' } },
                { slug: { contains: keywords, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.repository.findAll({
                skip: offset,
                take: limit,
                where,
                orderBy: { created_at: 'desc' },
            }),
            this.repository.count(where),
        ]);

        const hasMore = offset + data.length < total;
        const result = { items: data, total, limit, offset, hasMore };

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(result), this.listCacheTTL);

        return result;
    }

    async findById(id: string, lang: string) {
        // Check cache
        const cacheKey = this.getCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const article = await this.repository.findById(id);
        if (!article) {
            throw new NotFoundException(
                this.i18n.t('article.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(article), this.cacheTTL);

        return article;
    }

    /**
     * Lấy danh sách bài viết công khai (published)
     */
    async findAllPublished(query: QueryArticleDto): Promise<IArticlePaginatedResponse> {
        const { limit = 10, offset = 0, keywords, type, category_id } = query;

        const cacheKey = `article:public:${JSON.stringify({ limit, offset, keywords, type, category_id })}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const where: any = {};

        if (type) where.type = type;
        if (category_id) {
            where.categories = {
                some: { category_id, is_deleted: false },
            };
        }
        if (keywords) {
            where.OR = [
                { title: { contains: keywords, mode: 'insensitive' } },
                { excerpt: { contains: keywords, mode: 'insensitive' } },
            ];
        }

        const data = await this.repository.findAllPublished({ skip: offset, take: limit, where });
        const total = await this.repository.count({
            ...where,
            is_active: true,
            is_deleted: false,
            status: 'PUBLISHED',
        });

        const hasMore = offset + data.length < total;
        const result = { items: data, total, limit, offset, hasMore };

        await this.redisService.set(cacheKey, JSON.stringify(result), this.listCacheTTL);

        return result;
    }

    async update(id: string, dto: UpdateArticleDto, userId: string, lang: string) {
        const article = await this.repository.findById(id);
        if (!article) {
            throw new NotFoundException(
                this.i18n.t('article.errors.not_found', { lang }),
            );
        }

        // Kiểm tra slug nếu có thay đổi
        if (dto.slug && dto.slug !== article.slug) {
            const slugExists = await this.repository.checkSlugExists(dto.slug, id);
            if (slugExists) {
                throw new ConflictException(
                    this.i18n.t('article.errors.slug_exists', { lang }),
                );
            }
        }

        const { category_ids, published_at, scheduled_at, ...articleData } = dto;

        // Lưu lịch sử chỉnh sửa nếu title, content, excerpt thay đổi
        const hasContentChange = dto.title !== undefined || dto.content !== undefined || dto.excerpt !== undefined;
        if (hasContentChange) {
            await this.repository.createEditHistory({
                article: { connect: { id } },
                edited_by: userId,
                old_title: article.title,
                new_title: dto.title || article.title,
                old_content: dto.content !== undefined ? article.content : undefined,
                new_content: dto.content,
                old_excerpt: dto.excerpt !== undefined ? article.excerpt : undefined,
                new_excerpt: dto.excerpt,
            });
        }

        const updated = await this.repository.update(id, {
            ...articleData,
            published_at: published_at ? new Date(published_at) : undefined,
            scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
            updated_by: userId,
        });

        // Cập nhật categories nếu có
        if (category_ids !== undefined) {
            await this.repository.updateCategories(id, category_ids, userId);
        }

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Article', 'UPDATE', `Cập nhật bài viết: ${updated.title}`, {
            userId,
            metaData: { articleId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('article:updated', {
            articleId: id,
            title: updated.title,
            slug: updated.slug,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return this.repository.findById(id);
    }

    async delete(id: string, userId: string, lang: string) {
        const article = await this.repository.findById(id);
        if (!article) {
            throw new NotFoundException(
                this.i18n.t('article.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Article', 'DELETE', `Xóa bài viết: ${article.title}`, {
            userId,
            metaData: { articleId: id },
        });

        // Emit socket event
        this.websocketGateway.server.emit('article:deleted', {
            articleId: id,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    async deleteMany(ids: string[], userId: string, lang: string) {
        const articles = await this.repository.findByIds(ids);
        if (articles.length === 0) {
            throw new NotFoundException(
                this.i18n.t('article.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        // Invalidate cache
        await Promise.all(ids.map(id => this.invalidateCache(id)));
        await this.invalidateListCache();

        // Emit socket event
        this.websocketGateway.server.emit('article:deletedMany', {
            articleIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Log
        articles.forEach(article => {
            this.systemLogService.info('Article', 'DELETE', `Xóa bài viết: ${article.title}`, {
                userId,
                metaData: { articleId: article.id },
            });
        });
    }

    // Tăng view count
    async incrementView(id: string, lang: string) {
        const article = await this.repository.findById(id);
        if (!article) {
            throw new NotFoundException(
                this.i18n.t('article.errors.not_found', { lang }),
            );
        }

        await this.repository.incrementViewCount(id);
        await this.invalidateCache(id);
    }

    // Tăng share count
    async incrementShare(id: string, lang: string) {
        const article = await this.repository.findById(id);
        if (!article) {
            throw new NotFoundException(
                this.i18n.t('article.errors.not_found', { lang }),
            );
        }

        await this.repository.incrementShareCount(id);
        await this.invalidateCache(id);
    }

    // Lấy lịch sử chỉnh sửa
    async getEditHistory(id: string, lang: string) {
        const article = await this.repository.findById(id);
        if (!article) {
            throw new NotFoundException(
                this.i18n.t('article.errors.not_found', { lang }),
            );
        }

        return this.repository.getEditHistory(id);
    }

    /**
     * Generate SEO bằng AI (Gemini)
     * Sẽ được implement với Gemini API
     */
    async generateSeo(id: string, userId: string, lang: string): Promise<ISeoGenerationResult> {
        const article = await this.repository.findById(id);
        if (!article) {
            throw new NotFoundException(
                this.i18n.t('article.errors.not_found', { lang }),
            );
        }

        // TODO: Integrate with Gemini AI
        // Tạm thời trả về placeholder
        const seoResult: ISeoGenerationResult = {
            seo_title: article.title.substring(0, 60),
            seo_description: article.excerpt || article.content.substring(0, 160),
            seo_keywords: article.title.toLowerCase().split(' ').filter(w => w.length > 3),
        };

        // Cập nhật bài viết với SEO
        await this.repository.update(id, {
            seo_title: seoResult.seo_title,
            seo_description: seoResult.seo_description,
            seo_keywords: seoResult.seo_keywords,
            updated_by: userId,
        });

        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Article', 'SEO_GENERATE', `Generate SEO cho bài viết: ${article.title}`, {
            userId,
            metaData: { articleId: id },
        });

        return seoResult;
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        await this.redisService.delByPattern('article:list:*');
        await this.redisService.delByPattern('article:public:*');
    }
}
