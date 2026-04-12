import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { WarningCategoryRepository } from './warning-category.repository';
import {
  CreateWarningCategoryDto,
  UpdateWarningCategoryDto,
  QueryWarningCategoryDto,
} from './dto';
import { IWarningCategoryListResult } from './interfaces';
import { WarningCategory } from '@prisma/client';
import { RedisService } from '../redis/redis.service';
import { SystemLogService } from '../system-log/system-log.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class WarningCategoryService {
  constructor(
    private readonly repository: WarningCategoryRepository,
    private readonly redisService: RedisService,
    private readonly systemLogService: SystemLogService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Get cache TTL from environment via ConfigService
   */
  private getCacheTtl(): number {
    return (
      this.configService.get<number>('REDIS_WARNING_CATEGORY_LIST_TTL') || 600
    );
  }

  /**
   * Get cache key prefix from environment via ConfigService
   */
  private getCacheKeyPrefix(): string {
    return (
      this.configService.get<string>('REDIS_WARNING_CATEGORY_KEY_PREFIX') ||
      'warning_category'
    );
  }

  /**
   * Get list cache key prefix
   */
  private getListCacheKeyPrefix(): string {
    return `${this.getCacheKeyPrefix()}:list`;
  }

  /**
   * Tạo danh mục cảnh báo mới
   */
  async create(
    dto: CreateWarningCategoryDto,
    userId: string,
    lang: string,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<WarningCategory> {
    const category = await this.repository.create({
      name: dto.name,
      description: dto.description,
      severity: dto.severity,
      created_by: userId,
    });

    // Invalidate cache
    await this.invalidateListCache();

    // Log action with i18n
    this.systemLogService.logAsync({
      level: 'INFO',
      module: 'warning-category',
      action: 'create',
      message: this.i18n.t('warning-category.log.created', {
        lang,
        args: { name: category.name },
      }),
      userId,
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
      metaData: { categoryId: category.id, name: category.name },
    });

    // Emit realtime event
    // Emit realtime event
    this.websocketGateway.emitWarningCategoryCreated(
      category.id,
      category.name,
      category.severity.toString(),
      userId,
    );

    return category;
  }

  /**
   * Lấy danh sách danh mục với phân trang
   */
  async findMany(
    query: QueryWarningCategoryDto,
    lang: string,
  ): Promise<IWarningCategoryListResult> {
    const cacheKey = `${this.getListCacheKeyPrefix()}:${JSON.stringify(query)}`;

    // Thử lấy từ cache
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

    // Lưu cache
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.getCacheTtl(),
    );

    return result;
  }

  /**
   * Lấy tất cả danh mục active (cho dropdown)
   */
  async findAllActive(lang: string): Promise<WarningCategory[]> {
    const cacheKey = `${this.getCacheKeyPrefix()}:all_active`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const items = await this.repository.findAllActive();
    await this.redisService.set(
      cacheKey,
      JSON.stringify(items),
      this.getCacheTtl(),
    );

    return items;
  }

  /**
   * Lấy chi tiết danh mục theo ID
   */
  async findById(id: string, lang: string): Promise<WarningCategory> {
    const cacheKey = `${this.getCacheKeyPrefix()}:${id}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const category = await this.repository.findById(id);
    if (!category) {
      throw new NotFoundException(
        this.i18n.t('warning-category.error.not_found', { lang }),
      );
    }

    await this.redisService.set(
      cacheKey,
      JSON.stringify(category),
      this.getCacheTtl(),
    );
    return category;
  }

  /**
   * Cập nhật danh mục
   */
  async update(
    id: string,
    dto: UpdateWarningCategoryDto,
    userId: string,
    lang: string,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<WarningCategory> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('warning-category.error.not_found', { lang }),
      );
    }

    const category = await this.repository.update(id, {
      name: dto.name,
      description: dto.description,
      severity: dto.severity,
      is_active: dto.is_active,
      updated_by: userId,
    });

    // Invalidate cache
    await this.invalidateItemCache(id);
    await this.invalidateListCache();

    // Log action with i18n
    this.systemLogService.logAsync({
      level: 'INFO',
      module: 'warning-category',
      action: 'update',
      message: this.i18n.t('warning-category.log.updated', {
        lang,
        args: { name: category.name },
      }),
      userId,
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
      metaData: { categoryId: category.id, updatedFields: Object.keys(dto) },
    });

    // Emit realtime event
    // Emit realtime event
    this.websocketGateway.emitWarningCategoryUpdated(
      category.id,
      category.name,
      userId,
    );

    return category;
  }

  /**
   * Xóa danh mục
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
        this.i18n.t('warning-category.error.not_found', { lang }),
      );
    }

    // Kiểm tra có đang được sử dụng không
    const inUse = await this.repository.isInUse(id);
    if (inUse) {
      throw new BadRequestException(
        this.i18n.t('warning-category.error.in_use', { lang }),
      );
    }

    await this.repository.softDelete(id, userId);

    // Invalidate cache
    await this.invalidateItemCache(id);
    await this.invalidateListCache();

    // Log action with i18n
    this.systemLogService.logAsync({
      level: 'INFO',
      module: 'warning-category',
      action: 'delete',
      message: this.i18n.t('warning-category.log.deleted', {
        lang,
        args: { name: existing.name },
      }),
      userId,
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
      metaData: { categoryId: id, name: existing.name },
    });

    // Emit realtime event
    // Emit realtime event
    this.websocketGateway.emitWarningCategoryDeleted(id, userId);
  }

  /**
   * Xóa nhiều danh mục
   */
  async deleteMany(
    ids: string[],
    userId: string,
    lang: string,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<number> {
    // Kiểm tra có danh mục nào đang được sử dụng không
    for (const id of ids) {
      const inUse = await this.repository.isInUse(id);
      if (inUse) {
        const category = await this.repository.findById(id);
        throw new BadRequestException(
          this.i18n.t('warning-category.error.in_use_item', {
            lang,
            args: { name: category?.name || id },
          }),
        );
      }
    }

    const count = await this.repository.softDeleteMany(ids, userId);

    // Invalidate cache
    for (const id of ids) {
      await this.invalidateItemCache(id);
    }
    await this.invalidateListCache();

    // Log action with i18n
    this.systemLogService.logAsync({
      level: 'INFO',
      module: 'warning-category',
      action: 'delete-many',
      message: this.i18n.t('warning-category.log.deleted_many', {
        lang,
        args: { count },
      }),
      userId,
      ipAddress: requestInfo?.ip,
      userAgent: requestInfo?.userAgent,
      metaData: { ids, count },
    });

    // Emit realtime event
    // Emit realtime event
    this.websocketGateway.emitWarningCategoryDeletedMany(ids, userId);

    return count;
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
