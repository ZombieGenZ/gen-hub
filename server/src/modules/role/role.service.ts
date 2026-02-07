import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { RoleRepository } from './role.repository';
import {
    CreateRoleDto,
    UpdateRoleDto,
    QueryRoleDto,
    StatusFilter,
} from './dto';
import { IRoleListResult, IRoleWithPermissions } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { SystemLogService } from '../system-log/system-log.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { Role } from '@prisma/client';

@Injectable()
export class RoleService {
    constructor(
        private readonly repository: RoleRepository,
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
        return this.configService.get<string>('REDIS_ROLE_KEY_PREFIX') || 'role';
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
        return this.configService.get<number>('REDIS_ROLE_CACHE_TTL') || 300;
    }

    /**
     * Get list cache TTL from environment via ConfigService
     */
    private getListCacheTtl(): number {
        return this.configService.get<number>('REDIS_ROLE_LIST_CACHE_TTL') || 60;
    }

    /**
     * Tạo role mới
     */
    async create(
        dto: CreateRoleDto,
        userId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<Role> {
        const role = await this.repository.create({
            name: dto.name,
            description: dto.description,
            is_default: dto.is_default,
        });

        // Sync permissions nếu có
        if (dto.permission_ids && dto.permission_ids.length > 0) {
            await this.repository.syncRolePermissions(role.id, dto.permission_ids);
        }

        // Invalidate cache
        await this.invalidateListCache();

        // Log action with i18n
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'role',
            action: 'create',
            message: this.i18n.t('role.log.created', { lang, args: { name: role.name } }) as string,
            userId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: { roleId: role.id, permissionCount: dto.permission_ids?.length || 0 },
        });

        // Emit socket
        this.websocketGateway.emitRoleCreated(role.id, role.name, userId);

        return role;
    }

    /**
     * Lấy danh sách roles
     */
    async findMany(query: QueryRoleDto, lang: string): Promise<IRoleListResult> {
        const limit = query.limit ? Number(query.limit) : 10;
        const offset = query.offset ? Number(query.offset) : 0;
        const status = query.status || StatusFilter.ACTIVE;

        const cacheKey = `${this.getListCacheKeyPrefix()}:${JSON.stringify({ limit, offset, keywords: query.keywords, status })}`;

        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findMany({
            limit,
            offset,
            keywords: query.keywords,
            status,
        });

        await this.redisService.set(cacheKey, JSON.stringify(result), this.getListCacheTtl());

        return result;
    }

    /**
     * Lấy chi tiết role với permissions
     */
    async findById(id: string, lang: string): Promise<IRoleWithPermissions> {
        const cacheKey = `${this.getCacheKeyPrefix()}:${id}`;

        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const role = await this.repository.findByIdWithPermissions(id);
        if (!role) {
            throw new NotFoundException(
                await this.i18n.t('role.error.not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(role), this.getCacheTtl());

        return role;
    }

    /**
     * Cập nhật role
     */
    async update(
        id: string,
        dto: UpdateRoleDto,
        userId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<Role> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                await this.i18n.t('role.error.not_found', { lang }),
            );
        }

        const role = await this.repository.update(id, {
            name: dto.name,
            description: dto.description,
            is_default: dto.is_default,
            is_active: dto.is_active,
        });

        // Sync permissions nếu có
        if (dto.permission_ids !== undefined) {
            await this.repository.syncRolePermissions(id, dto.permission_ids);
        }

        // Invalidate cache
        await this.invalidateItemCache(id);
        await this.invalidateListCache();

        // Log action with i18n
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'role',
            action: 'update',
            message: this.i18n.t('role.log.updated', { lang, args: { name: role.name } }) as string,
            userId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: { roleId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket
        this.websocketGateway.emitRoleUpdated(role.id, role.name, userId);

        return role;
    }

    /**
     * Xóa role
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
                await this.i18n.t('role.error.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id);

        // Invalidate cache
        await this.invalidateItemCache(id);
        await this.invalidateListCache();

        // Log action with i18n
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'role',
            action: 'delete',
            message: this.i18n.t('role.log.deleted', { lang, args: { name: existing.name } }) as string,
            userId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: { roleId: id },
        });

        // Emit socket
        this.websocketGateway.emitRoleDeleted(id, userId);
    }

    /**
     * Xóa nhiều roles
     */
    async deleteMany(
        ids: string[],
        userId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<number> {
        const count = await this.repository.softDeleteMany(ids);

        // Invalidate cache
        for (const id of ids) {
            await this.invalidateItemCache(id);
        }
        await this.invalidateListCache();

        // Log action with i18n
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'role',
            action: 'delete-many',
            message: this.i18n.t('role.log.deleted_many', { lang, args: { count } }) as string,
            userId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: { ids, count },
        });

        // Emit socket
        this.websocketGateway.emitRoleDeletedMany(ids, userId);

        return count;
    }

    private async invalidateItemCache(id: string): Promise<void> {
        await this.redisService.del(`${this.getCacheKeyPrefix()}:${id}`);
    }

    private async invalidateListCache(): Promise<void> {
        await this.redisService.delByPattern(`${this.getListCacheKeyPrefix()}:*`);
    }
}
