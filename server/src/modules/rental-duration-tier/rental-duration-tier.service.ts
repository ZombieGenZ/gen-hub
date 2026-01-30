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
        const prefix = this.configService.get<string>('REDIS_RENTAL_DURATION_TIER_KEY_PREFIX', 'rental-duration-tier');
        return `${prefix}:${id}`;
    }

    private getListCacheKey(query: QueryRentalDurationTierDto): string {
        const prefix = this.configService.get<string>('REDIS_RENTAL_DURATION_TIER_LIST_KEY_PREFIX', 'rental-duration-tier:list');
        return `${prefix}:${JSON.stringify(query)}`;
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

        const { addon_gifts, insurance_gifts, ...tierData } = dto;
        const tier = await this.repository.create({
            ...tierData,
            created_by: userId,
        });

        // Tạo TierAddonGifts nếu có
        if (addon_gifts && addon_gifts.length > 0) {
            for (const gift of addon_gifts) {
                await this.repository.createAddonGift({
                    duration_tier_id: tier.id,
                    addon_id: gift.addon_id,
                    require_min_order_amount: gift.require_min_order_amount,
                    min_order_amount: gift.min_order_amount,
                    require_min_warehouses: gift.require_min_warehouses,
                    min_warehouses: gift.min_warehouses,
                    require_min_rows: gift.require_min_rows,
                    min_rows: gift.min_rows,
                    is_until_service_end: gift.is_until_service_end,
                    gift_duration_value: gift.gift_duration_value,
                    gift_duration_unit: gift.gift_duration_unit,
                    is_active: gift.is_active,
                    created_by: userId,
                });
            }
        }

        // Tạo TierInsuranceGifts nếu có
        if (insurance_gifts && insurance_gifts.length > 0) {
            for (const gift of insurance_gifts) {
                await this.repository.createInsuranceGift({
                    duration_tier_id: tier.id,
                    insurance_id: gift.insurance_id,
                    require_min_order_amount: gift.require_min_order_amount,
                    min_order_amount: gift.min_order_amount,
                    require_min_warehouses: gift.require_min_warehouses,
                    min_warehouses: gift.min_warehouses,
                    require_min_rows: gift.require_min_rows,
                    min_rows: gift.min_rows,
                    is_until_service_end: gift.is_until_service_end,
                    gift_duration_value: gift.gift_duration_value,
                    gift_duration_unit: gift.gift_duration_unit,
                    is_active: gift.is_active,
                    created_by: userId,
                });
            }
        }

        // Xóa cache list
        await this.invalidateListCache();

        // Ghi log
        const logAction = await this.i18n.translate('rental-duration-tier.logs.create', { args: { name: tier.name } });
        this.systemLogService.info('RentalDurationTier', 'CREATE', logAction || `Create rental duration tier: ${tier.name}`, {
            userId,
            metaData: { tierId: tier.id, name: tier.name, duration_value: tier.duration_value, addon_gifts_count: addon_gifts?.length || 0, insurance_gifts_count: insurance_gifts?.length || 0 },
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

        // Return với addon_gifts và insurance_gifts
        return (await this.repository.findByIdWithGifts(tier.id))!;
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
        const cacheKey = this.configService.get<string>('REDIS_RENTAL_DURATION_TIER_ACTIVE_KEY_PREFIX', 'rental-duration-tier:active');
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

        const { addon_gifts, insurance_gifts, ...tierData } = dto;
        const updated = await this.repository.update(id, {
            ...tierData,
            updated_by: userId,
        });

        // Xử lý addon_gifts nếu có
        if (addon_gifts !== undefined) {
            // Lấy danh sách addon_gifts hiện tại
            const existingGifts = await this.repository.findAddonGiftsByTierId(id);
            const existingGiftIds = existingGifts.map(g => g.id);
            const incomingGiftIds = addon_gifts.filter(g => g.id).map(g => g.id!);

            // Xóa các gifts không còn trong danh sách mới
            const toDelete = existingGiftIds.filter(giftId => !incomingGiftIds.includes(giftId));
            for (const giftId of toDelete) {
                await this.repository.softDeleteAddonGift(giftId, userId);
            }

            // Upsert các gifts
            for (const gift of addon_gifts) {
                if (gift.id && existingGiftIds.includes(gift.id)) {
                    // Update
                    await this.repository.updateAddonGift(gift.id, {
                        require_min_order_amount: gift.require_min_order_amount,
                        min_order_amount: gift.min_order_amount,
                        require_min_warehouses: gift.require_min_warehouses,
                        min_warehouses: gift.min_warehouses,
                        require_min_rows: gift.require_min_rows,
                        min_rows: gift.min_rows,
                        is_until_service_end: gift.is_until_service_end,
                        gift_duration_value: gift.gift_duration_value,
                        gift_duration_unit: gift.gift_duration_unit,
                        is_active: gift.is_active,
                        updated_by: userId,
                    });
                } else {
                    // Create
                    await this.repository.createAddonGift({
                        duration_tier_id: id,
                        addon_id: gift.addon_id,
                        require_min_order_amount: gift.require_min_order_amount,
                        min_order_amount: gift.min_order_amount,
                        require_min_warehouses: gift.require_min_warehouses,
                        min_warehouses: gift.min_warehouses,
                        require_min_rows: gift.require_min_rows,
                        min_rows: gift.min_rows,
                        is_until_service_end: gift.is_until_service_end,
                        gift_duration_value: gift.gift_duration_value,
                        gift_duration_unit: gift.gift_duration_unit,
                        is_active: gift.is_active,
                        created_by: userId,
                    });
                }
            }
        }

        // Xử lý insurance_gifts nếu có
        if (insurance_gifts !== undefined) {
            // Lấy danh sách insurance_gifts hiện tại
            const existingInsGifts = await this.repository.findInsuranceGiftsByTierId(id);
            const existingInsGiftIds = existingInsGifts.map(g => g.id);
            const incomingInsGiftIds = insurance_gifts.filter(g => g.id).map(g => g.id!);

            // Xóa các gifts không còn trong danh sách mới
            const toDeleteIns = existingInsGiftIds.filter(giftId => !incomingInsGiftIds.includes(giftId));
            for (const giftId of toDeleteIns) {
                await this.repository.softDeleteInsuranceGift(giftId, userId);
            }

            // Upsert các gifts
            for (const gift of insurance_gifts) {
                if (gift.id && existingInsGiftIds.includes(gift.id)) {
                    // Update
                    await this.repository.updateInsuranceGift(gift.id, {
                        require_min_order_amount: gift.require_min_order_amount,
                        min_order_amount: gift.min_order_amount,
                        require_min_warehouses: gift.require_min_warehouses,
                        min_warehouses: gift.min_warehouses,
                        require_min_rows: gift.require_min_rows,
                        min_rows: gift.min_rows,
                        is_until_service_end: gift.is_until_service_end,
                        gift_duration_value: gift.gift_duration_value,
                        gift_duration_unit: gift.gift_duration_unit,
                        is_active: gift.is_active,
                        updated_by: userId,
                    });
                } else {
                    // Create
                    await this.repository.createInsuranceGift({
                        duration_tier_id: id,
                        insurance_id: gift.insurance_id,
                        require_min_order_amount: gift.require_min_order_amount,
                        min_order_amount: gift.min_order_amount,
                        require_min_warehouses: gift.require_min_warehouses,
                        min_warehouses: gift.min_warehouses,
                        require_min_rows: gift.require_min_rows,
                        min_rows: gift.min_rows,
                        is_until_service_end: gift.is_until_service_end,
                        gift_duration_value: gift.gift_duration_value,
                        gift_duration_unit: gift.gift_duration_unit,
                        is_active: gift.is_active,
                        created_by: userId,
                    });
                }
            }
        }

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        const logAction = await this.i18n.translate('rental-duration-tier.logs.update', { args: { name: updated.name } });
        this.systemLogService.info('RentalDurationTier', 'UPDATE', logAction || `Update rental duration tier: ${updated.name}`, {
            userId,
            metaData: { tierId: id, updatedFields: Object.keys(dto), addon_gifts_count: addon_gifts?.length || 0, insurance_gifts_count: insurance_gifts?.length || 0 },
        });

        // Emit socket event
        this.websocketGateway.server.emit('rental-duration-tier:updated', {
            tierId: id,
            name: updated.name,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Return với addon_gifts và insurance_gifts
        return (await this.repository.findByIdWithGifts(id))!;
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
        const logAction = await this.i18n.translate('rental-duration-tier.logs.delete', { args: { name: tier.name } });
        this.systemLogService.info('RentalDurationTier', 'DELETE', logAction || `Delete rental duration tier: ${tier.name}`, {
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
        for (const t of tiers) {
            const logAction = await this.i18n.translate('rental-duration-tier.logs.delete', { args: { name: t.name } });
            this.systemLogService.info('RentalDurationTier', 'DELETE', logAction || `Delete rental duration tier: ${t.name}`, {
                userId,
                metaData: { tierId: t.id, name: t.name },
            });
        }
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        const listPrefix = this.configService.get<string>('REDIS_RENTAL_DURATION_TIER_LIST_KEY_PREFIX', 'rental-duration-tier:list');
        const activeKey = this.configService.get<string>('REDIS_RENTAL_DURATION_TIER_ACTIVE_KEY_PREFIX', 'rental-duration-tier:active');
        await this.redisService.delByPattern(`${listPrefix}:*`);
        await this.redisService.del(activeKey);
    }
}
