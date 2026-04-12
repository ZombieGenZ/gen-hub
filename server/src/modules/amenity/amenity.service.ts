import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { AmenityRepository } from './amenity.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateAmenityDto, UpdateAmenityDto, QueryAmenityDto } from './dto';
import { AmenityCacheKeysHelper } from './constants';

@Injectable()
export class AmenityService {
  constructor(
    private readonly repository: AmenityRepository,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly systemLogService: SystemLogService,
    private readonly i18n: I18nService,
    private readonly cacheKeys: AmenityCacheKeysHelper,
  ) {}

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
    this.systemLogService.info(
      'Amenity',
      'CREATE',
      `Tạo tiện ích mới: ${amenity.name}`,
      {
        userId,
        metaData: { amenityId: amenity.id, name: amenity.name },
      },
    );

    // Emit socket event
    this.websocketGateway.server.emit('amenity:created', {
      amenityId: amenity.id,
      name: amenity.name,
      createdBy: userId,
      timestamp: new Date().toISOString(),
    });

    return amenity;
  }

  async findAll(
    query: QueryAmenityDto,
    userId: string,
    hasListAllPermission: boolean,
  ) {
    const { limit = 10, offset = 0, keywords, is_active } = query;

    // Check cache - include userId and permission in cache key
    const cacheKey = `${this.cacheKeys.list(query)}:${userId}:${hasListAllPermission}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const where: any = { is_deleted: false };

    // Nếu không có quyền list.all, chỉ lấy items của chính user
    if (!hasListAllPermission) {
      where.created_by = userId;
    }

    // Admin có thể filter theo is_active
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

    const result = { items: data, total, limit, offset };

    // Set cache
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.cacheKeys.listTtl,
    );

    return result;
  }

  async findById(
    id: string,
    userId: string,
    hasReadAllPermission: boolean,
    lang: string,
  ) {
    // Check cache - include userId and permission in cache key
    const cacheKey = `${this.cacheKeys.detail(id)}:${userId}:${hasReadAllPermission}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const amenity = await this.repository.findById(
      id,
      userId,
      hasReadAllPermission,
    );
    if (!amenity) {
      throw new NotFoundException(
        this.i18n.t('amenity.errors.not_found', { lang }),
      );
    }

    // Set cache
    await this.redisService.set(
      cacheKey,
      JSON.stringify(amenity),
      this.cacheKeys.detailTtl,
    );

    return amenity;
  }

  async findAllActive(query: QueryAmenityDto) {
    const { limit = 10, offset = 0 } = query;
    const cacheKey = `${this.cacheKeys.list({})}:active:${limit}:${offset}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [data, total] = await Promise.all([
      this.repository.findAllActive({
        skip: offset,
        take: limit,
      }),
      this.repository.countActive(),
    ]);

    const result = { items: data, total, limit, offset };
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.cacheKeys.listTtl,
    );

    return result;
  }

  async update(
    id: string,
    dto: UpdateAmenityDto,
    userId: string,
    hasUpdateAllPermission: boolean,
    lang: string,
  ) {
    const amenity = await this.repository.findById(
      id,
      userId,
      hasUpdateAllPermission,
    );
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
    this.systemLogService.info(
      'Amenity',
      'UPDATE',
      `Cập nhật tiện ích: ${updated.name}`,
      {
        userId,
        metaData: { amenityId: id, updatedFields: Object.keys(dto) },
      },
    );

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

  async delete(
    id: string,
    userId: string,
    hasDeleteAllPermission: boolean,
    lang: string,
  ) {
    const amenity = await this.repository.findById(
      id,
      userId,
      hasDeleteAllPermission,
    );
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
    this.systemLogService.info(
      'Amenity',
      'DELETE',
      `Xóa tiện ích: ${amenity.name}`,
      {
        userId,
        metaData: { amenityId: id, name: amenity.name },
      },
    );

    // Emit socket event
    this.websocketGateway.server.emit('amenity:deleted', {
      amenityId: id,
      name: amenity.name,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });
  }

  async deleteMany(
    ids: string[],
    userId: string,
    hasDeleteAllPermission: boolean,
    lang: string,
  ) {
    const amenities = await this.repository.findByIds(
      ids,
      userId,
      hasDeleteAllPermission,
    );
    if (amenities.length === 0) {
      throw new NotFoundException(
        this.i18n.t('amenity.errors.not_found', { lang }),
      );
    }

    // Soft delete amenities and mappings
    await this.repository.softDeleteMany(ids, userId);
    await this.repository.softDeleteMappingsMany(ids, userId);

    // Invalidate cache
    await Promise.all(ids.map((id) => this.invalidateCache(id)));
    await this.invalidateListCache();

    // Emit socket event for batch
    this.websocketGateway.server.emit('amenity:deletedMany', {
      amenityIds: ids,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });

    // Log
    amenities.forEach((a) => {
      this.systemLogService.info(
        'Amenity',
        'DELETE',
        `Xóa tiện ích: ${a.name}`,
        {
          userId,
          metaData: { amenityId: a.id, name: a.name },
        },
      );
    });
  }

  private async invalidateCache(id: string) {
    await this.redisService.del(this.cacheKeys.detail(id));
  }

  private async invalidateListCache() {
    await this.redisService.delByPattern(this.cacheKeys.listPattern());
  }
}
