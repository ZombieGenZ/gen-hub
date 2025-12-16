import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { AmenityRepository } from './amenity.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateAmenityDto, UpdateAmenityDto, QueryAmenityDto } from './dto';

@Injectable()
export class AmenityService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: AmenityRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_AMENITY_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_AMENITY_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        return `amenity:${id}`;
    }

    private getListCacheKey(query: QueryAmenityDto): string {
        return `amenity:list:${JSON.stringify(query)}`;
    }

    async create(dto: CreateAmenityDto, userId: string, lang: string) {
        // Kiểm tra tên trùng
        const existing = await this.repository.findByName(dto.name);
        if (existing) {
            throw new ConflictException(
                this.i18n.t('amenity.errors.name_exists', { lang }),
            );
        }

        const amenity = await this.repository.create({
            ...dto,
            created_by: userId,
        });

        // Xóa cache list
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Amenity', 'CREATE', `Tạo tiện ích mới: ${amenity.name}`, {
            userId,
            metaData: { amenityId: amenity.id, name: amenity.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('amenity:created', {
            amenityId: amenity.id,
            name: amenity.name,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return amenity;
    }

    async findAll(query: QueryAmenityDto, hasListAllPermission: boolean) {
        const { limit = 10, offset = 0, keywords, is_active } = query;

        // Check cache - include hasListAllPermission in key
        const cacheKey = `amenity:list:${JSON.stringify({ ...query })}:${hasListAllPermission}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const where: any = { is_deleted: false };

        // Nếu không có quyền list.all, chỉ hiển thị is_active = true
        if (!hasListAllPermission) {
            where.is_active = true;
        } else if (is_active !== undefined) {
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

        const result = { data, total, limit, offset };

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

        const amenity = await this.repository.findById(id);
        if (!amenity) {
            throw new NotFoundException(
                this.i18n.t('amenity.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(amenity), this.cacheTTL);

        return amenity;
    }

    async update(id: string, dto: UpdateAmenityDto, userId: string, lang: string) {
        const amenity = await this.repository.findById(id);
        if (!amenity) {
            throw new NotFoundException(
                this.i18n.t('amenity.errors.not_found', { lang }),
            );
        }

        // Kiểm tra tên trùng nếu đang cập nhật tên
        if (dto.name && dto.name !== amenity.name) {
            const existing = await this.repository.findByName(dto.name, id);
            if (existing) {
                throw new ConflictException(
                    this.i18n.t('amenity.errors.name_exists', { lang }),
                );
            }
        }

        const updated = await this.repository.update(id, {
            ...dto,
            updated_by: userId,
        });

        // Khi thay đổi is_active, cập nhật cả bảng mapping
        if (dto.is_active !== undefined && dto.is_active !== amenity.is_active) {
            await this.repository.updateMappingStatus(id, dto.is_active);
        }

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Amenity', 'UPDATE', `Cập nhật tiện ích: ${updated.name}`, {
            userId,
            metaData: { amenityId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('amenity:updated', {
            amenityId: id,
            name: updated.name,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    async delete(id: string, userId: string, lang: string) {
        const amenity = await this.repository.findById(id);
        if (!amenity) {
            throw new NotFoundException(
                this.i18n.t('amenity.errors.not_found', { lang }),
            );
        }

        // Soft delete amenity và cập nhật cả bảng mapping
        await this.repository.softDelete(id, userId);
        await this.repository.softDeleteMappings(id, userId);

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Amenity', 'DELETE', `Xóa tiện ích: ${amenity.name}`, {
            userId,
            metaData: { amenityId: id, name: amenity.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('amenity:deleted', {
            amenityId: id,
            name: amenity.name,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        await this.redisService.delByPattern('amenity:list:*');
    }
}
