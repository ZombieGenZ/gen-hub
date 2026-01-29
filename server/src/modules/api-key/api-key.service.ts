import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { OrganizationApiKeyRepository } from '../organization-api-key/organization-api-key.repository';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { QueryAdminApiKeyDto, UpdateAdminApiKeyDto } from './dto/api-key.dto';
import { IPaginatedResponse, IApiKey } from '../organization/interfaces';

@Injectable()
export class ApiKeyService {
    constructor(
        private readonly repository: OrganizationApiKeyRepository,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly i18n: I18nService,
    ) { }

    async getAdminApiKeys(
        query: QueryAdminApiKeyDto,
        lang: string,
    ): Promise<IPaginatedResponse<IApiKey>> {
        return this.repository.findAllApiKeys(query);
    }

    async getAdminApiKeyById(
        keyId: string,
        lang: string,
    ): Promise<IApiKey> {
        const apiKey = await this.repository.findApiKeyById(keyId);
        if (!apiKey) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
            );
        }
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
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
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
            await this.repository.updateApiKeyRolesStatusByApiKeyId(keyId, dto.is_active);
            await this.repository.updateApiKeyPermissionsStatusByApiKeyId(keyId, dto.is_active);
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
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
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
    }

    async deleteManyAdminApiKeys(
        ids: string[],
        userId: string,
        lang: string,
    ): Promise<void> {
        const apiKeys = await this.repository.findApiKeysByIds(ids);
        if (apiKeys.length === 0) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
            );
        }

        await this.repository.softDeleteManyApiKeys(ids, userId);

        apiKeys.forEach(apiKey => {
            this.auditLogService.logDelete(
                apiKey.organization_id,
                'ApiKey',
                apiKey.id,
                { name: apiKey.name },
                { userId, description: `Deleted by Admin: ${apiKey.name}` },
            );
        });
    }
}
