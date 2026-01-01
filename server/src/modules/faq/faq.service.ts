import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { FaqRepository } from './faq.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateFaqDto, UpdateFaqDto, QueryFaqDto } from './dto';
import { IFaqPaginatedResponse } from './interfaces';

@Injectable()
export class FaqService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: FaqRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_FAQ_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_FAQ_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        return `faq:${id}`;
    }

    private getListCacheKey(query: QueryFaqDto): string {
        return `faq:list:${JSON.stringify(query)}`;
    }

    async create(dto: CreateFaqDto, userId: string, lang: string) {
        const faq = await this.repository.create({
            ...dto,
            created_by: userId,
        });

        // Xóa cache list
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('FAQ', 'CREATE', `Tạo FAQ mới: ${faq.question.substring(0, 50)}`, {
            userId,
            metaData: { faqId: faq.id },
        });

        // Emit socket event
        this.websocketGateway.server.emit('faq:created', {
            faqId: faq.id,
            question: faq.question,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return faq;
    }

    async findAll(query: QueryFaqDto): Promise<IFaqPaginatedResponse> {
        const { limit = 10, offset = 0, keywords, is_active } = query;

        // Check cache
        const cacheKey = this.getListCacheKey(query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const where: any = { is_deleted: false };

        if (is_active !== undefined) {
            where.is_active = is_active;
        }

        if (keywords) {
            where.OR = [
                { question: { contains: keywords, mode: 'insensitive' } },
                { answer: { contains: keywords, mode: 'insensitive' } },
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

        const faq = await this.repository.findById(id);
        if (!faq) {
            throw new NotFoundException(
                this.i18n.t('faq.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(faq), this.cacheTTL);

        return faq;
    }

    /**
     * Lấy danh sách FAQ công khai (không cần auth)
     */
    async findAllPublic(): Promise<IFaqPaginatedResponse> {
        const cacheKey = 'faq:public';
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

    async update(id: string, dto: UpdateFaqDto, userId: string, lang: string) {
        const faq = await this.repository.findById(id);
        if (!faq) {
            throw new NotFoundException(
                this.i18n.t('faq.errors.not_found', { lang }),
            );
        }

        const updated = await this.repository.update(id, {
            ...dto,
            updated_by: userId,
        });

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('FAQ', 'UPDATE', `Cập nhật FAQ: ${updated.question.substring(0, 50)}`, {
            userId,
            metaData: { faqId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('faq:updated', {
            faqId: id,
            question: updated.question,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    async delete(id: string, userId: string, lang: string) {
        const faq = await this.repository.findById(id);
        if (!faq) {
            throw new NotFoundException(
                this.i18n.t('faq.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('FAQ', 'DELETE', `Xóa FAQ: ${faq.question.substring(0, 50)}`, {
            userId,
            metaData: { faqId: id },
        });

        // Emit socket event
        this.websocketGateway.server.emit('faq:deleted', {
            faqId: id,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    async deleteMany(ids: string[], userId: string, lang: string) {
        const faqs = await this.repository.findByIds(ids);
        if (faqs.length === 0) {
            throw new NotFoundException(
                this.i18n.t('faq.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        // Invalidate cache
        await Promise.all(ids.map(id => this.invalidateCache(id)));
        await this.invalidateListCache();

        // Emit socket event
        this.websocketGateway.server.emit('faq:deletedMany', {
            faqIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Log
        faqs.forEach(faq => {
            this.systemLogService.info('FAQ', 'DELETE', `Xóa FAQ: ${faq.question.substring(0, 50)}`, {
                userId,
                metaData: { faqId: faq.id },
            });
        });
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        await this.redisService.delByPattern('faq:list:*');
        await this.redisService.del('faq:public');
    }
}
