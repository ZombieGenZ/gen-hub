import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { OrganizationApiKeyRepository } from '../organization-api-key/organization-api-key.repository';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { QueryAdminApiKeyDto, UpdateAdminApiKeyDto } from './dto/api-key.dto';
import { IPaginatedResponse, IApiKey } from '../organization/interfaces';
import { RedisService } from '../redis/redis.service';
import { AdminApiKeyCacheKeys } from './constants/cache-keys.helper';
import { OrganizationApiKeyCacheKeys } from '../organization-api-key/constants/cache-keys.helper';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly repository: OrganizationApiKeyRepository,
    private readonly auditLogService: OrganizationAuditLogService,
    private readonly i18n: I18nService,
    private readonly redisService: RedisService,
    private readonly adminCacheKeys: AdminApiKeyCacheKeys,
    private readonly orgCacheKeys: OrganizationApiKeyCacheKeys,
  ) {}

  async getAdminApiKeys(
    query: QueryAdminApiKeyDto,
    lang: string,
  ): Promise<IPaginatedResponse<IApiKey>> {
    const cacheKey = this.adminCacheKeys.list(
      query as unknown as Record<string, unknown>,
    );
    const cached =
      await this.redisService.getJson<IPaginatedResponse<IApiKey>>(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findAllApiKeys(query);
    await this.redisService.setJson(
      cacheKey,
      result,
      this.adminCacheKeys.ttlList,
    );

    return result;
  }

  async getAdminApiKeyById(keyId: string, lang: string): Promise<IApiKey> {
    const cacheKey = this.adminCacheKeys.item(keyId);
    const cached = await this.redisService.getJson<IApiKey>(cacheKey);
    if (cached) return cached;

    const apiKey = await this.repository.findApiKeyById(keyId);
    if (!apiKey) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    await this.redisService.setJson(
      cacheKey,
      apiKey,
      this.adminCacheKeys.ttlItem,
    );
    return apiKey;
  }

  async updateAdminApiKey(
    keyId: string,
    dto: UpdateAdminApiKeyDto,
    userId: string,
    lang: string,
  ): Promise<IApiKey> {
    const apiKey = await this.repository.findApiKeyById(keyId);
    if (!apiKey) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    const oldData = {
      name: apiKey.name,
      description: apiKey.description,
      is_active: apiKey.is_active,
      rate_limit_max: apiKey.rate_limit_max,
      rate_limit_ttl: apiKey.rate_limit_ttl,
    };

    if (dto.is_active !== undefined && dto.is_active !== apiKey.is_active) {
      await this.repository.updateApiKeyRolesStatusByApiKeyId(
        keyId,
        dto.is_active,
      );
      await this.repository.updateApiKeyPermissionsStatusByApiKeyId(
        keyId,
        dto.is_active,
      );
    }

    await this.repository.updateApiKey(keyId, {
      name: dto.name,
      description: dto.description,
      is_active: dto.is_active,
      rate_limit_max: dto.rate_limit_max,
      rate_limit_ttl: dto.rate_limit_ttl,
      updated_by: userId,
      updated_at: new Date(),
    });

    const updated = await this.repository.findApiKeyById(keyId);

    if (updated) {
      this.auditLogService.logUpdate(
        updated.organization_id,
        'ApiKey',
        keyId,
        oldData,
        {
          name: updated.name,
          description: updated.description,
          is_active: updated.is_active,
          rate_limit_max: updated.rate_limit_max,
          rate_limit_ttl: updated.rate_limit_ttl,
        },
        { userId, description: 'Updated by Admin' },
      );
    }

    // Invalidate Admin Cache
    await this.redisService.del(this.adminCacheKeys.item(keyId));
    await this.redisService.delByPattern(this.adminCacheKeys.allList());

    // Invalidate Org Cache
    if (updated) {
      await this.redisService.del(
        this.orgCacheKeys.item(updated.organization_id, keyId),
      );
      await this.redisService.del(
        this.orgCacheKeys.list(updated.organization_id),
      );
    }

    return updated!;
  }

  async deleteAdminApiKey(
    keyId: string,
    userId: string,
    lang: string,
  ): Promise<void> {
    const apiKey = await this.repository.findApiKeyById(keyId);
    if (!apiKey) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    await this.repository.softDeleteApiKey(keyId, userId);

    this.auditLogService.logDelete(
      apiKey.organization_id,
      'ApiKey',
      keyId,
      { name: apiKey.name },
      { userId, description: 'Deleted by Admin' },
    );

    // Invalidate Admin Cache
    await this.redisService.del(this.adminCacheKeys.item(keyId));
    await this.redisService.delByPattern(this.adminCacheKeys.allList());

    // Invalidate Org Cache
    await this.redisService.del(
      this.orgCacheKeys.item(apiKey.organization_id, keyId),
    );
    await this.redisService.del(this.orgCacheKeys.list(apiKey.organization_id));
  }

  async deleteManyAdminApiKeys(
    ids: string[],
    userId: string,
    lang: string,
  ): Promise<void> {
    const apiKeys = await this.repository.findApiKeysByIds(ids);
    if (apiKeys.length === 0) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    // Collect Org IDs for invalidation
    const orgIds = [...new Set(apiKeys.map((k) => k.organization_id))];

    await this.repository.softDeleteManyApiKeys(ids, userId);

    apiKeys.forEach((apiKey) => {
      this.auditLogService.logDelete(
        apiKey.organization_id,
        'ApiKey',
        apiKey.id,
        { name: apiKey.name },
        { userId, description: `Deleted by Admin: ${apiKey.name}` },
      );
    });

    // Invalidate Admin Cache
    await Promise.all(
      ids.map((id) => this.redisService.del(this.adminCacheKeys.item(id))),
    );
    await this.redisService.delByPattern(this.adminCacheKeys.allList());

    // Invalidate Org Cache
    await Promise.all([
      ...ids.map((id) => {
        const key = apiKeys.find((k) => k.id === id);
        return key
          ? this.redisService.del(
              this.orgCacheKeys.item(key.organization_id, id),
            )
          : Promise.resolve();
      }),
      ...orgIds.map((orgId) =>
        this.redisService.del(this.orgCacheKeys.list(orgId)),
      ),
    ]);
  }
}
