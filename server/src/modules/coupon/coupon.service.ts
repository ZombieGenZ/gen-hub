import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { CouponRepository } from './coupon.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateCouponDto, UpdateCouponDto, QueryCouponDto } from './dto';

@Injectable()
export class CouponService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: CouponRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_COUPON_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_COUPON_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        return `coupon:${id}`;
    }

    private getListCacheKey(query: QueryCouponDto): string {
        return `coupon:list:${JSON.stringify(query)}`;
    }

    async create(dto: CreateCouponDto, userId: string, lang: string) {
        // Kiểm tra mã code trùng
        const existingCode = await this.repository.findByCode(dto.code);
        if (existingCode) {
            throw new ConflictException(
                this.i18n.t('coupon.errors.code_exists', { lang }),
            );
        }

        const coupon = await this.repository.create({
            ...dto,
            created_by: userId,
        });

        // Xóa cache list
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Coupon', 'CREATE', `Tạo coupon mới: ${coupon.name}`, {
            userId,
            metaData: { couponId: coupon.id, name: coupon.name, code: coupon.code },
        });

        // Emit socket event
        this.websocketGateway.server.emit('coupon:created', {
            couponId: coupon.id,
            name: coupon.name,
            code: coupon.code,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return coupon;
    }

    async findAll(query: QueryCouponDto) {
        const { limit = 10, offset = 0, keywords, is_active, is_public } = query;

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

        if (is_public !== undefined) {
            where.is_public = is_public;
        }

        if (keywords) {
            where.OR = [
                { name: { contains: keywords, mode: 'insensitive' } },
                { description: { contains: keywords, mode: 'insensitive' } },
                { code: { contains: keywords, mode: 'insensitive' } },
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

        const coupon = await this.repository.findById(id);
        if (!coupon) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(coupon), this.cacheTTL);

        return coupon;
    }

    async update(id: string, dto: UpdateCouponDto, userId: string, lang: string) {
        const coupon = await this.repository.findById(id);
        if (!coupon) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_found', { lang }),
            );
        }

        // Kiểm tra mã code trùng nếu đang cập nhật code
        if (dto.code && dto.code !== coupon.code) {
            const existing = await this.repository.findByCode(dto.code, id);
            if (existing) {
                throw new ConflictException(
                    this.i18n.t('coupon.errors.code_exists', { lang }),
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
        this.systemLogService.info('Coupon', 'UPDATE', `Cập nhật coupon: ${updated.name}`, {
            userId,
            metaData: { couponId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('coupon:updated', {
            couponId: id,
            name: updated.name,
            code: updated.code,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    async delete(id: string, userId: string, lang: string) {
        const coupon = await this.repository.findById(id);
        if (!coupon) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Coupon', 'DELETE', `Xóa coupon: ${coupon.name}`, {
            userId,
            metaData: { couponId: id, name: coupon.name, code: coupon.code },
        });

        // Emit socket event
        this.websocketGateway.server.emit('coupon:deleted', {
            couponId: id,
            name: coupon.name,
            code: coupon.code,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    async deleteMany(ids: string[], userId: string, lang: string) {
        const coupons = await this.repository.findByIds(ids);
        if (coupons.length === 0) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        // Invalidate cache
        await Promise.all(ids.map(id => this.invalidateCache(id)));
        await this.invalidateListCache();

        // Emit socket event
        this.websocketGateway.server.emit('coupon:deletedMany', {
            couponIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Log
        coupons.forEach(c => {
            this.systemLogService.info('Coupon', 'DELETE', `Xóa coupon: ${c.name}`, {
                userId,
                metaData: { couponId: c.id, name: c.name, code: c.code },
            });
        });
    }

    // Public APIs
    async findAllPublic(query: QueryCouponDto) {
        const { limit = 10, offset = 0, keywords } = query;

        const cacheKey = `coupon:public:${JSON.stringify({ limit, offset, keywords })}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const where: any = {
            is_deleted: false,
            is_active: true,
            is_public: true,
        };

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
        await this.redisService.set(cacheKey, JSON.stringify(result), this.listCacheTTL);

        return result;
    }

    async saveCoupon(userId: string, couponId: string, lang: string) {
        const coupon = await this.repository.findById(couponId);
        if (!coupon) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_found', { lang }),
            );
        }

        const existing = await this.repository.findSavedCouponByUser(userId, couponId);
        if (existing) {
            throw new ConflictException(
                this.i18n.t('coupon.errors.already_saved', { lang }),
            );
        }

        await this.repository.saveCouponForUser(userId, couponId, userId);
    }

    async unsaveCoupon(userId: string, couponId: string, lang: string) {
        const existing = await this.repository.findSavedCouponByUser(userId, couponId);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_saved', { lang }),
            );
        }

        await this.repository.unsaveCouponForUser(userId, couponId, userId);
    }

    async getSavedCoupons(userId: string, query: QueryCouponDto) {
        const { limit = 10, offset = 0 } = query;

        const [data, total] = await Promise.all([
            this.repository.getSavedCoupons(userId, offset, limit),
            this.repository.countSavedCoupons(userId),
        ]);

        const hasMore = offset + data.length < total;
        return {
            items: data.map(item => item.coupon),
            total,
            limit,
            offset,
            hasMore,
        };
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        await this.redisService.delByPattern('coupon:list:*');
        await this.redisService.delByPattern('coupon:public:*');
    }
}
