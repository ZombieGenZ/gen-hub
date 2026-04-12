import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ContactListType, ContactListMatchType } from '@prisma/client';
import { ContactListRepository } from './contact-list.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import {
  CreateContactListDto,
  UpdateContactListDto,
  QueryContactListDto,
} from './dto';
import {
  IContactListPaginatedResponse,
  IContactListCheckResult,
} from './interfaces';
import { ContactListCacheKeysHelper } from './helpers/contact-list-cache-keys.helper';

/**
 * Service xử lý logic cho Contact List (Blacklist/Whitelist)
 */
@Injectable()
export class ContactListService {
  constructor(
    private readonly repository: ContactListRepository,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly systemLogService: SystemLogService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    private readonly cacheKeys: ContactListCacheKeysHelper,
  ) {}

  async create(dto: CreateContactListDto, userId: string, lang: string) {
    // Chuẩn hóa value
    const normalizedValue = dto.value.toLowerCase();

    // Kiểm tra trùng
    const existing = await this.repository.findByValue(
      dto.list_type,
      dto.match_type,
      normalizedValue,
    );
    if (existing) {
      throw new ConflictException(
        await this.i18n.t('contactList.errors.duplicate', { lang }),
      );
    }

    const entry = await this.repository.create({
      list_type: dto.list_type,
      match_type: dto.match_type,
      value: normalizedValue,
      country_code: dto.country_code?.toUpperCase(),
      city_code: dto.city_code?.toUpperCase(),
      reason: dto.reason,
      notes: dto.notes,
      created_by: userId,
    });

    await this.invalidateListCache();

    this.systemLogService.info(
      'ContactList',
      'CREATE',
      `Tạo ContactList entry: ${dto.list_type} - ${dto.match_type} - ${normalizedValue}`,
      {
        userId,
        metaData: {
          entryId: entry.id,
          listType: dto.list_type,
          matchType: dto.match_type,
        },
      },
    );

    // Emit socket event
    this.websocketGateway.server.emit('contactList:created', {
      entryId: entry.id,
      listType: dto.list_type,
      matchType: dto.match_type,
      value: normalizedValue,
      createdBy: userId,
      timestamp: new Date().toISOString(),
    });

    return entry;
  }

  async findAll(
    query: QueryContactListDto,
  ): Promise<IContactListPaginatedResponse> {
    const {
      limit = 10,
      offset = 0,
      keywords,
      list_type,
      match_type,
      is_active,
    } = query;

    const cacheKey = this.cacheKeys.list(query);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const where: any = { is_deleted: false };

    if (list_type) where.list_type = list_type;
    if (match_type) where.match_type = match_type;
    if (is_active !== undefined) where.is_active = is_active;

    if (keywords) {
      where.OR = [
        { value: { contains: keywords, mode: 'insensitive' } },
        { reason: { contains: keywords, mode: 'insensitive' } },
        { notes: { contains: keywords, mode: 'insensitive' } },
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

    const hasMore = offset + data.length < total;
    const result = { items: data, total, limit, offset, hasMore };

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.cacheKeys.getTtl('list'),
    );

    return result;
  }

  async findById(id: string, lang: string) {
    const cacheKey = this.cacheKeys.item(id);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const entry = await this.repository.findById(id);
    if (!entry) {
      throw new NotFoundException(
        await this.i18n.t('contactList.errors.not_found', { lang }),
      );
    }

    await this.redisService.set(
      cacheKey,
      JSON.stringify(entry),
      this.cacheKeys.getTtl('item'),
    );

    return entry;
  }

  async update(
    id: string,
    dto: UpdateContactListDto,
    userId: string,
    lang: string,
  ) {
    const entry = await this.repository.findById(id);
    if (!entry) {
      throw new NotFoundException(
        await this.i18n.t('contactList.errors.not_found', { lang }),
      );
    }

    const updated = await this.repository.update(id, {
      ...dto,
      value: dto.value?.toLowerCase(),
      country_code: dto.country_code?.toUpperCase(),
      city_code: dto.city_code?.toUpperCase(),
      updated_by: userId,
    });

    await this.invalidateCache(id);
    await this.invalidateListCache();

    this.systemLogService.info(
      'ContactList',
      'UPDATE',
      `Cập nhật ContactList: ${updated.value}`,
      {
        userId,
        metaData: { entryId: id, updatedFields: Object.keys(dto) },
      },
    );

    this.websocketGateway.server.emit('contactList:updated', {
      entryId: id,
      listType: updated.list_type,
      matchType: updated.match_type,
      value: updated.value,
      updatedFields: Object.keys(dto),
      updatedBy: userId,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async delete(id: string, userId: string, lang: string) {
    const entry = await this.repository.findById(id);
    if (!entry) {
      throw new NotFoundException(
        await this.i18n.t('contactList.errors.not_found', { lang }),
      );
    }

    await this.repository.softDelete(id, userId);

    await this.invalidateCache(id);
    await this.invalidateListCache();

    this.systemLogService.info(
      'ContactList',
      'DELETE',
      `Xóa ContactList: ${entry.value}`,
      {
        userId,
        metaData: { entryId: id },
      },
    );

    this.websocketGateway.server.emit('contactList:deleted', {
      entryId: id,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });
  }

  async deleteMany(ids: string[], userId: string, lang: string) {
    const entries = await this.repository.findByIds(ids);
    if (entries.length === 0) {
      throw new NotFoundException(
        await this.i18n.t('contactList.errors.not_found', { lang }),
      );
    }

    await this.repository.softDeleteMany(ids, userId);

    await Promise.all(ids.map((id) => this.invalidateCache(id)));
    await this.invalidateListCache();

    this.websocketGateway.server.emit('contactList:deletedMany', {
      entryIds: ids,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });

    entries.forEach((entry) => {
      this.systemLogService.info(
        'ContactList',
        'DELETE',
        `Xóa ContactList: ${entry.value}`,
        {
          userId,
          metaData: { entryId: entry.id },
        },
      );
    });
  }

  async addEmailToBlacklist(
    email: string,
    reason: string | undefined,
    userId: string,
  ): Promise<any> {
    return this.createQuickEntry(
      'BLACKLIST',
      'EMAIL',
      email.toLowerCase(),
      reason,
      userId,
    );
  }

  async removeEmailFromBlacklist(
    email: string,
    userId: string,
  ): Promise<boolean> {
    return this.removeQuickEntry(
      'BLACKLIST',
      'EMAIL',
      email.toLowerCase(),
      userId,
    );
  }

  async addEmailToWhitelist(
    email: string,
    reason: string | undefined,
    userId: string,
  ): Promise<any> {
    return this.createQuickEntry(
      'WHITELIST',
      'EMAIL',
      email.toLowerCase(),
      reason,
      userId,
    );
  }

  async removeEmailFromWhitelist(
    email: string,
    userId: string,
  ): Promise<boolean> {
    return this.removeQuickEntry(
      'WHITELIST',
      'EMAIL',
      email.toLowerCase(),
      userId,
    );
  }

  async addDomainToBlacklist(
    domain: string,
    reason: string | undefined,
    userId: string,
  ): Promise<any> {
    const normalizedDomain = domain.startsWith('@')
      ? domain.toLowerCase()
      : `@${domain.toLowerCase()}`;
    return this.createQuickEntry(
      'BLACKLIST',
      'EMAIL_DOMAIN',
      normalizedDomain,
      reason,
      userId,
    );
  }

  async removeDomainFromBlacklist(
    domain: string,
    userId: string,
  ): Promise<boolean> {
    const normalizedDomain = domain.startsWith('@')
      ? domain.toLowerCase()
      : `@${domain.toLowerCase()}`;
    return this.removeQuickEntry(
      'BLACKLIST',
      'EMAIL_DOMAIN',
      normalizedDomain,
      userId,
    );
  }

  async addDomainToWhitelist(
    domain: string,
    reason: string | undefined,
    userId: string,
  ): Promise<any> {
    const normalizedDomain = domain.startsWith('@')
      ? domain.toLowerCase()
      : `@${domain.toLowerCase()}`;
    return this.createQuickEntry(
      'WHITELIST',
      'EMAIL_DOMAIN',
      normalizedDomain,
      reason,
      userId,
    );
  }

  async removeDomainFromWhitelist(
    domain: string,
    userId: string,
  ): Promise<boolean> {
    const normalizedDomain = domain.startsWith('@')
      ? domain.toLowerCase()
      : `@${domain.toLowerCase()}`;
    return this.removeQuickEntry(
      'WHITELIST',
      'EMAIL_DOMAIN',
      normalizedDomain,
      userId,
    );
  }

  async addIPToBlacklist(
    ip: string,
    reason: string | undefined,
    userId: string,
  ): Promise<any> {
    const matchType = ip.includes(':') ? 'IP_V6' : 'IP_V4';
    return this.createQuickEntry(
      'BLACKLIST',
      matchType as ContactListMatchType,
      ip,
      reason,
      userId,
    );
  }

  async removeIPFromBlacklist(ip: string, userId: string): Promise<boolean> {
    const matchType = ip.includes(':') ? 'IP_V6' : 'IP_V4';
    return this.removeQuickEntry(
      'BLACKLIST',
      matchType as ContactListMatchType,
      ip,
      userId,
    );
  }

  async addIPToWhitelist(
    ip: string,
    reason: string | undefined,
    userId: string,
  ): Promise<any> {
    const matchType = ip.includes(':') ? 'IP_V6' : 'IP_V4';
    return this.createQuickEntry(
      'WHITELIST',
      matchType as ContactListMatchType,
      ip,
      reason,
      userId,
    );
  }

  async removeIPFromWhitelist(ip: string, userId: string): Promise<boolean> {
    const matchType = ip.includes(':') ? 'IP_V6' : 'IP_V4';
    return this.removeQuickEntry(
      'WHITELIST',
      matchType as ContactListMatchType,
      ip,
      userId,
    );
  }

  async addCountryToBlacklist(
    countryCode: string,
    reason: string | undefined,
    userId: string,
  ): Promise<any> {
    return this.createQuickEntry(
      'BLACKLIST',
      'REGION_COUNTRY',
      countryCode.toUpperCase(),
      reason,
      userId,
      countryCode.toUpperCase(),
    );
  }

  async removeCountryFromBlacklist(
    countryCode: string,
    userId: string,
  ): Promise<boolean> {
    return this.removeQuickEntry(
      'BLACKLIST',
      'REGION_COUNTRY',
      countryCode.toUpperCase(),
      userId,
    );
  }

  async addCountryToWhitelist(
    countryCode: string,
    reason: string | undefined,
    userId: string,
  ): Promise<any> {
    return this.createQuickEntry(
      'WHITELIST',
      'REGION_COUNTRY',
      countryCode.toUpperCase(),
      reason,
      userId,
      countryCode.toUpperCase(),
    );
  }

  async removeCountryFromWhitelist(
    countryCode: string,
    userId: string,
  ): Promise<boolean> {
    return this.removeQuickEntry(
      'WHITELIST',
      'REGION_COUNTRY',
      countryCode.toUpperCase(),
      userId,
    );
  }

  async addCityToBlacklist(
    countryCode: string,
    cityCode: string,
    reason: string | undefined,
    userId: string,
  ): Promise<any> {
    const value = `${countryCode.toUpperCase()}-${cityCode.toUpperCase()}`;
    return this.createQuickEntry(
      'BLACKLIST',
      'REGION_CITY',
      value,
      reason,
      userId,
      countryCode.toUpperCase(),
      cityCode.toUpperCase(),
    );
  }

  async removeCityFromBlacklist(
    countryCode: string,
    cityCode: string,
    userId: string,
  ): Promise<boolean> {
    const value = `${countryCode.toUpperCase()}-${cityCode.toUpperCase()}`;
    return this.removeQuickEntry('BLACKLIST', 'REGION_CITY', value, userId);
  }

  async addCityToWhitelist(
    countryCode: string,
    cityCode: string,
    reason: string | undefined,
    userId: string,
  ): Promise<any> {
    const value = `${countryCode.toUpperCase()}-${cityCode.toUpperCase()}`;
    return this.createQuickEntry(
      'WHITELIST',
      'REGION_CITY',
      value,
      reason,
      userId,
      countryCode.toUpperCase(),
      cityCode.toUpperCase(),
    );
  }

  async removeCityFromWhitelist(
    countryCode: string,
    cityCode: string,
    userId: string,
  ): Promise<boolean> {
    const value = `${countryCode.toUpperCase()}-${cityCode.toUpperCase()}`;
    return this.removeQuickEntry('WHITELIST', 'REGION_CITY', value, userId);
  }

  async checkEmail(email: string): Promise<IContactListCheckResult> {
    const { blacklist, whitelist } = await this.repository.findByEmail(email);

    // Xác định reason và matchType từ entry đầu tiên được match
    const matchedEntry = blacklist || whitelist;

    return {
      isBlacklisted: !!blacklist,
      isWhitelisted: !!whitelist,
      blacklistEntry: blacklist || undefined,
      whitelistEntry: whitelist || undefined,
      reason: matchedEntry?.reason || undefined,
      matchType: matchedEntry?.match_type || undefined,
    };
  }

  async checkIP(ip: string): Promise<IContactListCheckResult> {
    const { blacklist, whitelist } = await this.repository.findByIP(ip);
    return {
      isBlacklisted: !!blacklist,
      isWhitelisted: !!whitelist,
      blacklistEntry: blacklist || undefined,
      whitelistEntry: whitelist || undefined,
    };
  }

  async checkRegion(
    countryCode: string,
    cityCode?: string,
  ): Promise<IContactListCheckResult> {
    const { blacklist, whitelist } = await this.repository.findByRegion(
      countryCode,
      cityCode,
    );
    return {
      isBlacklisted: !!blacklist,
      isWhitelisted: !!whitelist,
      blacklistEntry: blacklist || undefined,
      whitelistEntry: whitelist || undefined,
    };
  }

  /**
   * Thêm email vào whitelist (dùng cho payment success callback)
   */
  async addToWhitelist(
    email: string,
    reason: string,
    userId: string,
  ): Promise<void> {
    try {
      const existing = await this.repository.findByValue(
        'WHITELIST',
        'EMAIL',
        email.toLowerCase(),
      );
      if (!existing) {
        await this.repository.create({
          list_type: 'WHITELIST',
          match_type: 'EMAIL',
          value: email.toLowerCase(),
          reason,
          created_by: userId,
        });
        await this.invalidateListCache();

        this.systemLogService.info(
          'ContactList',
          'AUTO_WHITELIST',
          `Tự động thêm vào whitelist: ${email}`,
          {
            userId,
            metaData: { email, reason },
          },
        );
      }
    } catch (error) {
      this.systemLogService.error(
        'ContactList',
        'AUTO_WHITELIST',
        `Lỗi thêm whitelist: ${email}`,
        {
          metaData: { email, error: error.message },
        },
      );
    }
  }

  private async createQuickEntry(
    listType: ContactListType,
    matchType: ContactListMatchType,
    value: string,
    reason: string | undefined,
    userId: string,
    countryCode?: string,
    cityCode?: string,
  ) {
    const existing = await this.repository.findByValue(
      listType,
      matchType,
      value,
    );
    if (existing) {
      throw new ConflictException('Đã tồn tại trong danh sách');
    }

    const entry = await this.repository.create({
      list_type: listType,
      match_type: matchType,
      value,
      country_code: countryCode,
      city_code: cityCode,
      reason,
      created_by: userId,
    });

    await this.invalidateListCache();

    this.systemLogService.info(
      'ContactList',
      'QUICK_ADD',
      `Thêm nhanh: ${listType} - ${matchType} - ${value}`,
      {
        userId,
        metaData: { entryId: entry.id },
      },
    );

    this.websocketGateway.server.emit('contactList:created', {
      entryId: entry.id,
      listType,
      matchType,
      value,
      createdBy: userId,
      timestamp: new Date().toISOString(),
    });

    return entry;
  }

  /**
   * Xóa nhanh entry từ whitelist/blacklist dựa trên value
   * Được sử dụng từ Discord commands
   */
  async removeQuickEntry(
    listType: ContactListType,
    matchType: ContactListMatchType,
    value: string,
    userId: string,
  ): Promise<boolean> {
    const success = await this.repository.deleteByValue(
      listType,
      matchType,
      value,
      userId,
    );

    if (success) {
      await this.invalidateListCache();

      this.systemLogService.info(
        'ContactList',
        'QUICK_REMOVE',
        `Xóa nhanh: ${listType} - ${matchType} - ${value}`,
        {
          userId,
        },
      );

      this.websocketGateway.server.emit('contactList:deleted', {
        listType,
        matchType,
        value,
        deletedBy: userId,
        timestamp: new Date().toISOString(),
      });
    }

    return success;
  }

  private async invalidateCache(id: string) {
    await this.redisService.del(this.cacheKeys.item(id));
  }

  private async invalidateListCache() {
    await this.redisService.delByPattern(this.cacheKeys.listPattern());
  }
}
