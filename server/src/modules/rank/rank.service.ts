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
import { RankCacheKeysHelper } from './constants';
import { CreateRankDto, QueryRankDto, UpdateRankDto } from './dto';
import { RankRepository } from './rank.repository';

@Injectable()
export class RankService {
  constructor(
    private readonly repository: RankRepository,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly systemLogService: SystemLogService,
    private readonly i18n: I18nService,
    private readonly cacheKeys: RankCacheKeysHelper,
    private readonly appConfigService: AppConfigService,
  ) {}

  private async applyDefault(recordId: string) {
    const currentDefault = await this.repository.findCurrentDefault(recordId);
    if (currentDefault) {
      await this.repository.setDefault(currentDefault.id, false);
    }

    await this.repository.setDefault(recordId, true);
    await this.appConfigService.update({ defaultRankId: recordId });
  }

  async create(dto: CreateRankDto, userId: string, lang: string) {
    const existing = await this.repository.findByName(dto.name);
    if (existing) {
      throw new ConflictException(
        this.i18n.t('rank.errors.name_exists', { lang }),
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
    this.websocketGateway.server.emit('rank:created', {
      rankId: created.id,
      createdBy: userId,
      timestamp: new Date().toISOString(),
    });
    this.systemLogService.info(
      'Rank',
      'CREATE',
      `Created rank: ${created.name}`,
      {
        userId,
        metaData: { rankId: created.id, name: created.name },
      },
    );

    return created;
  }

  async findAll(
    query: QueryRankDto,
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

  async findAllActive(query: QueryRankDto) {
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
        this.i18n.t('rank.errors.not_found', { lang }),
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
    dto: UpdateRankDto,
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
        this.i18n.t('rank.errors.not_found', { lang }),
      );
    }

    if (dto.name && dto.name !== existing.name) {
      const nameExists = await this.repository.findByName(dto.name, id);
      if (nameExists) {
        throw new ConflictException(
          this.i18n.t('rank.errors.name_exists', { lang }),
        );
      }
    }

    if (dto.is_default === false && existing.is_default) {
      throw new ConflictException(
        this.i18n.t('rank.errors.cannot_remove_default', { lang }),
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
    this.websocketGateway.server.emit('rank:updated', {
      rankId: id,
      updatedBy: userId,
      timestamp: new Date().toISOString(),
    });
    this.systemLogService.info(
      'Rank',
      'UPDATE',
      `Updated rank: ${updated.name}`,
      {
        userId,
        metaData: { rankId: id, updatedFields: Object.keys(dto) },
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
        this.i18n.t('rank.errors.not_found', { lang }),
      );
    }

    if (existing.is_default) {
      throw new ConflictException(
        this.i18n.t('rank.errors.cannot_delete_default', { lang }),
      );
    }

    await this.repository.softDelete(id, userId);
    await this.invalidateCache(id);
    await this.invalidateListCache();

    this.websocketGateway.server.emit('rank:deleted', {
      rankId: id,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });
    this.systemLogService.info(
      'Rank',
      'DELETE',
      `Deleted rank: ${existing.name}`,
      {
        userId,
        metaData: { rankId: id, name: existing.name },
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
        this.i18n.t('rank.errors.not_found', { lang }),
      );
    }

    if (items.some((item) => item.is_default)) {
      throw new ConflictException(
        this.i18n.t('rank.errors.cannot_delete_default', { lang }),
      );
    }

    await this.repository.softDeleteMany(ids, userId);
    await Promise.all(ids.map((id) => this.invalidateCache(id)));
    await this.invalidateListCache();

    this.websocketGateway.server.emit('rank:deletedMany', {
      rankIds: ids,
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
