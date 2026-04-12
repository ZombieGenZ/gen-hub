import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { PermissionRepository } from './permission.repository';
import { QueryPermissionDto, PermissionQueryType, StatusFilter } from './dto';
import {
  IPermissionListResult,
  IPermissionWithAssignmentListResult,
  IPermissionWithAssignment,
} from './interfaces';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PermissionService {
  constructor(
    private readonly repository: PermissionRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Get cache key prefix from environment via ConfigService
   */
  private getCacheKeyPrefix(): string {
    return (
      this.configService.get<string>('REDIS_PERMISSION_KEY_PREFIX') ||
      'permission'
    );
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
    return this.configService.get<number>('REDIS_PERMISSION_CACHE_TTL') || 300;
  }

  /**
   * Get list cache TTL from environment via ConfigService
   */
  private getListCacheTtl(): number {
    return (
      this.configService.get<number>('REDIS_PERMISSION_LIST_CACHE_TTL') || 60
    );
  }

  /**
   * Get assignment cache TTL from environment via ConfigService
   */
  private getAssignmentCacheTtl(): number {
    return (
      this.configService.get<number>('REDIS_PERMISSION_ASSIGNMENT_CACHE_TTL') ||
      120
    );
  }

  /**
   * Lấy danh sách permissions
   * Nếu có type và id: trả về permissions với is_assigned
   * Nếu không: trả về danh sách permissions thuần
   */
  async findMany(
    query: QueryPermissionDto,
    lang: string,
  ): Promise<IPermissionListResult | IPermissionWithAssignmentListResult> {
    const limit = query.limit ? Number(query.limit) : 10;
    const offset = query.offset ? Number(query.offset) : 0;
    const status = query.status || StatusFilter.ACTIVE;

    // Nếu có type và id, trả về permissions với trạng thái gán
    if (query.type && query.id) {
      return this.findManyWithAssignment(
        {
          limit,
          offset,
          keywords: query.keywords,
          status,
          module: query.module,
        },
        query.type,
        query.id,
      );
    }

    // Trả về danh sách permissions thuần (có cache)
    const cacheKey = `${this.getListCacheKeyPrefix()}:${JSON.stringify({ limit, offset, keywords: query.keywords, status, module: query.module })}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.repository.findMany({
      limit,
      offset,
      keywords: query.keywords,
      status,
      module: query.module,
    });

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.getListCacheTtl(),
    );

    return result;
  }

  /**
   * Lấy danh sách permissions với trạng thái gán cho role/user
   */
  private async findManyWithAssignment(
    params: {
      limit: number;
      offset: number;
      keywords?: string;
      status?: StatusFilter;
      module?: string;
    },
    type: PermissionQueryType,
    id: string,
  ): Promise<IPermissionWithAssignmentListResult> {
    // Check cache first
    const cacheKey = `${this.getCacheKeyPrefix()}:with-assignment:${type}:${id}:${JSON.stringify(params)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Lấy permissions theo filter
    const result = await this.repository.findMany(params);

    // Lấy danh sách permission IDs đã được gán
    let assignedPermissionIds: string[] = [];

    if (type === PermissionQueryType.ROLE) {
      assignedPermissionIds =
        await this.repository.getPermissionIdsByRoleId(id);
    } else if (type === PermissionQueryType.USER) {
      // Lấy cả permissions trực tiếp và qua roles
      assignedPermissionIds =
        await this.repository.getAllPermissionIdsByUserId(id);
    }

    // Map permissions với is_assigned
    const dataWithAssignment: IPermissionWithAssignment[] = result.data.map(
      (permission) => ({
        ...permission,
        is_assigned: assignedPermissionIds.includes(permission.id),
      }),
    );

    const response = {
      data: dataWithAssignment,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };

    // Cache the result
    await this.redisService.set(
      cacheKey,
      JSON.stringify(response),
      this.getAssignmentCacheTtl(),
    );

    return response;
  }

  /**
   * Invalidate cache list
   */
  async invalidateListCache(): Promise<void> {
    await this.redisService.delByPattern(`${this.getListCacheKeyPrefix()}:*`);
  }

  /**
   * Invalidate cache cho permission assignment (khi role/user được update permissions)
   */
  async invalidateAssignmentCache(
    type: 'role' | 'user',
    id: string,
  ): Promise<void> {
    await this.redisService.delByPattern(
      `${this.getCacheKeyPrefix()}:with-assignment:${type}:${id}:*`,
    );
  }

  /**
   * Lấy danh sách permission IDs theo role IDs (với cache)
   */
  async getPermissionIdsByRoleIds(roleIds: string[]): Promise<string[]> {
    if (!roleIds.length) return [];

    // Sort role IDs for consistent cache key
    const sortedRoleIds = [...roleIds].sort();
    const cacheKey = `${this.getCacheKeyPrefix()}:by-roles:${sortedRoleIds.join(',')}`;

    // Check cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.repository.getPermissionIdsByRoleIds(roleIds);

    // Cache for 5 minutes
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.getCacheTtl(),
    );
    return result;
  }

  /**
   * Lấy danh sách modules (prefix) duy nhất từ permission keys
   */
  async getModules(): Promise<string[]> {
    const cacheKey = `${this.getCacheKeyPrefix()}:modules`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.repository.getDistinctModules();

    // Cache for 5 minutes
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.getCacheTtl(),
    );
    return result;
  }
}
