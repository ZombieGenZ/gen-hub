import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { RedisService } from '../redis/redis.service';
import { SystemLogService } from '../system-log/system-log.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PhoneCodeCacheKeysHelper } from './constants';
import {
  CreatePhoneCodeDto,
  QueryPhoneCodeDto,
  UpdatePhoneCodeDto,
} from './dto';
import { PhoneCodeRepository } from './phone-code.repository';

@Injectable()
export class PhoneCodeService {
  constructor(
    private readonly repository: PhoneCodeRepository,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly systemLogService: SystemLogService,
    private readonly i18n: I18nService,
    private readonly cacheKeys: PhoneCodeCacheKeysHelper,
  ) {}

  async create(dto: CreatePhoneCodeDto, userId: string, lang: string) {
    const [nameExists, codeExists] = await Promise.all([
      this.repository.findByName(dto.name),
      this.repository.findByCode(dto.code),
    ]);

    if (nameExists || codeExists) {
      throw new ConflictException(
        this.i18n.t('phone-code.errors.name_exists', { lang }),
      );
    }

    const created = await this.repository.create({
      ...dto,
      created_by: userId,
    });

    await this.invalidateListCache();
    this.websocketGateway.server.emit('phone-code:created', {
      phoneCodeId: created.id,
      createdBy: userId,
      timestamp: new Date().toISOString(),
    });
    this.systemLogService.info(
      'PhoneCode',
      'CREATE',
      `Created phone code: ${created.name}`,
      {
        userId,
        metaData: { phoneCodeId: created.id, name: created.name },
      },
    );

    return created;
  }

  async findAll(
    query: QueryPhoneCodeDto,
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
        { code: { contains: keywords, mode: 'insensitive' } },
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

  async findAllActive(query: QueryPhoneCodeDto) {
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
        this.i18n.t('phone-code.errors.not_found', { lang }),
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
    dto: UpdatePhoneCodeDto,
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
        this.i18n.t('phone-code.errors.not_found', { lang }),
      );
    }

    if (dto.name && dto.name !== existing.name) {
      const nameExists = await this.repository.findByName(dto.name, id);
      if (nameExists) {
        throw new ConflictException(
          this.i18n.t('phone-code.errors.name_exists', { lang }),
        );
      }
    }

    if (dto.code && dto.code !== existing.code) {
      const codeExists = await this.repository.findByCode(dto.code, id);
      if (codeExists) {
        throw new ConflictException(
          this.i18n.t('phone-code.errors.name_exists', { lang }),
        );
      }
    }

    const updated = await this.repository.update(id, {
      ...dto,
      updated_by: userId,
    });

    await this.invalidateCache(id);
    await this.invalidateListCache();
    this.websocketGateway.server.emit('phone-code:updated', {
      phoneCodeId: id,
      updatedBy: userId,
      timestamp: new Date().toISOString(),
    });
    this.systemLogService.info(
      'PhoneCode',
      'UPDATE',
      `Updated phone code: ${updated.name}`,
      {
        userId,
        metaData: { phoneCodeId: id, updatedFields: Object.keys(dto) },
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
        this.i18n.t('phone-code.errors.not_found', { lang }),
      );
    }

    await this.repository.softDelete(id, userId);
    await this.invalidateCache(id);
    await this.invalidateListCache();

    this.websocketGateway.server.emit('phone-code:deleted', {
      phoneCodeId: id,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });
    this.systemLogService.info(
      'PhoneCode',
      'DELETE',
      `Deleted phone code: ${existing.name}`,
      {
        userId,
        metaData: { phoneCodeId: id, name: existing.name },
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
        this.i18n.t('phone-code.errors.not_found', { lang }),
      );
    }

    await this.repository.softDeleteMany(ids, userId);
    await Promise.all(ids.map((id) => this.invalidateCache(id)));
    await this.invalidateListCache();

    this.websocketGateway.server.emit('phone-code:deletedMany', {
      phoneCodeIds: ids,
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
