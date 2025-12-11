import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { OrganizationRepository } from './organization.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { OrganizationAuditLogService } from './organization-audit-log.service';
import {
    CreateOrganizationDto,
    UpdateOrganizationDto,
    QueryOrganizationDto,
    TransferOwnershipDto,
    InviteMemberDto,
    AssignMemberRolesDto,
    AssignMemberPermissionsDto,
    CreateOrganizationRoleDto,
    UpdateOrganizationRoleDto,
    CreateApiKeyDto,
    UpdateApiKeyDto,
} from './dto';
import {
    IOrganizationWithRelations,
    IOrganizationMember,
    IOrganizationRole,
    IOrganizationPermission,
    IApiKey,
    IApiKeyWithPlainKey,
    IPaginatedResponse,
} from './interfaces';

/**
 * Service chứa business logic cho Organization module
 */
@Injectable()
export class OrganizationService {
    constructor(
        private readonly repository: OrganizationRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly i18n: I18nService,
    ) { }

    async create(
        dto: CreateOrganizationDto,
        userId: string,
        lang: string,
    ): Promise<IOrganizationWithRelations> {
        // Kiểm tra tên đã tồn tại chưa
        const nameExists = await this.repository.findByName(dto.name);
        if (nameExists) {
            throw new ConflictException(
                await this.i18n.translate('organization.errors.name_exists', { lang }),
            );
        }

        // Tạo organization
        const org = await this.repository.create({
            name: dto.name,
            is_active: dto.is_active ?? true,
            owner: { connect: { id: userId } },
            created_by: userId,
        });

        // Invalidate cache
        await this.redisService.invalidateOrganizationListCache();

        // Log
        this.systemLogService.info('organization', 'create', `Organization created: ${org.name}`, { userId });
        this.auditLogService.logCreate(org.id, 'Organization', org.id, { name: org.name }, { userId });

        // Emit WebSocket event
        this.websocketGateway.emitOrganizationCreated(userId, org);

        return org;
    }

    async findById(
        id: string,
        lang: string,
        userId?: string,
        hasReadAllPermission?: boolean,
    ): Promise<IOrganizationWithRelations> {
        // Kiểm tra cache trước
        const cached = await this.redisService.getOrganizationCache<IOrganizationWithRelations>(id);
        if (cached) {
            // Nếu không có quyền .all, kiểm tra xem user có phải owner hoặc member không
            if (!hasReadAllPermission && userId) {
                const isOwnerOrMember = cached.owner_id === userId ||
                    await this.repository.findMemberByUserAndOrg(userId, id) !== null;
                if (!isOwnerOrMember) {
                    throw new NotFoundException(
                        await this.i18n.translate('organization.errors.not_found', { lang }),
                    );
                }
            }
            return cached;
        }

        const org = await this.repository.findById(id);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.not_found', { lang }),
            );
        }

        // Nếu không có quyền .all, kiểm tra xem user có phải owner hoặc member không
        if (!hasReadAllPermission && userId) {
            const isOwnerOrMember = org.owner_id === userId ||
                await this.repository.findMemberByUserAndOrg(userId, id) !== null;
            if (!isOwnerOrMember) {
                throw new NotFoundException(
                    await this.i18n.translate('organization.errors.not_found', { lang }),
                );
            }
        }

        // Cache result
        await this.redisService.setOrganizationCache(id, org);

        return org;
    }

    async findMany(
        query: QueryOrganizationDto,
        userId: string,
        hasListAllPermission?: boolean,
    ): Promise<IPaginatedResponse<IOrganizationWithRelations>> {
        // Nếu có quyền .all, không filter theo userId
        const effectiveUserId = hasListAllPermission ? undefined : userId;
        const cacheKey = this.redisService.getOrganizationListCacheKey({ ...query, userId: effectiveUserId });
        const cached = await this.redisService.getOrganizationListCache<IPaginatedResponse<IOrganizationWithRelations>>(cacheKey);
        if (cached) return cached;

        const result = await this.repository.findMany(query, effectiveUserId);

        // Cache result
        await this.redisService.setOrganizationListCache(cacheKey, result);

        return result;
    }

    async update(
        id: string,
        dto: UpdateOrganizationDto,
        userId: string,
        lang: string,
    ): Promise<IOrganizationWithRelations> {
        const org = await this.findById(id, lang);

        // Kiểm tra quyền: phải là owner
        if (org.owner_id !== userId) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.not_owner', { lang }),
            );
        }

        // Kiểm tra tên trùng (nếu đổi tên)
        if (dto.name && dto.name !== org.name) {
            const nameExists = await this.repository.findByName(dto.name, id);
            if (nameExists) {
                throw new ConflictException(
                    await this.i18n.translate('organization.errors.name_exists', { lang }),
                );
            }
        }

        const oldData = { name: org.name, is_active: org.is_active };
        const updated = await this.repository.update(id, {
            ...dto,
            updated_by: userId,
            updated_at: new Date(),
        });

        // Invalidate cache
        await this.redisService.invalidateAllOrganizationCache(id);

        // Log
        this.systemLogService.info('organization', 'update', `Organization updated: ${updated.name}`, { userId });
        this.auditLogService.logUpdate(id, 'Organization', id, oldData, { name: updated.name, is_active: updated.is_active }, { userId });

        // Emit WebSocket
        this.websocketGateway.emitOrganizationUpdated(org.owner_id, updated);

        return updated;
    }

    async delete(
        id: string,
        userId: string,
        lang: string,
    ): Promise<void> {
        const org = await this.findById(id, lang);

        // Kiểm tra quyền: phải là owner
        if (org.owner_id !== userId) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.not_owner', { lang }),
            );
        }

        const oldData = { name: org.name, is_active: org.is_active };
        await this.repository.softDelete(id, userId);

        // Invalidate cache
        await this.redisService.invalidateAllOrganizationCache(id);

        // Log
        this.systemLogService.info('organization', 'delete', `Organization deleted: ${org.name}`, { userId });
        this.auditLogService.logDelete(id, 'Organization', id, oldData, { userId });

        // Emit WebSocket
        this.websocketGateway.emitOrganizationDeleted(org.owner_id, id);
    }

    async transferOwnership(
        id: string,
        dto: TransferOwnershipDto,
        userId: string,
        lang: string,
    ): Promise<IOrganizationWithRelations> {
        const org = await this.findById(id, lang);

        // Kiểm tra quyền: phải là owner
        if (org.owner_id !== userId) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.not_owner', { lang }),
            );
        }

        // Kiểm tra new owner tồn tại
        const newOwner = await this.repository.findUserById(dto.new_owner_id);
        if (!newOwner) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.user_not_found', { lang }),
            );
        }

        // Kiểm tra new owner là member của org
        const member = await this.repository.findMemberByUserAndOrg(dto.new_owner_id, id);
        if (!member || !member.is_accepted) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.new_owner_not_member', { lang }),
            );
        }

        const oldOwnerId = org.owner_id;
        const updated = await this.repository.update(id, {
            owner: { connect: { id: dto.new_owner_id } },
            updated_by: userId,
            updated_at: new Date(),
        });

        // Invalidate cache
        await this.redisService.invalidateAllOrganizationCache(id);

        // Log
        this.systemLogService.info('organization', 'transfer_ownership', `Ownership transferred from ${oldOwnerId} to ${dto.new_owner_id}`, { userId });
        this.auditLogService.logUpdate(id, 'Organization', id, { owner_id: oldOwnerId }, { owner_id: dto.new_owner_id }, { userId, description: 'Ownership transferred' });

        // Emit WebSocket to both old and new owner
        this.websocketGateway.emitOwnershipTransferred(oldOwnerId, dto.new_owner_id, updated);

        return updated;
    }

    async inviteMember(
        orgId: string,
        dto: InviteMemberDto,
        userId: string,
        lang: string,
    ): Promise<IOrganizationMember> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.member.invite', org.owner_id, lang);

        // Kiểm tra user tồn tại
        const user = await this.repository.findUserById(dto.user_id);
        if (!user) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.user_not_found', { lang }),
            );
        }

        // Kiểm tra đã là member chưa
        const existingMember = await this.repository.findMemberByUserAndOrg(dto.user_id, orgId);
        if (existingMember && existingMember.is_accepted) {
            throw new ConflictException(
                await this.i18n.translate('organization.errors.already_member', { lang }),
            );
        }
        if (existingMember && !existingMember.is_accepted) {
            throw new ConflictException(
                await this.i18n.translate('organization.errors.already_invited', { lang }),
            );
        }

        // Tạo member (pending invitation)
        const member = await this.repository.createMember({
            organization: { connect: { id: orgId } },
            user: { connect: { id: dto.user_id } },
            is_accepted: false,
            is_active: true,
            created_by: userId,
        });

        // Nếu có role_ids thì gán roles
        if (dto.role_ids && dto.role_ids.length > 0) {
            await this.repository.assignMemberRoles(member.id, dto.role_ids, userId);
        }

        // Invalidate cache
        await this.redisService.invalidateOrganizationMemberCache(orgId);

        // Log
        this.auditLogService.logCreate(orgId, 'OrganizationMember', member.id, { user_id: dto.user_id, invited_by: userId }, { userId });

        // Emit WebSocket to the invited user
        this.websocketGateway.emitMemberInvited(dto.user_id, { organization: org, member });

        return member;
    }

    async cancelInvite(
        orgId: string,
        memberId: string,
        userId: string,
        lang: string,
    ): Promise<void> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.member.invite.remove', org.owner_id, lang);

        const member = await this.repository.findMemberById(memberId);
        if (!member || member.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.invite_not_found', { lang }),
            );
        }

        if (member.is_accepted) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.member_not_found', { lang }),
            );
        }

        await this.repository.softDeleteMember(memberId, userId);

        // Invalidate cache
        await this.redisService.invalidateOrganizationMemberCache(orgId);

        // Log
        this.auditLogService.logDelete(orgId, 'OrganizationMember', memberId, { user_id: member.user_id }, { userId });
    }

    async acceptInvite(
        orgId: string,
        userId: string,
        lang: string,
    ): Promise<IOrganizationMember> {
        const member = await this.repository.findMemberByUserAndOrg(userId, orgId);
        if (!member) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.invite_not_found', { lang }),
            );
        }

        if (member.is_accepted) {
            throw new ConflictException(
                await this.i18n.translate('organization.errors.already_member', { lang }),
            );
        }

        const updated = await this.repository.updateMember(member.id, {
            is_accepted: true,
            updated_at: new Date(),
        });

        // Invalidate cache
        await this.redisService.invalidateOrganizationMemberCache(orgId);

        // Log
        this.auditLogService.logUpdate(orgId, 'OrganizationMember', member.id, { is_accepted: false }, { is_accepted: true }, { userId });

        return updated;
    }

    async rejectInvite(
        orgId: string,
        userId: string,
        lang: string,
    ): Promise<void> {
        const member = await this.repository.findMemberByUserAndOrg(userId, orgId);
        if (!member) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.invite_not_found', { lang }),
            );
        }

        if (member.is_accepted) {
            throw new ConflictException(
                await this.i18n.translate('organization.errors.already_member', { lang }),
            );
        }

        await this.repository.softDeleteMember(member.id, userId);

        // Invalidate cache
        await this.redisService.invalidateOrganizationMemberCache(orgId);

        // Log
        this.auditLogService.logDelete(orgId, 'OrganizationMember', member.id, { user_id: userId, rejected: true }, { userId });
    }

    async getMembers(
        orgId: string,
        userId: string,
        query: { limit?: number; offset?: number; is_accepted?: boolean },
        lang: string,
    ): Promise<IPaginatedResponse<IOrganizationMember>> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.member.list', org.owner_id, lang);

        return this.repository.findMembersByOrgId(orgId, query);
    }

    async assignMemberRoles(
        orgId: string,
        memberId: string,
        dto: AssignMemberRolesDto,
        userId: string,
        lang: string,
    ): Promise<IOrganizationMember> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.member.role.assign', org.owner_id, lang);

        const member = await this.repository.findMemberById(memberId);
        if (!member || member.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.member_not_found', { lang }),
            );
        }

        await this.repository.assignMemberRoles(memberId, dto.role_ids, userId);

        const updated = await this.repository.findMemberById(memberId);

        // Invalidate cache
        await this.redisService.invalidateOrganizationMemberCache(orgId);

        // Log
        this.auditLogService.logUpdate(orgId, 'OrganizationMember', memberId, {}, { role_ids: dto.role_ids }, { userId, description: 'Roles assigned' });

        return updated!;
    }

    async assignMemberPermissions(
        orgId: string,
        memberId: string,
        dto: AssignMemberPermissionsDto,
        userId: string,
        lang: string,
    ): Promise<IOrganizationMember> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.member.permission.assign', org.owner_id, lang);

        const member = await this.repository.findMemberById(memberId);
        if (!member || member.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.member_not_found', { lang }),
            );
        }

        await this.repository.assignMemberPermissions(memberId, dto.permission_ids, userId);

        const updated = await this.repository.findMemberById(memberId);

        // Invalidate cache
        await this.redisService.invalidateOrganizationMemberCache(orgId);

        // Log
        this.auditLogService.logUpdate(orgId, 'OrganizationMember', memberId, {}, { permission_ids: dto.permission_ids }, { userId, description: 'Permissions assigned' });

        return updated!;
    }

    async removeMember(
        orgId: string,
        memberId: string,
        userId: string,
        lang: string,
    ): Promise<void> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.member.remove', org.owner_id, lang);

        const member = await this.repository.findMemberById(memberId);
        if (!member || member.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.member_not_found', { lang }),
            );
        }

        // Không thể xóa owner
        if (member.user_id === org.owner_id) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.cannot_remove_owner', { lang }),
            );
        }

        // Không thể tự xóa mình
        if (member.user_id === userId) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.cannot_remove_self', { lang }),
            );
        }

        await this.repository.softDeleteMember(memberId, userId);

        // Invalidate cache
        await this.redisService.invalidateOrganizationMemberCache(orgId);

        // Log
        this.auditLogService.logDelete(orgId, 'OrganizationMember', memberId, { user_id: member.user_id }, { userId });

        // Emit WebSocket to removed user
        this.websocketGateway.emitMemberRemoved(member.user_id, { organizationId: orgId, memberId });
    }

    async createRole(
        orgId: string,
        dto: CreateOrganizationRoleDto,
        userId: string,
        lang: string,
    ): Promise<IOrganizationRole> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.role.create', org.owner_id, lang);

        const role = await this.repository.createRole({
            organization: { connect: { id: orgId } },
            name: dto.name,
            description: dto.description,
            is_active: dto.is_active ?? true,
            is_default: false,
        });

        // Gán permissions nếu có
        if (dto.permission_ids && dto.permission_ids.length > 0) {
            await this.repository.assignRolePermissions(role.id, dto.permission_ids);
        }

        const result = await this.repository.findRoleById(role.id);

        // Log
        this.auditLogService.logCreate(orgId, 'OrganizationRole', role.id, { name: role.name }, { userId });

        return result!;
    }

    async getRoles(
        orgId: string,
        userId: string,
        lang: string,
    ): Promise<IOrganizationRole[]> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.role.read', org.owner_id, lang);

        return this.repository.findRolesByOrgId(orgId);
    }

    async updateRole(
        orgId: string,
        roleId: string,
        dto: UpdateOrganizationRoleDto,
        userId: string,
        lang: string,
    ): Promise<IOrganizationRole> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.role.update', org.owner_id, lang);

        const role = await this.repository.findRoleById(roleId);
        if (!role || role.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.role_not_found', { lang }),
            );
        }

        const oldData = { name: role.name, description: role.description };
        await this.repository.updateRole(roleId, {
            name: dto.name,
            description: dto.description,
            is_active: dto.is_active,
            updated_at: new Date(),
        });

        // Update permissions nếu có
        if (dto.permission_ids !== undefined) {
            await this.repository.assignRolePermissions(roleId, dto.permission_ids);
        }

        const updated = await this.repository.findRoleById(roleId);

        // Log
        this.auditLogService.logUpdate(orgId, 'OrganizationRole', roleId, oldData, { name: updated?.name, description: updated?.description }, { userId });

        return updated!;
    }

    async deleteRole(
        orgId: string,
        roleId: string,
        userId: string,
        lang: string,
    ): Promise<void> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.role.delete', org.owner_id, lang);

        const role = await this.repository.findRoleById(roleId);
        if (!role || role.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.role_not_found', { lang }),
            );
        }

        // Kiểm tra role có đang được sử dụng không
        const inUse = await this.repository.isRoleInUse(roleId);
        if (inUse) {
            throw new ConflictException(
                await this.i18n.translate('organization.errors.role_in_use', { lang }),
            );
        }

        await this.repository.softDeleteRole(roleId);

        // Log
        this.auditLogService.logDelete(orgId, 'OrganizationRole', roleId, { name: role.name }, { userId });
    }

    async getPermissions(
        orgId: string,
        userId: string,
        lang: string,
    ): Promise<IOrganizationPermission[]> {
        const org = await this.findById(orgId, lang);

        // Chỉ cần là member hoặc owner mới xem được permissions
        if (org.owner_id !== userId) {
            const member = await this.repository.findMemberByUserAndOrg(userId, orgId);
            if (!member || !member.is_accepted) {
                throw new ForbiddenException(
                    await this.i18n.translate('organization.errors.permission_denied', { lang }),
                );
            }
        }

        return this.repository.findAllOrganizationPermissions();
    }

    async createApiKey(
        orgId: string,
        dto: CreateApiKeyDto,
        userId: string,
        lang: string,
    ): Promise<IApiKeyWithPlainKey> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.apikey.create', org.owner_id, lang);

        // Generate API key
        const plainKey = this.generateApiKey();
        const hashedKey = await bcrypt.hash(plainKey, 10);
        const keyPrefix = plainKey.substring(0, 8);

        const apiKey = await this.repository.createApiKey({
            organization: { connect: { id: orgId } },
            created_by: { connect: { id: userId } },
            name: dto.name,
            description: dto.description,
            key_hash: hashedKey,
            key_prefix: keyPrefix,
            expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
            is_active: true,
        });

        // Gán roles và permissions nếu có
        if (dto.role_ids && dto.role_ids.length > 0) {
            await this.repository.assignApiKeyRoles(apiKey.id, dto.role_ids);
        }
        if (dto.permission_ids && dto.permission_ids.length > 0) {
            await this.repository.assignApiKeyPermissions(apiKey.id, dto.permission_ids);
        }

        const result = await this.repository.findApiKeyById(apiKey.id);

        // Log
        this.auditLogService.logCreate(orgId, 'ApiKey', apiKey.id, { name: apiKey.name }, { userId });

        return { ...result!, plain_key: plainKey };
    }

    async getApiKeys(
        orgId: string,
        userId: string,
        lang: string,
    ): Promise<IApiKey[]> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.apikey.read', org.owner_id, lang);

        return this.repository.findApiKeysByOrgId(orgId);
    }

    async updateApiKey(
        orgId: string,
        keyId: string,
        dto: UpdateApiKeyDto,
        userId: string,
        lang: string,
    ): Promise<IApiKey> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.apikey.update', org.owner_id, lang);

        const apiKey = await this.repository.findApiKeyById(keyId);
        if (!apiKey || apiKey.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
            );
        }

        const oldData = { name: apiKey.name, is_active: apiKey.is_active };
        await this.repository.updateApiKey(keyId, {
            name: dto.name,
            description: dto.description,
            is_active: dto.is_active,
            expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
            updated_by: userId,
            updated_at: new Date(),
        });

        // Update roles và permissions nếu có
        if (dto.role_ids !== undefined) {
            await this.repository.assignApiKeyRoles(keyId, dto.role_ids);
        }
        if (dto.permission_ids !== undefined) {
            await this.repository.assignApiKeyPermissions(keyId, dto.permission_ids);
        }

        const updated = await this.repository.findApiKeyById(keyId);

        // Log
        this.auditLogService.logUpdate(orgId, 'ApiKey', keyId, oldData, { name: updated?.name, is_active: updated?.is_active }, { userId });

        return updated!;
    }

    async resetApiKey(
        orgId: string,
        keyId: string,
        userId: string,
        lang: string,
    ): Promise<IApiKeyWithPlainKey> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.apikey.reset', org.owner_id, lang);

        const apiKey = await this.repository.findApiKeyById(keyId);
        if (!apiKey || apiKey.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
            );
        }

        // Generate new key
        const plainKey = this.generateApiKey();
        const hashedKey = await bcrypt.hash(plainKey, 10);
        const keyPrefix = plainKey.substring(0, 8);

        await this.repository.updateApiKey(keyId, {
            key_hash: hashedKey,
            key_prefix: keyPrefix,
            updated_by: userId,
            updated_at: new Date(),
        });

        const updated = await this.repository.findApiKeyById(keyId);

        // Log
        this.auditLogService.logUpdate(orgId, 'ApiKey', keyId, {}, { key_reset: true }, { userId, description: 'API key reset' });

        return { ...updated!, plain_key: plainKey };
    }

    async deleteApiKey(
        orgId: string,
        keyId: string,
        userId: string,
        lang: string,
    ): Promise<void> {
        const org = await this.findById(orgId, lang);

        // Kiểm tra quyền
        await this.checkOrgPermission(orgId, userId, 'organization.apikey.delete', org.owner_id, lang);

        const apiKey = await this.repository.findApiKeyById(keyId);
        if (!apiKey || apiKey.organization_id !== orgId) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_not_found', { lang }),
            );
        }

        await this.repository.softDeleteApiKey(keyId, userId);

        // Log
        this.auditLogService.logDelete(orgId, 'ApiKey', keyId, { name: apiKey.name }, { userId });
    }

    private generateApiKey(): string {
        return `genhub_${crypto.randomBytes(32).toString('hex')}`;
    }

    /**
     * Kiểm tra quyền organization.
     * Owner luôn có full quyền, member cần có permission tương ứng.
     */
    private async checkOrgPermission(
        orgId: string,
        userId: string,
        permissionKey: string,
        ownerId: string,
        lang: string,
    ): Promise<void> {
        // Owner có full quyền
        if (userId === ownerId) {
            return;
        }

        // Kiểm tra member và permission
        const member = await this.repository.findMemberByUserAndOrg(userId, orgId);
        if (!member || !member.is_accepted) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.permission_denied', { lang }),
            );
        }

        // Kiểm tra direct permissions
        const hasDirectPermission = member.permissions?.some(
            (p) => p.permission.key === permissionKey,
        );
        if (hasDirectPermission) return;

        // Kiểm tra role permissions
        const hasRolePermission = member.roles?.some((r) => {
            // Cần fetch role permissions - tạm thời skip vì đã include trong memberInclude
            return false; // TODO: implement full check
        });

        if (!hasRolePermission) {
            throw new ForbiddenException(
                await this.i18n.translate('organization.errors.permission_denied', { lang }),
            );
        }
    }
}
