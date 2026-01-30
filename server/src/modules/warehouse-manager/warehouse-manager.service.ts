import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WarehouseManagerRepository } from './warehouse-manager.repository';
import { AssignWarehouseManagerDto, UpdateWarehouseManagerDto } from './dto';
import { WarehouseTemplateManager } from '@prisma/client';
import { IPaginatedResponse } from '../../common/interfaces/pagination.interface';
import { I18nService } from 'nestjs-i18n';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { Prisma } from '@prisma/client';

@Injectable()
export class WarehouseManagerService {
    constructor(
        private readonly warehouseManagerRepository: WarehouseManagerRepository,
        private readonly i18n: I18nService,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly configService: ConfigService,
    ) { }

    async assignManager(dto: AssignWarehouseManagerDto, createdBy: string, lang: string): Promise<WarehouseTemplateManager> {
        // Check if already exists
        const existing = await this.warehouseManagerRepository.findManagerByTemplateAndUser(
            dto.warehouse_template_id,
            dto.user_id,
        );

        if (existing) {
            // Activate if deleted? OR throw conflict
            if (existing.is_deleted) {
                // Reactivate logic could be here, but for now throw conflict or simple update
                // Let's throw conflict to be safe
                throw new ConflictException(await this.i18n.translate('warehouse_manager.errors.manager_exists', { lang }));
            }
            throw new ConflictException(await this.i18n.translate('warehouse_manager.errors.manager_exists', { lang }));
        }

        const { role_ids, ...managerData } = dto;
        const manager = await this.warehouseManagerRepository.createManager({
            ...managerData,
            created_by: createdBy,
        } as Prisma.WarehouseTemplateManagerUncheckedCreateInput);

        if (role_ids && role_ids.length > 0) {
            await this.warehouseManagerRepository.assignRolesToManager(manager.id, role_ids);
        }

        const newManager = await this.findManagerById(manager.id, lang);

        // Emit socket event
        this.websocketGateway.emitWarehouseManagerAssigned(
            newManager.warehouse_template_id,
            newManager.id,
            newManager.user_id,
            createdBy
        );

        // Invalidate list cache
        await this.redisService.delByPattern(`${this.redisService.getWarehouseManagerListCacheKey({})}*`);

        return newManager;
    }

    async findAllManagers(query: any, ownerId?: string): Promise<IPaginatedResponse<WarehouseTemplateManager>> {
        const cacheKey = this.redisService.getWarehouseManagerListCacheKey(query) + (ownerId ? `:user:${ownerId}` : ':all');
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.warehouseManagerRepository.findAllManagers({ ...query, createdBy: ownerId });

        // Set cache
        const ttl = this.configService.get<number>('REDIS_WAREHOUSE_MANAGER_LIST_CACHE_TTL', 60);
        await this.redisService.set(cacheKey, JSON.stringify(result), ttl);

        return result;
    }

    async findManagerById(id: string, lang: string, ownerId?: string): Promise<WarehouseTemplateManager> {
        // Cache check
        const cached = await this.redisService.getWarehouseManagerCache<WarehouseTemplateManager>(id);
        if (cached) {
            // Check ownership if ownerId is provided
            if (ownerId && cached.created_by !== ownerId) {
                throw new NotFoundException(await this.i18n.translate('warehouse_manager.errors.manager_not_found', { lang }));
            }
            return cached;
        }

        const manager = await this.warehouseManagerRepository.findManagerById(id);
        if (!manager) {
            throw new NotFoundException(await this.i18n.translate('warehouse_manager.errors.manager_not_found', { lang }));
        }

        // Check ownership if ownerId is provided
        if (ownerId && manager.created_by !== ownerId) {
            throw new NotFoundException(await this.i18n.translate('warehouse_manager.errors.manager_not_found', { lang }));
        }

        // Set cache
        await this.redisService.setWarehouseManagerCache(id, manager);

        return manager;
    }

    async updateManager(id: string, dto: UpdateWarehouseManagerDto, userId: string, lang: string, ownerId?: string): Promise<WarehouseTemplateManager> {
        const manager = await this.warehouseManagerRepository.findManagerById(id);
        if (!manager) {
            throw new NotFoundException(await this.i18n.translate('warehouse_manager.errors.manager_not_found', { lang }));
        }

        // Check ownership if ownerId is provided
        if (ownerId && manager.created_by !== ownerId) {
            throw new NotFoundException(await this.i18n.translate('warehouse_manager.errors.manager_not_found', { lang }));
        }

        const { role_ids, ...updateData } = dto;
        await this.warehouseManagerRepository.updateManager(id, updateData);

        if (role_ids) {
            await this.warehouseManagerRepository.assignRolesToManager(id, role_ids);
        }

        // Invalidate cache
        await this.redisService.invalidateWarehouseManagerCache(id);

        const updatedManager = await this.findManagerById(id, lang);

        // Emit socket event
        this.websocketGateway.emitWarehouseManagerUpdated(
            updatedManager.warehouse_template_id,
            updatedManager.id,
            userId // using userId as updatedBy
        );

        // Invalidate list cache as well
        await this.redisService.delByPattern(`${this.redisService.getWarehouseManagerListCacheKey({})}*`);

        return updatedManager;
    }

    async removeManager(id: string, userId: string, lang: string, ownerId?: string): Promise<void> {
        const manager = await this.warehouseManagerRepository.findManagerById(id);
        if (!manager) {
            throw new NotFoundException(await this.i18n.translate('warehouse_manager.errors.manager_not_found', { lang }));
        }

        // Check ownership if ownerId is provided
        if (ownerId && manager.created_by !== ownerId) {
            throw new NotFoundException(await this.i18n.translate('warehouse_manager.errors.manager_not_found', { lang }));
        }
        await this.warehouseManagerRepository.softDeleteManager(id, userId);

        // Invalidate cache
        await this.redisService.invalidateWarehouseManagerCache(id);
        // Invalidate list cache
        await this.redisService.delByPattern(`${this.redisService.getWarehouseManagerListCacheKey({})}*`);

        // Emit socket event
        this.websocketGateway.emitWarehouseManagerRemoved(
            manager.warehouse_template_id,
            manager.id,
            userId
        );
    }
}
