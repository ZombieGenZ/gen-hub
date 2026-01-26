import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { AddonRepository } from './addon.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateAddonDto, UpdateAddonDto, QueryAddonDto, QueryActiveAddonDto } from './dto';

@Injectable()
export class AddonService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: AddonRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_ADDON_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_ADDON_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        const prefix = this.configService.get<string>('REDIS_ADDON_KEY_PREFIX', 'addon');
        return `${prefix}:${id}`;
    }

    private getListCacheKey(query: QueryAddonDto): string {
        const prefix = this.configService.get<string>('REDIS_ADDON_LIST_KEY_PREFIX', 'addon:list');
        return `${prefix}:${JSON.stringify(query)}`;
    }

    async create(dto: CreateAddonDto, userId: string, lang: string) {
        // Kiểm tra tên trùng
        const existing = await this.repository.findByName(dto.name);
        if (existing) {
            throw new ConflictException(
                this.i18n.t('addon.errors.name_exists', { lang }),
            );
        }

        const addon = await this.repository.create({
            ...dto,
            created_by: userId,
        });

        // Xóa cache list
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Addon', 'CREATE', this.i18n.t('addon.logs.created', { lang: 'vi', args: { name: addon.name } }), {
            userId,
            metaData: { addonId: addon.id, name: addon.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('addon:created', {
            addonId: addon.id,
            name: addon.name,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return addon;
    }

    async findAll(query: QueryAddonDto) {
        const { limit = 10, offset = 0, keywords, is_active, addon_type_id } = query;

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
                { name: { contains: keywords, mode: 'insensitive' } },
                { description: { contains: keywords, mode: 'insensitive' } },
            ];
        }

        // Filter theo addon_type_id thông qua bảng trung gian addon_types
        if (addon_type_id) {
            where.addon_types = {
                some: {
                    addon_type_id: addon_type_id,
                    is_deleted: false,
                },
            };
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

        const addon = await this.repository.findById(id);
        if (!addon) {
            throw new NotFoundException(
                this.i18n.t('addon.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(addon), this.cacheTTL);

        return addon;
    }

    // Lấy tất cả active addons (không phân trang, dùng cho dropdown)
    async findAllActive(query?: QueryActiveAddonDto) {
        const addonTypeId = query?.addon_type_id;
        const prefix = this.configService.get<string>('REDIS_ADDON_ACTIVE_KEY_PREFIX', 'addon:active');
        const cacheKey = addonTypeId ? `${prefix}:type:${addonTypeId}` : prefix;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const addons = await this.repository.findAllActive(addonTypeId);
        await this.redisService.set(cacheKey, JSON.stringify(addons), this.listCacheTTL);

        return addons;
    }

    async update(id: string, dto: UpdateAddonDto, userId: string, lang: string) {
        const addon = await this.repository.findById(id);
        if (!addon) {
            throw new NotFoundException(
                this.i18n.t('addon.errors.not_found', { lang }),
            );
        }

        // Kiểm tra tên trùng nếu đang cập nhật tên
        if (dto.name && dto.name !== addon.name) {
            const existing = await this.repository.findByName(dto.name, id);
            if (existing) {
                throw new ConflictException(
                    this.i18n.t('addon.errors.name_exists', { lang }),
                );
            }
        }

        const updated = await this.repository.update(id, {
            ...dto,
            updated_by: userId,
        });

        // Khi thay đổi is_active, cập nhật cả bảng mapping TierAddonGift
        if (dto.is_active !== undefined && dto.is_active !== addon.is_active) {
            await this.repository.updateTierGiftStatus(id, dto.is_active);
        }

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Addon', 'UPDATE', this.i18n.t('addon.logs.updated', { lang: 'vi', args: { name: updated.name } }), {
            userId,
            metaData: { addonId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('addon:updated', {
            addonId: id,
            name: updated.name,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    async delete(id: string, userId: string, lang: string) {
        const addon = await this.repository.findById(id);
        if (!addon) {
            throw new NotFoundException(
                this.i18n.t('addon.errors.not_found', { lang }),
            );
        }

        // Soft delete addon và các TierAddonGift liên quan
        await this.repository.softDelete(id, userId);
        await this.repository.softDeleteTierGifts(id, userId);

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Addon', 'DELETE', this.i18n.t('addon.logs.deleted', { lang: 'vi', args: { name: addon.name } }), {
            userId,
            metaData: { addonId: id, name: addon.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('addon:deleted', {
            addonId: id,
            name: addon.name,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    async deleteMany(ids: string[], userId: string, lang: string) {
        const addons = await this.repository.findByIds(ids);
        if (addons.length === 0) {
            throw new NotFoundException(
                this.i18n.t('addon.errors.not_found', { lang }),
            );
        }

        // Soft delete addons và TierAddonGifts
        await this.repository.softDeleteMany(ids, userId);
        for (const id of ids) {
            await this.repository.softDeleteTierGifts(id, userId);
        }

        // Invalidate cache
        await Promise.all(ids.map(id => this.invalidateCache(id)));
        await this.invalidateListCache();

        // Emit socket event
        this.websocketGateway.server.emit('addon:deletedMany', {
            addonIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Log
        addons.forEach(a => {
            this.systemLogService.info('Addon', 'DELETE', this.i18n.t('addon.logs.deleted', { lang: 'vi', args: { name: a.name } }), {
                userId,
                metaData: { addonId: a.id, name: a.name },
            });
        });
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        const listPrefix = this.configService.get<string>('REDIS_ADDON_LIST_KEY_PREFIX', 'addon:list');
        const activePrefix = this.configService.get<string>('REDIS_ADDON_ACTIVE_KEY_PREFIX', 'addon:active');
        await this.redisService.delByPattern(`${listPrefix}:*`);
        await this.redisService.delByPattern(`${activePrefix}*`);
    }
}
