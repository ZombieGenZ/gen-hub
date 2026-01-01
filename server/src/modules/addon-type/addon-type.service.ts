import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { AddonTypeRepository } from './addon-type.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateAddonTypeDto, UpdateAddonTypeDto, QueryAddonTypeDto } from './dto';
import { IAddonTypePaginatedResponse } from './interfaces';

@Injectable()
export class AddonTypeService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: AddonTypeRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_ADDON_TYPE_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_ADDON_TYPE_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        return `addon-type:${id}`;
    }

    private getListCacheKey(query: QueryAddonTypeDto): string {
        return `addon-type:list:${JSON.stringify(query)}`;
    }

    async create(dto: CreateAddonTypeDto, userId: string, lang: string) {
        // Kiểm tra tên trùng
        const existing = await this.repository.findByName(dto.name);
        if (existing) {
            throw new ConflictException(
                this.i18n.t('addon-type.errors.name_exists', { lang }),
            );
        }

        const addonType = await this.repository.create({
            ...dto,
            created_by: userId,
        });

        // Xóa cache list
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('AddonType', 'CREATE', `Tạo loại addon mới: ${addonType.name}`, {
            userId,
            metaData: { addonTypeId: addonType.id, name: addonType.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('addonType:created', {
            addonTypeId: addonType.id,
            name: addonType.name,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return addonType;
    }

    async findAll(query: QueryAddonTypeDto): Promise<IAddonTypePaginatedResponse> {
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
                { name: { contains: keywords, mode: 'insensitive' } },
                { description: { contains: keywords, mode: 'insensitive' } },
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

        const addonType = await this.repository.findById(id);
        if (!addonType) {
            throw new NotFoundException(
                this.i18n.t('addon-type.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(addonType), this.cacheTTL);

        return addonType;
    }

    async findAllActive() {
        const cacheKey = 'addon-type:active';
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const addonTypes = await this.repository.findAllActive();
        await this.redisService.set(cacheKey, JSON.stringify(addonTypes), this.listCacheTTL);

        return addonTypes;
    }

    async update(id: string, dto: UpdateAddonTypeDto, userId: string, lang: string) {
        const addonType = await this.repository.findById(id);
        if (!addonType) {
            throw new NotFoundException(
                this.i18n.t('addon-type.errors.not_found', { lang }),
            );
        }

        // Kiểm tra tên trùng nếu đang cập nhật tên
        if (dto.name && dto.name !== addonType.name) {
            const existing = await this.repository.findByName(dto.name, id);
            if (existing) {
                throw new ConflictException(
                    this.i18n.t('addon-type.errors.name_exists', { lang }),
                );
            }
        }

        const updated = await this.repository.update(id, {
            ...dto,
            updated_by: userId,
        });

        // Khi thay đổi is_active, cập nhật cả bảng mapping
        if (dto.is_active !== undefined && dto.is_active !== addonType.is_active) {
            await this.repository.updateMappingStatus(id, dto.is_active);
        }

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('AddonType', 'UPDATE', `Cập nhật loại addon: ${updated.name}`, {
            userId,
            metaData: { addonTypeId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('addonType:updated', {
            addonTypeId: id,
            name: updated.name,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    async delete(id: string, userId: string, lang: string) {
        const addonType = await this.repository.findById(id);
        if (!addonType) {
            throw new NotFoundException(
                this.i18n.t('addon-type.errors.not_found', { lang }),
            );
        }

        // Soft delete loại addon và mappings
        await this.repository.softDelete(id, userId);
        await this.repository.softDeleteMappings(id, userId);

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('AddonType', 'DELETE', `Xóa loại addon: ${addonType.name}`, {
            userId,
            metaData: { addonTypeId: id, name: addonType.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('addonType:deleted', {
            addonTypeId: id,
            name: addonType.name,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    async deleteMany(ids: string[], userId: string, lang: string) {
        const addonTypes = await this.repository.findByIds(ids);
        if (addonTypes.length === 0) {
            throw new NotFoundException(
                this.i18n.t('addon-type.errors.not_found', { lang }),
            );
        }

        // Soft delete và mappings
        await this.repository.softDeleteMany(ids, userId);
        for (const id of ids) {
            await this.repository.softDeleteMappings(id, userId);
        }

        // Invalidate cache
        await Promise.all(ids.map(id => this.invalidateCache(id)));
        await this.invalidateListCache();

        // Emit socket event
        this.websocketGateway.server.emit('addonType:deletedMany', {
            addonTypeIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Log
        addonTypes.forEach(at => {
            this.systemLogService.info('AddonType', 'DELETE', `Xóa loại addon: ${at.name}`, {
                userId,
                metaData: { addonTypeId: at.id, name: at.name },
            });
        });
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        await this.redisService.delByPattern('addon-type:list:*');
        await this.redisService.del('addon-type:active');
    }
}
