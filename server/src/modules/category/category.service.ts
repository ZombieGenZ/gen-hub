import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { CategoryRepository } from './category.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateCategoryDto, UpdateCategoryDto, QueryCategoryDto } from './dto';
import { ICategoryPaginatedResponse } from './interfaces';

@Injectable()
export class CategoryService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: CategoryRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_CATEGORY_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_CATEGORY_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        return `category:${id}`;
    }

    private getListCacheKey(query: QueryCategoryDto): string {
        return `category:list:${JSON.stringify(query)}`;
    }

    async create(dto: CreateCategoryDto, userId: string, lang: string) {
        // Kiểm tra slug đã tồn tại
        const slugExists = await this.repository.checkSlugExists(dto.slug);
        if (slugExists) {
            throw new ConflictException(
                this.i18n.t('category.errors.slug_exists', { lang }),
            );
        }

        const category = await this.repository.create({
            ...dto,
            created_by: userId,
        });

        // Xóa cache list
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Category', 'CREATE', `Tạo chủ đề mới: ${category.name}`, {
            userId,
            metaData: { categoryId: category.id },
        });

        // Emit socket event
        this.websocketGateway.server.emit('category:created', {
            categoryId: category.id,
            name: category.name,
            slug: category.slug,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return category;
    }

    async findAll(query: QueryCategoryDto): Promise<ICategoryPaginatedResponse> {
        const { limit = 10, offset = 0, keywords, status, is_active, is_featured } = query;

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

        if (is_active !== undefined) {
            where.is_active = is_active;
        }

        if (is_featured !== undefined) {
            where.is_featured = is_featured;
        }

        if (keywords) {
            where.OR = [
                { name: { contains: keywords, mode: 'insensitive' } },
                { description: { contains: keywords, mode: 'insensitive' } },
                { slug: { contains: keywords, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.repository.findAll({
                skip: offset,
                take: limit,
                where,
                orderBy: { order: 'asc' },
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

        const category = await this.repository.findById(id);
        if (!category) {
            throw new NotFoundException(
                this.i18n.t('category.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(category), this.cacheTTL);

        return category;
    }

    /**
     * Lấy danh sách Category công khai (active + published)
     */
    async findAllActive(): Promise<ICategoryPaginatedResponse> {
        const cacheKey = 'category:active';
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const data = await this.repository.findAllActive();
        const result = {
            items: data,
            total: data.length,
            limit: data.length,
            offset: 0,
            hasMore: false,
        };

        await this.redisService.set(cacheKey, JSON.stringify(result), this.listCacheTTL);

        return result;
    }

    async update(id: string, dto: UpdateCategoryDto, userId: string, lang: string) {
        const category = await this.repository.findById(id);
        if (!category) {
            throw new NotFoundException(
                this.i18n.t('category.errors.not_found', { lang }),
            );
        }

        // Kiểm tra slug nếu có thay đổi
        if (dto.slug && dto.slug !== category.slug) {
            const slugExists = await this.repository.checkSlugExists(dto.slug, id);
            if (slugExists) {
                throw new ConflictException(
                    this.i18n.t('category.errors.slug_exists', { lang }),
                );
            }
        }

        const updated = await this.repository.update(id, {
            ...dto,
            updated_by: userId,
        });

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Category', 'UPDATE', `Cập nhật chủ đề: ${updated.name}`, {
            userId,
            metaData: { categoryId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('category:updated', {
            categoryId: id,
            name: updated.name,
            slug: updated.slug,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    async delete(id: string, userId: string, lang: string) {
        const category = await this.repository.findById(id);
        if (!category) {
            throw new NotFoundException(
                this.i18n.t('category.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Category', 'DELETE', `Xóa chủ đề: ${category.name}`, {
            userId,
            metaData: { categoryId: id },
        });

        // Emit socket event
        this.websocketGateway.server.emit('category:deleted', {
            categoryId: id,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    async deleteMany(ids: string[], userId: string, lang: string) {
        const categories = await this.repository.findByIds(ids);
        if (categories.length === 0) {
            throw new NotFoundException(
                this.i18n.t('category.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        // Invalidate cache
        await Promise.all(ids.map(id => this.invalidateCache(id)));
        await this.invalidateListCache();

        // Emit socket event
        this.websocketGateway.server.emit('category:deletedMany', {
            categoryIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Log
        categories.forEach(category => {
            this.systemLogService.info('Category', 'DELETE', `Xóa chủ đề: ${category.name}`, {
                userId,
                metaData: { categoryId: category.id },
            });
        });
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        await this.redisService.delByPattern('category:list:*');
        await this.redisService.del('category:active');
    }
}
