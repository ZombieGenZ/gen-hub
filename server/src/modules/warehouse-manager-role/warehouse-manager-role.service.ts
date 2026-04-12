import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { WarehouseManagerRoleRepository } from './warehouse-manager-role.repository';
import {
  CreateWarehouseManagerRoleDto,
  UpdateWarehouseManagerRoleDto,
} from './dto';
import {
  WarehouseManagerRole,
  WarehouseManagerPermission,
} from '@prisma/client';
import { IPaginatedResponse } from '../../common/interfaces/pagination.interface';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class WarehouseManagerRoleService {
  constructor(
    private readonly warehouseManagerRoleRepository: WarehouseManagerRoleRepository,
    private readonly i18n: I18nService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async createRole(
    dto: CreateWarehouseManagerRoleDto,
  ): Promise<WarehouseManagerRole> {
    const { permission_ids, ...roleData } = dto;
    const role = await this.warehouseManagerRoleRepository.createRole(roleData);

    if (permission_ids && permission_ids.length > 0) {
      await this.warehouseManagerRoleRepository.assignPermissionsToRole(
        role.id,
        permission_ids,
      );
    }

    const newRole = await this.warehouseManagerRoleRepository.findRoleById(
      role.id,
    );
    if (!newRole) {
      throw new Error('Failed to retrieve created role');
    }
    // Invalidate list cache
    const listPrefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_MANAGER_ROLE_LIST_KEY_PREFIX',
      'warehouse:manager:role:list',
    );
    await this.redisService.delByPattern(`${listPrefix}:*`);

    return newRole;
  }

  async findAllRoles(
    query: any,
  ): Promise<IPaginatedResponse<WarehouseManagerRole>> {
    const cacheKey =
      this.redisService.getWarehouseManagerRoleListCacheKey(query);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result =
      await this.warehouseManagerRoleRepository.findAllRoles(query);

    // Set cache
    const ttl = this.configService.get<number>(
      'REDIS_WAREHOUSE_MANAGER_ROLE_LIST_CACHE_TTL',
      60,
    );
    await this.redisService.set(cacheKey, JSON.stringify(result), ttl);

    return result;
  }

  async findRoleById(id: string, lang: string): Promise<WarehouseManagerRole> {
    // Cache check
    const cached =
      await this.redisService.getWarehouseManagerRoleCache<WarehouseManagerRole>(
        id,
      );
    if (cached) return cached;

    const role = await this.warehouseManagerRoleRepository.findRoleById(id);
    if (!role) {
      throw new NotFoundException(
        await this.i18n.translate('warehouse_manager.errors.role_not_found', {
          lang,
        }),
      );
    }

    // Set cache
    await this.redisService.setWarehouseManagerRoleCache(id, role);

    return role;
  }

  async updateRole(
    id: string,
    dto: UpdateWarehouseManagerRoleDto,
    lang: string,
  ): Promise<WarehouseManagerRole> {
    const role = await this.warehouseManagerRoleRepository.findRoleById(id);
    if (!role) {
      throw new NotFoundException(
        await this.i18n.translate('warehouse_manager.errors.role_not_found', {
          lang,
        }),
      );
    }

    const { permission_ids, ...roleData } = dto;
    await this.warehouseManagerRoleRepository.updateRole(id, roleData);

    if (permission_ids) {
      await this.warehouseManagerRoleRepository.assignPermissionsToRole(
        id,
        permission_ids,
      );
    }

    const updatedRole =
      await this.warehouseManagerRoleRepository.findRoleById(id);
    if (!updatedRole) {
      throw new NotFoundException(
        await this.i18n.translate('warehouse_manager.errors.role_not_found', {
          lang,
        }),
      );
    }
    // Invalidate cache
    await this.redisService.invalidateWarehouseManagerRoleCache(id);

    return updatedRole;
  }

  async deleteRole(id: string, userId: string, lang: string): Promise<void> {
    const role = await this.warehouseManagerRoleRepository.findRoleById(id);
    if (!role) {
      throw new NotFoundException(
        await this.i18n.translate('warehouse_manager.errors.role_not_found', {
          lang,
        }),
      );
    }

    await this.warehouseManagerRoleRepository.softDeleteRole(id, userId);
    // Invalidate cache
    await this.redisService.invalidateWarehouseManagerRoleCache(id);
  }

  async findAllPermissions(): Promise<WarehouseManagerPermission[]> {
    const cacheKey = this.redisService.getWarehouseManagerPermissionCacheKey();
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const permissions =
      await this.warehouseManagerRoleRepository.findAllPermissions();

    // Set cache (Long TTL for permissions as they change rarely)
    const ttl = this.configService.get<number>(
      'REDIS_WAREHOUSE_MANAGER_PERMISSION_CACHE_TTL',
      3600,
    );
    await this.redisService.set(cacheKey, JSON.stringify(permissions), ttl);

    return permissions;
  }
}
