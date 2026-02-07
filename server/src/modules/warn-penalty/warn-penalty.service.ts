import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { WarnPenaltyRepository } from './warn-penalty.repository';
import { CreateWarnPenaltyDto, UpdateWarnPenaltyDto, QueryWarnPenaltyDto } from './dto';
import { IWarnPenaltyListResult } from './interfaces';
import { WarnPenalty } from '@prisma/client';
import { RedisService } from '../redis/redis.service';
import { SystemLogService } from '../system-log/system-log.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class WarnPenaltyService {
    constructor(
        private readonly repository: WarnPenaltyRepository,
        private readonly redisService: RedisService,
        private readonly systemLogService: SystemLogService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) { }

    /**
     * Get cache key prefix from environment via ConfigService
     */
    private getCacheKeyPrefix(): string {
        return this.configService.get<string>('REDIS_WARN_PENALTY_KEY_PREFIX') || 'warn_penalty';
    }

    /**
     * Get list cache key prefix
     */
    private getListCacheKeyPrefix(): string {
        return `${this.getCacheKeyPrefix()}:list`;
    }

    /**
     * Get cache TTL from environment via ConfigService
     */
    private getCacheTtl(): number {
        return this.configService.get<number>('REDIS_WARN_PENALTY_CACHE_TTL') || 300;
    }

    /**
     * Get list cache TTL from environment via ConfigService
     */
    private getListCacheTtl(): number {
        return this.configService.get<number>('REDIS_WARN_PENALTY_LIST_CACHE_TTL') || 60;
    }

    /**
     * Tạo warn penalty mới (validate khoảng không đè lên nhau)
     */
    async create(
        dto: CreateWarnPenaltyDto,
        userId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<WarnPenalty> {
        // Validate max_warn_count >= min_warn_count nếu có
        if (dto.max_warn_count !== undefined && dto.max_warn_count < dto.min_warn_count) {
            throw new BadRequestException(
                this.i18n.t('warn-penalty.error.max_less_than_min', { lang }),
            );
        }

        // Kiểm tra ban vĩnh viễn thì không cần duration
        if (dto.is_permanent_ban) {
            dto.duration_value = undefined;
            dto.duration_unit = undefined;
        } else if (!dto.duration_value || !dto.duration_unit) {
            throw new BadRequestException(
                this.i18n.t('warn-penalty.error.duration_required', { lang }),
            );
        }

        // Kiểm tra khoảng có đè lên khoảng khác không
        const hasOverlap = await this.repository.hasOverlappingRange(
            dto.min_warn_count,
            dto.max_warn_count ?? null,
        );

        if (hasOverlap) {
            throw new BadRequestException(
                this.i18n.t('warn-penalty.error.overlapping_range', { lang }),
            );
        }

        const penalty = await this.repository.create({
            min_warn_count: dto.min_warn_count,
            max_warn_count: dto.max_warn_count,
            is_permanent_ban: dto.is_permanent_ban ?? false,
            duration_value: dto.duration_value,
            duration_unit: dto.duration_unit,
            description: dto.description,
            created_by: userId,
        });

        // Invalidate cache
        await this.invalidateListCache();

        // Log action with i18n
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'warn-penalty',
            action: 'create',
            message: this.i18n.t('warn-penalty.log.created', { lang, args: { min: dto.min_warn_count, max: dto.max_warn_count ?? '∞' } }) as string,
            userId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: { penaltyId: penalty.id, minWarn: dto.min_warn_count, maxWarn: dto.max_warn_count },
        });

        // Emit realtime event
        this.websocketGateway.emitWarnPenaltyCreated(
            penalty.id,
            penalty.min_warn_count,
            penalty.max_warn_count,
            userId,
        );

        return penalty;
    }

    /**
     * Lấy danh sách với phân trang
     */
    async findMany(
        query: QueryWarnPenaltyDto,
        lang: string,
    ): Promise<IWarnPenaltyListResult> {
        const cacheKey = `${this.getListCacheKeyPrefix()}:${JSON.stringify(query)}`;

        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findMany({
            limit: query.limit ? Number(query.limit) : 10,
            offset: query.offset ? Number(query.offset) : 0,
            keywords: query.keywords,
            status: query.status,
        });

        await this.redisService.set(cacheKey, JSON.stringify(result), this.getListCacheTtl());

        return result;
    }

    /**
     * Lấy tất cả active (cho dropdown hoặc internal use)
     */
    async findAllActive(lang: string): Promise<WarnPenalty[]> {
        const cacheKey = `${this.getCacheKeyPrefix()}:all_active`;

        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const items = await this.repository.findAllActive();
        await this.redisService.set(cacheKey, JSON.stringify(items), this.getCacheTtl());

        return items;
    }

    /**
     * Lấy chi tiết theo ID
     */
    async findById(id: string, lang: string): Promise<WarnPenalty> {
        const cacheKey = `${this.getCacheKeyPrefix()}:${id}`;

        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const penalty = await this.repository.findById(id);
        if (!penalty) {
            throw new NotFoundException(
                this.i18n.t('warn-penalty.error.not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(penalty), this.getCacheTtl());
        return penalty;
    }

    /**
     * Cập nhật warn penalty
     */
    async update(
        id: string,
        dto: UpdateWarnPenaltyDto,
        userId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<WarnPenalty> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('warn-penalty.error.not_found', { lang }),
            );
        }

        // Validate max_warn_count >= min_warn_count nếu có thay đổi
        const newMin = dto.min_warn_count ?? existing.min_warn_count;
        const newMax = dto.max_warn_count ?? existing.max_warn_count;

        if (newMax !== null && newMax !== undefined && newMax < newMin) {
            throw new BadRequestException(
                this.i18n.t('warn-penalty.error.max_less_than_min', { lang }),
            );
        }

        // Xử lý ban vĩnh viễn
        const isPermanent = dto.is_permanent_ban ?? existing.is_permanent_ban;
        let durationValue = dto.duration_value;
        let durationUnit = dto.duration_unit;

        if (isPermanent) {
            durationValue = undefined;
            durationUnit = undefined;
        } else {
            durationValue = dto.duration_value ?? existing.duration_value ?? undefined;
            durationUnit = dto.duration_unit ?? existing.duration_unit ?? undefined;

            if (!durationValue || !durationUnit) {
                throw new BadRequestException(
                    this.i18n.t('warn-penalty.error.duration_required', { lang }),
                );
            }
        }

        // Kiểm tra khoảng có đè lên khoảng khác không (loại trừ chính nó)
        if (dto.min_warn_count !== undefined || dto.max_warn_count !== undefined) {
            const hasOverlap = await this.repository.hasOverlappingRange(
                newMin,
                newMax ?? null,
                id,
            );

            if (hasOverlap) {
                throw new BadRequestException(
                    this.i18n.t('warn-penalty.error.overlapping_range', { lang }),
                );
            }
        }

        const penalty = await this.repository.update(id, {
            min_warn_count: dto.min_warn_count,
            max_warn_count: dto.max_warn_count,
            is_permanent_ban: dto.is_permanent_ban,
            duration_value: durationValue,
            duration_unit: durationUnit,
            description: dto.description,
            is_active: dto.is_active,
            updated_by: userId,
        });

        // Invalidate cache
        await this.invalidateItemCache(id);
        await this.invalidateListCache();

        // Log action with i18n
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'warn-penalty',
            action: 'update',
            message: this.i18n.t('warn-penalty.log.updated', { lang, args: { id } }) as string,
            userId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: { penaltyId: id, updatedFields: Object.keys(dto) },
        });

        // Emit realtime event
        this.websocketGateway.emitWarnPenaltyUpdated(
            penalty.id,
            penalty.min_warn_count,
            penalty.max_warn_count,
            userId,
        );

        return penalty;
    }

    /**
     * Xóa warn penalty
     */
    async delete(
        id: string,
        userId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<void> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('warn-penalty.error.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Invalidate cache
        await this.invalidateItemCache(id);
        await this.invalidateListCache();

        // Log action with i18n
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'warn-penalty',
            action: 'delete',
            message: this.i18n.t('warn-penalty.log.deleted', { lang, args: { min: existing.min_warn_count, max: existing.max_warn_count ?? '∞' } }) as string,
            userId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: { penaltyId: id },
        });

        // Emit realtime event
        this.websocketGateway.emitWarnPenaltyDeleted(id, userId);
    }

    /**
     * Xóa nhiều warn penalty
     */
    async deleteMany(
        ids: string[],
        userId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<number> {
        const count = await this.repository.softDeleteMany(ids, userId);

        // Invalidate cache
        for (const id of ids) {
            await this.invalidateItemCache(id);
        }
        await this.invalidateListCache();

        // Log action with i18n
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'warn-penalty',
            action: 'delete-many',
            message: this.i18n.t('warn-penalty.log.deleted_many', { lang, args: { count } }) as string,
            userId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: { ids, count },
        });

        // Emit realtime event
        this.websocketGateway.emitWarnPenaltyDeletedMany(ids, userId);

        return count;
    }

    /**
     * Tìm penalty phù hợp cho số lần warn (internal use)
     */
    async findPenaltyForWarnCount(warnCount: number): Promise<WarnPenalty | null> {
        return this.repository.findPenaltyForWarnCount(warnCount);
    }

    /**
     * Invalidate cache for a single item
     */
    private async invalidateItemCache(id: string): Promise<void> {
        await this.redisService.del(`${this.getCacheKeyPrefix()}:${id}`);
    }

    /**
     * Invalidate cache for list
     */
    private async invalidateListCache(): Promise<void> {
        await this.redisService.delByPattern(`${this.getListCacheKeyPrefix()}:*`);
        await this.redisService.del(`${this.getCacheKeyPrefix()}:all_active`);
    }
}
