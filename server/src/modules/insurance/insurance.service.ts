import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { InsuranceRepository } from './insurance.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateInsuranceDto, UpdateInsuranceDto, QueryInsuranceDto } from './dto';

/**
 * Service cho Insurance - Bảo hiểm
 */
@Injectable()
export class InsuranceService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: InsuranceRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_INSURANCE_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_INSURANCE_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        const prefix = this.configService.get<string>('REDIS_INSURANCE_KEY_PREFIX', 'insurance');
        return `${prefix}:${id}`;
    }

    private getListCacheKey(query: QueryInsuranceDto): string {
        const prefix = this.configService.get<string>('REDIS_INSURANCE_LIST_KEY_PREFIX', 'insurance:list');
        return `${prefix}:${JSON.stringify(query)}`;
    }

    /**
     * Tạo mới bảo hiểm
     */
    async create(dto: CreateInsuranceDto, userId: string, lang: string) {
        // Kiểm tra tên trùng
        const existing = await this.repository.findByName(dto.name);
        if (existing) {
            throw new ConflictException(
                this.i18n.t('insurance.errors.name_exists', { lang }),
            );
        }

        const insurance = await this.repository.create({
            ...dto,
            created_by: userId,
        });

        // Xóa cache list
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Insurance', 'CREATE', this.i18n.t('insurance.logs.created', { lang: 'vi', args: { name: insurance.name } }), {
            userId,
            metaData: { insuranceId: insurance.id, name: insurance.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('insurance:created', {
            insuranceId: insurance.id,
            name: insurance.name,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return insurance;
    }

    /**
     * Lấy danh sách bảo hiểm có phân trang
     */
    async findAll(query: QueryInsuranceDto, userId: string, hasListAllPermission: boolean) {
        const { limit = 10, offset = 0, keywords, is_active } = query;

        // Check cache - include userId and permission in cache key
        const cacheKey = `${this.getListCacheKey(query)}:${userId}:${hasListAllPermission}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const where: any = { is_deleted: false };

        // Nếu không có quyền list.all, chỉ lấy items của chính user
        if (!hasListAllPermission) {
            where.created_by = userId;
        }

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

    /**
     * Lấy chi tiết bảo hiểm theo ID
     */
    async findById(id: string, userId: string, hasReadAllPermission: boolean, lang: string) {
        // Check cache - include userId and permission in cache key
        const cacheKey = `${this.getCacheKey(id)}:${userId}:${hasReadAllPermission}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const insurance = await this.repository.findById(id, userId, hasReadAllPermission);
        if (!insurance) {
            throw new NotFoundException(
                this.i18n.t('insurance.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(insurance), this.cacheTTL);

        return insurance;
    }

    /**
     * Lấy tất cả bảo hiểm active (không phân trang, dùng cho dropdown)
     */
    async findAllActive(userId: string, hasListAllPermission: boolean) {
        const prefix = this.configService.get<string>('REDIS_INSURANCE_ACTIVE_KEY_PREFIX', 'insurance:active');
        const cacheKey = `${prefix}:${userId}:${hasListAllPermission}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const insurances = await this.repository.findAllActive(userId, hasListAllPermission);
        await this.redisService.set(cacheKey, JSON.stringify(insurances), this.listCacheTTL);

        return insurances;
    }

    /**
     * Cập nhật bảo hiểm
     */
    async update(id: string, dto: UpdateInsuranceDto, userId: string, hasUpdateAllPermission: boolean, lang: string) {
        const insurance = await this.repository.findById(id, userId, hasUpdateAllPermission);
        if (!insurance) {
            throw new NotFoundException(
                this.i18n.t('insurance.errors.not_found', { lang }),
            );
        }

        // Kiểm tra tên trùng nếu đang cập nhật tên
        if (dto.name && dto.name !== insurance.name) {
            const existing = await this.repository.findByName(dto.name, id);
            if (existing) {
                throw new ConflictException(
                    this.i18n.t('insurance.errors.name_exists', { lang }),
                );
            }
        }

        const updated = await this.repository.update(id, {
            ...dto,
            updated_by: userId,
        });

        // Khi thay đổi is_active, cập nhật cả các bảng mapping
        if (dto.is_active !== undefined && dto.is_active !== insurance.is_active) {
            await this.repository.updateTierGiftStatus(id, dto.is_active);
            await this.repository.updateWarehouseGiftStatus(id, dto.is_active);
            await this.repository.updateRowGiftStatus(id, dto.is_active);
        }

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Insurance', 'UPDATE', this.i18n.t('insurance.logs.updated', { lang: 'vi', args: { name: updated.name } }), {
            userId,
            metaData: { insuranceId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('insurance:updated', {
            insuranceId: id,
            name: updated.name,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    /**
     * Xóa bảo hiểm
     */
    async delete(id: string, userId: string, hasDeleteAllPermission: boolean, lang: string) {
        const insurance = await this.repository.findById(id, userId, hasDeleteAllPermission);
        if (!insurance) {
            throw new NotFoundException(
                this.i18n.t('insurance.errors.not_found', { lang }),
            );
        }

        // Soft delete insurance và các gift liên quan
        await this.repository.softDelete(id, userId);
        await this.repository.softDeleteTierGifts(id, userId);
        await this.repository.softDeleteWarehouseGifts(id, userId);
        await this.repository.softDeleteRowGifts(id, userId);

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Insurance', 'DELETE', this.i18n.t('insurance.logs.deleted', { lang: 'vi', args: { name: insurance.name } }), {
            userId,
            metaData: { insuranceId: id, name: insurance.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('insurance:deleted', {
            insuranceId: id,
            name: insurance.name,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Xóa nhiều bảo hiểm
     */
    async deleteMany(ids: string[], userId: string, hasDeleteAllPermission: boolean, lang: string) {
        const insurances = await this.repository.findByIds(ids, userId, hasDeleteAllPermission);
        if (insurances.length === 0) {
            throw new NotFoundException(
                this.i18n.t('insurance.errors.not_found', { lang }),
            );
        }

        // Soft delete insurances và gifts
        await this.repository.softDeleteMany(ids, userId);
        for (const id of ids) {
            await this.repository.softDeleteTierGifts(id, userId);
            await this.repository.softDeleteWarehouseGifts(id, userId);
            await this.repository.softDeleteRowGifts(id, userId);
        }

        // Invalidate cache
        await Promise.all(ids.map(id => this.invalidateCache(id)));
        await this.invalidateListCache();

        // Emit socket event
        this.websocketGateway.server.emit('insurance:deletedMany', {
            insuranceIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Log
        insurances.forEach(i => {
            this.systemLogService.info('Insurance', 'DELETE', this.i18n.t('insurance.logs.deleted', { lang: 'vi', args: { name: i.name } }), {
                userId,
                metaData: { insuranceId: i.id, name: i.name },
            });
        });
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        const listPrefix = this.configService.get<string>('REDIS_INSURANCE_LIST_KEY_PREFIX', 'insurance:list');
        const activePrefix = this.configService.get<string>('REDIS_INSURANCE_ACTIVE_KEY_PREFIX', 'insurance:active');
        await this.redisService.delByPattern(`${listPrefix}:*`);
        await this.redisService.del(`${activePrefix}`);
    }
}
