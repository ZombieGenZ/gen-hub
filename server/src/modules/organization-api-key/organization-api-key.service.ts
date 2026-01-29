import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as crypto from 'crypto';
import * as argon2 from '@node-rs/argon2';

import { OrganizationApiKeyRepository } from './organization-api-key.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import {
    IApiKey,
    IApiKeyWithPlainKey,
} from '../organization/interfaces';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-key.dto';

@Injectable()
export class OrganizationApiKeyService {
    constructor(
        private readonly repository: OrganizationApiKeyRepository,
        private readonly orgRepository: OrganizationRepository,
        private readonly configService: ConfigService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly i18n: I18nService,
    ) { }

    async createApiKey(
        orgId: string,
        dto: CreateApiKeyDto,
        userId: string,
        lang: string,
    ): Promise<IApiKeyWithPlainKey> {
        if (dto.role_ids) {
            dto.role_ids = [...new Set(dto.role_ids)];
        }
        if (dto.permission_ids) {
            dto.permission_ids = [...new Set(dto.permission_ids)];
        }
        if (dto.allowed_origins) {
            dto.allowed_origins = [...new Set(dto.allowed_origins)];
        }

        const org = await this.orgRepository.findById(orgId);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.org_not_found', { lang }),
            );
        }

        await this.checkOrgPermission(
            orgId,
            userId,
            'organization.apikey.create',
            org.owner_id,
            lang,
        );

        const plainKey = this.generateApiKey();
        const hashedKey = await argon2.hash(plainKey);
        const prefix = this.configService.get<string>('API_KEY_PREFIX') || 'GENHUB';
        const keyPrefix = `${prefix}-${plainKey.substring(prefix.length + 1, prefix.length + 9)}`;

        const apiKey = await this.repository.createApiKey({
            organization: { connect: { id: orgId } },
            created_by: { connect: { id: userId } },
            name: dto.name,
            description: dto.description,
            key_hash: hashedKey,
            key_prefix: keyPrefix,
            expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
            allowed_origins: dto.allowed_origins || [],
            rate_limit_ttl: this.configService.get<number>('API_KEY_RATE_LIMIT_TTL') ?? 60,
            rate_limit_max: this.configService.get<number>('API_KEY_RATE_LIMIT_MAX') ?? 100,
            is_active: true,
        });

        if (dto.role_ids && dto.role_ids.length > 0) {
            await this.repository.assignApiKeyRoles(apiKey.id, dto.role_ids);
        }
        if (dto.permission_ids && dto.permission_ids.length > 0) {
            await this.repository.assignApiKeyPermissions(
                apiKey.id,
                dto.permission_ids,
            );
        }

        const result = await this.repository.findApiKeyById(apiKey.id);

        this.auditLogService.logCreate(
            orgId,
            'ApiKey',
            apiKey.id,
            { name: apiKey.name },
            { userId },
        );

        this.websocketGateway.emitApiKeyCreated(orgId, apiKey.id, apiKey.name, userId);

        return { ...result!, plain_key: plainKey };
    }

    async getApiKeys(
        orgId: string,
        userId: string,
        lang: string,
    ): Promise<IApiKey[]> {
        const org = await this.orgRepository.findById(orgId);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.org_not_found', { lang }),
            );
        }

        await this.checkOrgPermission(
            orgId,
            userId,
            'organization.apikey.read',
            org.owner_id,
            lang,
        );

        const apiKeys = await this.repository.findApiKeysByOrgId(orgId);

        return this.mergeApiKeyPermissions(apiKeys);
    }

    async getApiKeyById(
        orgId: string,
        keyId: string,
        userId: string,
        lang: string,
    ): Promise<IApiKey> {
        const org = await this.orgRepository.findById(orgId);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.org_not_found', { lang }),
            );
        }

        await this.checkOrgPermission(
            orgId,
            userId,
            'organization.apikey.read',
            org.owner_id,
            lang,
        );

        const apiKey = await this.repository.findApiKeyById(keyId);
        if (!apiKey || apiKey.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
            );
        }

        const [result] = this.mergeApiKeyPermissions([apiKey]);
        return result;
    }

    async updateApiKey(
        orgId: string,
        keyId: string,
        dto: UpdateApiKeyDto,
        userId: string,
        lang: string,
    ): Promise<IApiKey> {
        if (dto.role_ids) {
            dto.role_ids = [...new Set(dto.role_ids)];
        }
        if (dto.permission_ids) {
            dto.permission_ids = [...new Set(dto.permission_ids)];
        }
        if (dto.allowed_origins) {
            dto.allowed_origins = [...new Set(dto.allowed_origins)];
        }

        const org = await this.orgRepository.findById(orgId);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.org_not_found', { lang }),
            );
        }

        await this.checkOrgPermission(
            orgId,
            userId,
            'organization.apikey.update',
            org.owner_id,
            lang,
        );

        const apiKey = await this.repository.findApiKeyById(keyId);
        if (!apiKey || apiKey.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
            );
        }

        const oldData = {
            name: apiKey.name,
            description: apiKey.description,
            is_active: apiKey.is_active,
            expires_at: apiKey.expires_at,
            allowed_origins: apiKey.allowed_origins,
        };

        await this.repository.updateApiKey(keyId, {
            name: dto.name,
            description: dto.description,
            is_active: dto.is_active,
            expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
            allowed_origins: dto.allowed_origins,
            updated_by: userId,
            updated_at: new Date(),
        });

        if (dto.role_ids) {
            await this.repository.assignApiKeyRoles(keyId, dto.role_ids);
        }
        if (dto.permission_ids) {
            await this.repository.assignApiKeyPermissions(keyId, dto.permission_ids);
        }

        const updated = await this.repository.findApiKeyById(keyId);

        this.auditLogService.logUpdate(
            orgId,
            'ApiKey',
            keyId,
            oldData,
            {
                name: updated?.name,
                description: updated?.description,
                is_active: updated?.is_active,
                expires_at: updated?.expires_at,
                allowed_origins: updated?.allowed_origins,
            },
            { userId },
        );

        this.websocketGateway.emitApiKeyUpdated(orgId, keyId, updated?.name || '', userId);

        const [result] = this.mergeApiKeyPermissions([updated!]);
        return result;
    }

    async resetApiKey(
        orgId: string,
        keyId: string,
        userId: string,
        lang: string,
    ): Promise<IApiKeyWithPlainKey> {
        const org = await this.orgRepository.findById(orgId);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.org_not_found', { lang }),
            );
        }

        await this.checkOrgPermission(
            orgId,
            userId,
            'organization.apikey.update',
            org.owner_id,
            lang,
        );

        const apiKey = await this.repository.findApiKeyById(keyId);
        if (!apiKey || apiKey.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
            );
        }

        const plainKey = this.generateApiKey();
        const hashedKey = await argon2.hash(plainKey);
        const prefix = this.configService.get<string>('API_KEY_PREFIX') || 'GENHUB';
        const keyPrefix = `${prefix}-${plainKey.substring(prefix.length + 1, prefix.length + 9)}`;

        await this.repository.updateApiKey(keyId, {
            key_hash: hashedKey,
            key_prefix: keyPrefix,
            updated_by: userId,
            updated_at: new Date(),
        });

        const updated = await this.repository.findApiKeyById(keyId);

        this.auditLogService.logUpdate(
            orgId,
            'ApiKey',
            keyId,
            {},
            {},
            { userId, description: 'Reset API Key secret' },
        );

        this.websocketGateway.emitApiKeyUpdated(orgId, keyId, updated?.name || '', userId);

        const [result] = this.mergeApiKeyPermissions([updated!]);
        return { ...result!, plain_key: plainKey };
    }

    async deleteApiKey(
        orgId: string,
        keyId: string,
        userId: string,
        lang: string,
    ): Promise<void> {
        const org = await this.orgRepository.findById(orgId);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.org_not_found', { lang }),
            );
        }

        await this.checkOrgPermission(
            orgId,
            userId,
            'organization.apikey.delete',
            org.owner_id,
            lang,
        );

        const apiKey = await this.repository.findApiKeyById(keyId);
        if (!apiKey || apiKey.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
            );
        }

        await this.repository.softDeleteApiKey(keyId, userId);

        this.auditLogService.logDelete(
            orgId,
            'ApiKey',
            keyId,
            { name: apiKey.name },
            { userId },
        );

        this.websocketGateway.emitApiKeyDeleted(orgId, keyId, userId);
    }

    async deleteManyApiKeys(
        orgId: string,
        ids: string[],
        userId: string,
        lang: string,
    ): Promise<void> {
        const org = await this.orgRepository.findById(orgId);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.org_not_found', { lang }),
            );
        }

        await this.checkOrgPermission(
            orgId,
            userId,
            'organization.apikey.delete',
            org.owner_id,
            lang,
        );

        const apiKeys = await this.repository.findApiKeysByIds(ids);
        if (apiKeys.length === 0) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
            );
        }

        const invalidKey = apiKeys.find(k => k.organization_id !== orgId);
        if (invalidKey) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
            );
        }

        await this.repository.softDeleteManyApiKeys(ids, userId);

        this.websocketGateway.emitApiKeysDeletedMany(orgId, ids, userId);

        apiKeys.forEach(apiKey => {
            this.auditLogService.logDelete(
                orgId,
                'ApiKey',
                apiKey.id,
                { name: apiKey.name } as Record<string, unknown>,
                { userId, description: `Deleted API Key: ${apiKey.name}` },
            );
        });
    }

    private generateApiKey(): string {
        const prefix = this.configService.get<string>('API_KEY_PREFIX') || 'GENHUB';
        const randomPart = crypto.randomBytes(16).toString('hex').toUpperCase();
        return `${prefix}-${randomPart}`;
    }

    private mergeApiKeyPermissions(apiKeys: IApiKey[]): IApiKey[] {
        return apiKeys.map((apiKey: any) => {
            const directPermissions = (apiKey.permissions || []).map((p: any) => ({
                ...p,
                source: 'permission',
                roles: [],
            }));

            const rolePermissionsMap = new Map<string, any>();
            for (const apiKeyRole of apiKey.roles || []) {
                const role = apiKeyRole.role;
                if (role && role.permissions) {
                    for (const rolePermission of role.permissions) {
                        const permissionId = rolePermission.permission.id;
                        if (rolePermissionsMap.has(permissionId)) {
                            rolePermissionsMap.get(permissionId).roles.push({
                                id: role.id,
                                name: role.name,
                            });
                        } else {
                            rolePermissionsMap.set(permissionId, {
                                id: rolePermission.id,
                                api_key_id: apiKey.id,
                                organization_permission_id:
                                    rolePermission.organization_permission_id,
                                is_active: true,
                                created_at: rolePermission.created_at || new Date(),
                                updated_at: rolePermission.updated_at || new Date(),
                                is_deleted: false,
                                deleted_at: null,
                                permission: rolePermission.permission,
                                source: 'role',
                                roles: [{ id: role.id, name: role.name }],
                            });
                        }
                    }
                }
            }
            const rolePermissions = Array.from(rolePermissionsMap.values());

            const allPermissions = [...directPermissions, ...rolePermissions];
            const uniquePermissions = allPermissions.filter(
                (p, index, self) =>
                    index === self.findIndex((t) => t.permission.id === p.permission.id),
            );

            const cleanedRoles = (apiKey.roles || []).map((ar: any) => ({
                id: ar.id,
                organization_role_id: ar.organization_role_id,
                role: {
                    id: ar.role.id,
                    name: ar.role.name,
                },
            }));

            return {
                ...apiKey,
                roles: cleanedRoles,
                permissions: uniquePermissions,
            };
        }) as IApiKey[];
    }

    private async checkOrgPermission(
        orgId: string,
        userId: string,
        permissionKey: string,
        ownerId: string,
        lang: string,
    ): Promise<void> {
        if (userId === ownerId) {
            return;
        }

        const member = await this.orgRepository.findMemberByUserAndOrg(userId, orgId);
        if (!member || !member.is_accepted) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.permission_denied', { lang }),
            );
        }

        const hasDirectPermission = member.permissions?.some(
            (p: any) => p.permission.key === permissionKey,
        );
        if (hasDirectPermission) return;

        const hasRolePermission = member.roles?.some((r: any) =>
            r.role?.permissions?.some((p: any) => p.permission.key === permissionKey)
        );

        if (!hasRolePermission) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.permission_denied', { lang }),
            );
        }
    }
}
