import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { AppConfigService } from '../../common/config/app-config.service';
import { RedisService } from '../redis/redis.service';
import { SystemLogService } from '../system-log/system-log.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { AvatarImageCacheKeysHelper } from './constants';
import {
  CreateAvatarImageDto,
  QueryAvatarImageDto,
  UpdateAvatarImageDto,
} from './dto';
import { AvatarImageRepository } from './avatar-image.repository';

@Injectable()
export class AvatarImageService {
  constructor(
    private readonly repository: AvatarImageRepository,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly systemLogService: SystemLogService,
    private readonly i18n: I18nService,
    private readonly cacheKeys: AvatarImageCacheKeysHelper,
    private readonly appConfigService: AppConfigService,
  ) {}

  private async applyDefault(recordId: string) {
    const currentDefault = await this.repository.findCurrentDefault(recordId);
    if (currentDefault) {
      await this.repository.setDefault(currentDefault.id, false);
    }

    await this.repository.setDefault(recordId, true);
    await this.appConfigService.update({ defaultAvatarId: recordId });
  }

  async create(dto: CreateAvatarImageDto, userId: string, lang: string) {
    const existing = await this.repository.findByName(dto.name);
    if (existing) {
      throw new ConflictException(
        this.i18n.t('avatar-image.errors.name_exists', { lang }),
      );
    }

    const created = await this.repository.create({
      ...dto,
      created_by: userId,
    });

    if (dto.is_default) {
      await this.applyDefault(created.id);
    }

    await this.invalidateListCache();
    this.websocketGateway.server.emit('avatar-image:created', {
      avatarImageId: created.id,
      createdBy: userId,
      timestamp: new Date().toISOString(),
    });
    this.systemLogService.info(
      'AvatarImage',
      'CREATE',
      `Created avatar image: ${created.name}`,
      {
        userId,
        metaData: { avatarImageId: created.id, name: created.name },
      },
    );

    return created;
  }

  async findAll(
    query: QueryAvatarImageDto,
    userId: string,
    hasListAllPermission: boolean,
  ) {
    const { limit = 10, offset = 0, keywords, is_active } = query;
    const cacheKey = `${this.cacheKeys.list(query)}:${userId}:${hasListAllPermission}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const where: any = { is_deleted: false };
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

    const [items, total] = await Promise.all([
      this.repository.findAll({
        skip: offset,
        take: limit,
        where,
        orderBy: { created_at: 'desc' },
      }),
      this.repository.count(where),
    ]);

    const result = { items, total, limit, offset };
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.cacheKeys.listTtl,
    );
    return result;
  }

  async findAllActive(query: QueryAvatarImageDto) {
    const { limit = 10, offset = 0 } = query;
    const cacheKey = `${this.cacheKeys.list({})}:active:${limit}:${offset}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const where = { is_deleted: false, is_active: true };
    const [items, total] = await Promise.all([
      this.repository.findAll({
        skip: offset,
        take: limit,
        where,
        orderBy: { name: 'asc' },
      }),
      this.repository.count(where),
    ]);

    const result = { items, total, limit, offset };
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
    const cacheKey = `${this.cacheKeys.detail(id)}:${userId}:${hasReadAllPermission}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const item = await this.repository.findById(
      id,
      userId,
      hasReadAllPermission,
    );
    if (!item) {
      throw new NotFoundException(
        this.i18n.t('avatar-image.errors.not_found', { lang }),
      );
    }

    await this.redisService.set(
      cacheKey,
      JSON.stringify(item),
      this.cacheKeys.detailTtl,
    );
    return item;
  }

  async update(
    id: string,
    dto: UpdateAvatarImageDto,
    userId: string,
    hasUpdateAllPermission: boolean,
    lang: string,
  ) {
    const existing = await this.repository.findById(
      id,
      userId,
      hasUpdateAllPermission,
    );
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('avatar-image.errors.not_found', { lang }),
      );
    }

    if (dto.name && dto.name !== existing.name) {
      const nameExists = await this.repository.findByName(dto.name, id);
      if (nameExists) {
        throw new ConflictException(
          this.i18n.t('avatar-image.errors.name_exists', { lang }),
        );
      }
    }

    if (dto.is_default === false && existing.is_default) {
      throw new ConflictException(
        this.i18n.t('avatar-image.errors.cannot_remove_default', { lang }),
      );
    }

    const updated = await this.repository.update(id, {
      ...dto,
      updated_by: userId,
    });

    if (dto.is_default === true) {
      await this.applyDefault(id);
    }

    await this.invalidateCache(id);
    await this.invalidateListCache();
    this.websocketGateway.server.emit('avatar-image:updated', {
      avatarImageId: id,
      updatedBy: userId,
      timestamp: new Date().toISOString(),
    });
    this.systemLogService.info(
      'AvatarImage',
      'UPDATE',
      `Updated avatar image: ${updated.name}`,
      {
        userId,
        metaData: { avatarImageId: id, updatedFields: Object.keys(dto) },
      },
    );

    return updated;
  }

  async delete(
    id: string,
    userId: string,
    hasDeleteAllPermission: boolean,
    lang: string,
  ) {
    const existing = await this.repository.findById(
      id,
      userId,
      hasDeleteAllPermission,
    );
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('avatar-image.errors.not_found', { lang }),
      );
    }

    if (existing.is_default) {
      throw new ConflictException(
        this.i18n.t('avatar-image.errors.cannot_delete_default', { lang }),
      );
    }

    await this.repository.softDelete(id, userId);
    await this.invalidateCache(id);
    await this.invalidateListCache();

    this.websocketGateway.server.emit('avatar-image:deleted', {
      avatarImageId: id,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });
    this.systemLogService.info(
      'AvatarImage',
      'DELETE',
      `Deleted avatar image: ${existing.name}`,
      {
        userId,
        metaData: { avatarImageId: id, name: existing.name },
      },
    );
  }

  async deleteMany(
    ids: string[],
    userId: string,
    hasDeleteAllPermission: boolean,
    lang: string,
  ) {
    const items = await this.repository.findByIds(
      ids,
      userId,
      hasDeleteAllPermission,
    );
    if (items.length === 0) {
      throw new NotFoundException(
        this.i18n.t('avatar-image.errors.not_found', { lang }),
      );
    }

    if (items.some((item) => item.is_default)) {
      throw new ConflictException(
        this.i18n.t('avatar-image.errors.cannot_delete_default', { lang }),
      );
    }

    await this.repository.softDeleteMany(ids, userId);
    await Promise.all(ids.map((id) => this.invalidateCache(id)));
    await this.invalidateListCache();

    this.websocketGateway.server.emit('avatar-image:deletedMany', {
      avatarImageIds: ids,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });
  }

  private async invalidateCache(id: string) {
    await this.redisService.del(this.cacheKeys.detail(id));
  }

  private async invalidateListCache() {
    await this.redisService.delByPattern(this.cacheKeys.listPattern());
  }
}
