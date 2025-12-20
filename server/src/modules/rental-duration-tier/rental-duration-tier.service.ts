import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { RentalDurationTierRepository } from './rental-duration-tier.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateRentalDurationTierDto, UpdateRentalDurationTierDto, QueryRentalDurationTierDto } from './dto';

@Injectable()
export class RentalDurationTierService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: RentalDurationTierRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_RENTAL_DURATION_TIER_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_RENTAL_DURATION_TIER_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        return `rental-duration-tier:${id}`;
    }

    private getListCacheKey(query: QueryRentalDurationTierDto): string {
        return `rental-duration-tier:list:${JSON.stringify(query)}`;
    }

    async create(dto: CreateRentalDurationTierDto, userId: string, lang: string) {
        // Kiểm tra tên trùng
        const existingName = await this.repository.findByName(dto.name);
        if (existingName) {
            throw new ConflictException(
                this.i18n.t('rental-duration-tier.errors.name_exists', { lang }),
            );
        }

        // Kiểm tra duration_value + duration_unit trùng
        const existingDuration = await this.repository.findByDuration(
            dto.duration_value,
            dto.duration_unit || 'MONTH',
        );
        if (existingDuration) {
            throw new ConflictException(
                this.i18n.t('rental-duration-tier.errors.duration_exists', { lang }),
            );
        }

        const tier = await this.repository.create({
            ...dto,
            created_by: userId,
        });

        // Xóa cache list
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('RentalDurationTier', 'CREATE', `Tạo mốc thời gian thuê: ${tier.name}`, {
            userId,
            metaData: { tierId: tier.id, name: tier.name, duration_value: tier.duration_value },
        });

        // Emit socket event
        this.websocketGateway.server.emit('rental-duration-tier:created', {
            tierId: tier.id,
            name: tier.name,
            durationValue: tier.duration_value,
            durationUnit: tier.duration_unit,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return tier;
    }

    async findAll(query: QueryRentalDurationTierDto) {
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
                orderBy: { order: 'asc' },
            }),
            this.repository.count(where),
        ]);

        const result = { items: data, total, limit, offset };

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

        const tier = await this.repository.findById(id);
        if (!tier) {
            throw new NotFoundException(
                this.i18n.t('rental-duration-tier.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(tier), this.cacheTTL);

        return tier;
    }

    // Lấy tất cả active tiers (không phân trang, dùng cho dropdown)
    async findAllActive() {
        const cacheKey = 'rental-duration-tier:active';
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const tiers = await this.repository.findAllActive();
        await this.redisService.set(cacheKey, JSON.stringify(tiers), this.listCacheTTL);

        return tiers;
    }

    async update(id: string, dto: UpdateRentalDurationTierDto, userId: string, lang: string) {
        const tier = await this.repository.findById(id);
        if (!tier) {
            throw new NotFoundException(
                this.i18n.t('rental-duration-tier.errors.not_found', { lang }),
            );
        }

        // Kiểm tra tên trùng nếu đang cập nhật tên
        if (dto.name && dto.name !== tier.name) {
            const existing = await this.repository.findByName(dto.name, id);
            if (existing) {
                throw new ConflictException(
                    this.i18n.t('rental-duration-tier.errors.name_exists', { lang }),
                );
            }
        }

        // Kiểm tra duration trùng nếu đang cập nhật
        const newDurationValue = dto.duration_value ?? tier.duration_value;
        const newDurationUnit = dto.duration_unit ?? tier.duration_unit;
        if (dto.duration_value !== undefined || dto.duration_unit !== undefined) {
            const existingDuration = await this.repository.findByDuration(
                newDurationValue,
                newDurationUnit,
                id,
            );
            if (existingDuration) {
                throw new ConflictException(
                    this.i18n.t('rental-duration-tier.errors.duration_exists', { lang }),
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
        this.systemLogService.info('RentalDurationTier', 'UPDATE', `Cập nhật mốc thời gian thuê: ${updated.name}`, {
            userId,
            metaData: { tierId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('rental-duration-tier:updated', {
            tierId: id,
            name: updated.name,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    async delete(id: string, userId: string, lang: string) {
        const tier = await this.repository.findById(id);
        if (!tier) {
            throw new NotFoundException(
                this.i18n.t('rental-duration-tier.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('RentalDurationTier', 'DELETE', `Xóa mốc thời gian thuê: ${tier.name}`, {
            userId,
            metaData: { tierId: id, name: tier.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('rental-duration-tier:deleted', {
            tierId: id,
            name: tier.name,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    async deleteMany(ids: string[], userId: string, lang: string) {
        const tiers = await this.repository.findByIds(ids);
        if (tiers.length === 0) {
            throw new NotFoundException(
                this.i18n.t('rental-duration-tier.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        // Invalidate cache
        await Promise.all(ids.map(id => this.invalidateCache(id)));
        await this.invalidateListCache();

        // Emit socket event for batch
        this.websocketGateway.server.emit('rental-duration-tier:deletedMany', {
            tierIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Log
        tiers.forEach(t => {
            this.systemLogService.info('RentalDurationTier', 'DELETE', `Xóa mốc thời gian thuê: ${t.name}`, {
                userId,
                metaData: { tierId: t.id, name: t.name },
            });
        });
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        await this.redisService.delByPattern('rental-duration-tier:list:*');
        await this.redisService.del('rental-duration-tier:active');
    }
}
