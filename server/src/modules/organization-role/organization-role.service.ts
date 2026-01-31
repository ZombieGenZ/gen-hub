import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { OrganizationRoleRepository } from './organization-role.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { CreateOrganizationRoleDto, UpdateOrganizationRoleDto } from './dto/organization-role.dto';
import { IOrganizationRole, IOrganizationPermission } from '../organization/interfaces';
import { OrganizationRoleCacheKeys } from './constants/cache-keys.helper';


@Injectable()
export class OrganizationRoleService {
    constructor(
        private readonly repository: OrganizationRoleRepository,
        private readonly orgRepository: OrganizationRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly i18n: I18nService,

        private readonly cacheKeys: OrganizationRoleCacheKeys,
    ) { }


    async createRole(
        orgId: string,
        dto: CreateOrganizationRoleDto,
        userId: string,
        lang: string,
    ): Promise<IOrganizationRole> {
        if (dto.permission_ids) {
            dto.permission_ids = [...new Set(dto.permission_ids)];
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
            'organization.role.create',
            org.owner_id,
            lang,
        );

        const role = await this.repository.create({
            organization: { connect: { id: orgId } },
            name: dto.name,
            description: dto.description,
            is_active: dto.is_active ?? true,
            is_default: false,
        });

        if (dto.permission_ids && dto.permission_ids.length > 0) {
            await this.repository.assignPermissions(role.id, dto.permission_ids);
        }

        const result = await this.repository.findById(role.id);

        this.auditLogService.logCreate(
            orgId,
            'OrganizationRole',
            role.id,
            { name: role.name },
            { userId },
        );

        this.websocketGateway.emitOrgRoleCreated(orgId, role.id, role.name, userId);

        this.websocketGateway.emitOrgRoleCreated(orgId, role.id, role.name, userId);

        // Invalidate list cache
        await this.redisService.del(this.cacheKeys.list(orgId));

        return result!;
    }


    async getRoles(
        orgId: string,
        userId: string,
        lang: string,
    ): Promise<IOrganizationRole[]> {
        const org = await this.orgRepository.findById(orgId);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.org_not_found', { lang }),
            );
        }

        await this.checkOrgPermission(
            orgId,
            userId,
            'organization.role.list',
            org.owner_id,
            lang,
        );

        const cacheKey = this.cacheKeys.list(orgId);
        const cached = await this.redisService.getJson<IOrganizationRole[]>(cacheKey);
        if (cached) return cached;

        const roles = await this.repository.findByOrgId(orgId);
        await this.redisService.setJson(cacheKey, roles, this.cacheKeys.ttlList);


        return roles;
    }


    async getRoleById(
        orgId: string,
        roleId: string,
        userId: string,
        lang: string,
    ): Promise<IOrganizationRole> {
        const org = await this.orgRepository.findById(orgId);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.org_not_found', { lang }),
            );
        }

        await this.checkOrgPermission(
            orgId,
            userId,
            'organization.role.read',
            org.owner_id,
            lang,
        );

        const cacheKey = this.cacheKeys.item(orgId, roleId);
        const cached = await this.redisService.getJson<IOrganizationRole>(cacheKey);
        if (cached) return cached;

        const role = await this.repository.findById(roleId);
        if (!role || role.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.role_not_found', { lang }),
            );
        }

        await this.redisService.setJson(cacheKey, role, this.cacheKeys.ttlItem);


        return role;
    }


    async updateRole(
        orgId: string,
        roleId: string,
        dto: UpdateOrganizationRoleDto,
        userId: string,
        lang: string,
    ): Promise<IOrganizationRole> {
        if (dto.permission_ids) {
            dto.permission_ids = [...new Set(dto.permission_ids)];
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
            'organization.role.update',
            org.owner_id,
            lang,
        );

        const role = await this.repository.findById(roleId);
        if (!role || role.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.role_not_found', { lang }),
            );
        }

        const oldData = {
            name: role.name,
            description: role.description,
            is_active: role.is_active,
        };

        if (dto.is_active !== undefined && dto.is_active !== role.is_active) {
            await this.repository.updateMemberRolesStatusByRoleId(roleId, dto.is_active);
            await this.repository.updateApiKeyRolesStatusByRoleId(roleId, dto.is_active);
        }

        await this.repository.update(roleId, {
            name: dto.name,
            description: dto.description,
            is_active: dto.is_active,
            updated_at: new Date(),
        });

        if (dto.permission_ids !== undefined) {
            await this.repository.assignPermissions(roleId, dto.permission_ids);
        }

        const updated = await this.repository.findById(roleId);

        this.auditLogService.logUpdate(
            orgId,
            'OrganizationRole',
            roleId,
            oldData,
            {
                name: updated?.name,
                description: updated?.description,
                is_active: updated?.is_active,
            },
            { userId },
        );

        this.websocketGateway.emitOrgRoleUpdated(orgId, roleId, updated?.name || '', userId);

        this.websocketGateway.emitOrgRoleUpdated(orgId, roleId, updated?.name || '', userId);

        // Invalidate cache
        await this.redisService.del(this.cacheKeys.item(orgId, roleId));
        await this.redisService.del(this.cacheKeys.list(orgId));
        // Permissions might have changed
        await this.redisService.del(this.cacheKeys.permissions(orgId));

        return updated!;
    }

    async deleteRole(
        orgId: string,
        roleId: string,
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
            'organization.role.delete',
            org.owner_id,
            lang,
        );

        const role = await this.repository.findById(roleId);
        if (!role || role.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.role_not_found', { lang }),
            );
        }

        // Cascade soft delete member roles và api key roles trước khi xóa role
        await this.repository.softDeleteMemberRolesByRoleId(roleId);
        await this.repository.softDeleteApiKeyRolesByRoleId(roleId);

        await this.repository.softDelete(roleId);

        this.auditLogService.logDelete(
            orgId,
            'OrganizationRole',
            roleId,
            { name: role.name },
            { userId },
        );

        this.websocketGateway.emitOrgRoleDeleted(orgId, roleId, userId);
        this.websocketGateway.emitOrgRoleDeleted(orgId, roleId, userId);

        // Invalidate cache
        await this.redisService.del(this.cacheKeys.item(orgId, roleId));
        await this.redisService.del(this.cacheKeys.list(orgId));
        await this.redisService.del(this.cacheKeys.permissions(orgId));
    }


    async deleteManyRoles(
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
            'organization.role.delete',
            org.owner_id,
            lang,
        );

        const roles = await this.repository.findByIds(ids);
        if (roles.length === 0) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.role_not_found', { lang }),
            );
        }

        const invalidRole = roles.find(r => r.organization_id !== orgId);
        if (invalidRole) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.role_not_found', { lang }),
            );
        }

        // Cascade soft delete dependencies
        await Promise.all([
            ...ids.map(id => this.repository.softDeleteMemberRolesByRoleId(id)),
            ...ids.map(id => this.repository.softDeleteApiKeyRolesByRoleId(id)),
        ]);

        await this.repository.softDeleteMany(ids);

        this.websocketGateway.emitOrgRolesDeletedMany(orgId, ids, userId);

        roles.forEach(role => {
            this.auditLogService.logDelete(
                orgId,
                'OrganizationRole',
                role.id,
                { name: role.name } as Record<string, unknown>,
                { userId, description: `Deleted role: ${role.name}` },
            );
        });


        // Invalidate cache
        await Promise.all([
            ...ids.map(id => this.redisService.del(this.cacheKeys.item(orgId, id))),
            this.redisService.del(this.cacheKeys.list(orgId)),
            this.redisService.del(this.cacheKeys.permissions(orgId)),
        ]);
    }


    async getPermissions(
        orgId: string,
        userId: string,
        lang: string,
    ): Promise<IOrganizationPermission[]> {
        const org = await this.orgRepository.findById(orgId);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.org_not_found', { lang }),
            );
        }

        const isOwner = org.owner_id === userId || org.owner?.id === userId;
        if (!isOwner) {
            const member = await this.orgRepository.findMemberByUserAndOrg(userId, orgId);
            if (!member || !member.is_accepted) {
                throw new ForbiddenException(
                    await this.i18n.translate('organization.errors.permission_denied', { lang }),
                );
            }
        }

        const cacheKey = this.cacheKeys.permissions(orgId);
        const cached = await this.redisService.getJson<IOrganizationPermission[]>(cacheKey);
        if (cached) return cached;

        const permissions = await this.repository.findAllOrganizationPermissions();
        // Permission list ít thay đổi, có thể cache lâu hơn
        await this.redisService.setJson(cacheKey, permissions, 3600);

        return permissions;
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
