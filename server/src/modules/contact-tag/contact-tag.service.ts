import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ContactTagRepository } from './contact-tag.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateContactTagDto, UpdateContactTagDto, QueryContactTagDto } from './dto';
import { IContactTagPaginatedResponse } from './interfaces';

@Injectable()
export class ContactTagService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: ContactTagRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_CONTACT_TAG_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_CONTACT_TAG_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        return `contact-tag:${id}`;
    }

    private getListCacheKey(query: QueryContactTagDto): string {
        return `contact-tag:list:${JSON.stringify(query)}`;
    }

    async create(dto: CreateContactTagDto, userId: string, lang: string) {
        // Kiểm tra trùng tên
        const existing = await this.repository.findByName(dto.name);
        if (existing) {
            throw new ConflictException(
                await this.i18n.t('contact-tag.errors.name_exists', { lang }),
            );
        }

        const tag = await this.repository.create({
            ...dto,
            created_by: userId,
        });

        await this.invalidateListCache();

        this.systemLogService.info('ContactTag', 'CREATE', `Tạo ContactTag mới: ${tag.name}`, {
            userId,
            metaData: { tagId: tag.id },
        });

        // Emit socket event
        this.websocketGateway.server.emit('contactTag:created', {
            tagId: tag.id,
            name: tag.name,
            color: tag.color,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return tag;
    }

    async findAll(query: QueryContactTagDto): Promise<IContactTagPaginatedResponse> {
        const { limit = 10, offset = 0, keywords, is_active } = query;

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
                { name: { contains: keywords, mode: 'insensitive' } },
                { description: { contains: keywords, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.repository.findAll({
                skip: offset,
                take: limit,
                where,
                orderBy: { name: 'asc' },
            }),
            this.repository.count(where),
        ]);

        const hasMore = offset + data.length < total;
        const result = { items: data, total, limit, offset, hasMore };

        await this.redisService.set(cacheKey, JSON.stringify(result), this.listCacheTTL);

        return result;
    }

    async findById(id: string, lang: string) {
        const cacheKey = this.getCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const tag = await this.repository.findById(id);
        if (!tag) {
            throw new NotFoundException(
                await this.i18n.t('contact-tag.errors.not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(tag), this.cacheTTL);

        return tag;
    }

    /**
     * Lấy danh sách tags đang active
     */
    async findAllActive(): Promise<IContactTagPaginatedResponse> {
        const cacheKey = 'contact-tag:active';
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

    async update(id: string, dto: UpdateContactTagDto, userId: string, lang: string) {
        const tag = await this.repository.findById(id);
        if (!tag) {
            throw new NotFoundException(
                await this.i18n.t('contact-tag.errors.not_found', { lang }),
            );
        }

        // Kiểm tra trùng tên nếu đổi tên
        if (dto.name && dto.name !== tag.name) {
            const existing = await this.repository.findByName(dto.name);
            if (existing) {
                throw new ConflictException(
                    await this.i18n.t('contact-tag.errors.name_exists', { lang }),
                );
            }
        }

        const updated = await this.repository.update(id, {
            ...dto,
            updated_by: userId,
        });

        await this.invalidateCache(id);
        await this.invalidateListCache();

        this.systemLogService.info('ContactTag', 'UPDATE', `Cập nhật ContactTag: ${updated.name}`, {
            userId,
            metaData: { tagId: id, updatedFields: Object.keys(dto) },
        });

        this.websocketGateway.server.emit('contactTag:updated', {
            tagId: id,
            name: updated.name,
            color: updated.color,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    async delete(id: string, userId: string, lang: string) {
        const tag = await this.repository.findById(id);
        if (!tag) {
            throw new NotFoundException(
                await this.i18n.t('contact-tag.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        await this.invalidateCache(id);
        await this.invalidateListCache();

        this.systemLogService.info('ContactTag', 'DELETE', `Xóa ContactTag: ${tag.name}`, {
            userId,
            metaData: { tagId: id },
        });

        this.websocketGateway.server.emit('contactTag:deleted', {
            tagId: id,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    async deleteMany(ids: string[], userId: string, lang: string) {
        const tags = await this.repository.findByIds(ids);
        if (tags.length === 0) {
            throw new NotFoundException(
                await this.i18n.t('contact-tag.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        await Promise.all(ids.map(id => this.invalidateCache(id)));
        await this.invalidateListCache();

        this.websocketGateway.server.emit('contactTag:deletedMany', {
            tagIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });

        tags.forEach(tag => {
            this.systemLogService.info('ContactTag', 'DELETE', `Xóa ContactTag: ${tag.name}`, {
                userId,
                metaData: { tagId: tag.id },
            });
        });
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        await this.redisService.delByPattern('contact-tag:list:*');
        await this.redisService.del('contact-tag:active');
    }
}
