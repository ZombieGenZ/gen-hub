import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryOrganizationDto } from './dto';
import {
    IOrganizationWithRelations,
    IOrganizationMember,
    IOrganizationRole,
    IOrganizationPermission,
    IApiKey,
    IPaginatedResponse,
} from './interfaces';

/**
 * Repository xử lý database operations cho Organization
 */
@Injectable()
export class OrganizationRepository {
    constructor(private readonly prisma: PrismaService) { }

    /** Include relations cho Organization */
    private readonly orgInclude = {
        owner: {
            select: { id: true, name: true, email: true },
        },
        _count: {
            select: {
                members: { where: { is_deleted: false } },
                roles: { where: { is_deleted: false } },
                api_keys: { where: { is_deleted: false } },
            },
        },
    };

    /** Include relations cho Member */
    private readonly memberInclude = {
        user: {
            select: { id: true, name: true, email: true },
        },
        roles: {
            where: { is_deleted: false, is_active: true },
            include: {
                role: { select: { id: true, name: true } },
            },
        },
        permissions: {
            where: { is_deleted: false, is_active: true },
            include: {
                permission: { select: { id: true, name: true, key: true } },
            },
        },
    };

    async create(data: Prisma.OrganizationCreateInput): Promise<IOrganizationWithRelations> {
        return this.prisma.organization.create({
            data,
            include: this.orgInclude,
        }) as unknown as IOrganizationWithRelations;
    }

    async findById(id: string): Promise<IOrganizationWithRelations | null> {
        return this.prisma.organization.findFirst({
            where: { id, is_deleted: false },
            include: this.orgInclude,
        }) as unknown as IOrganizationWithRelations | null;
    }

    async findByName(name: string, excludeId?: string): Promise<boolean> {
        const existing = await this.prisma.organization.findFirst({
            where: {
                name,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
        return !!existing;
    }

    async findMany(
        query: QueryOrganizationDto,
        userId?: string,
    ): Promise<IPaginatedResponse<IOrganizationWithRelations>> {
        const { limit = 10, offset = 0, keywords, is_active } = query;

        const where: Prisma.OrganizationWhereInput = {
            is_deleted: false,
            ...(is_active !== undefined && { is_active }),
            ...(keywords && {
                name: { contains: keywords, mode: 'insensitive' },
            }),
            // Chỉ lấy organization mà user là owner hoặc member
            ...(userId && {
                OR: [
                    { owner_id: userId },
                    { members: { some: { user_id: userId, is_deleted: false, is_accepted: true } } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.organization.findMany({
                where,
                include: this.orgInclude,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.organization.count({ where }),
        ]);

        return {
            items: items as unknown as IOrganizationWithRelations[],
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    async update(id: string, data: Prisma.OrganizationUpdateInput): Promise<IOrganizationWithRelations> {
        return this.prisma.organization.update({
            where: { id },
            data,
            include: this.orgInclude,
        }) as unknown as IOrganizationWithRelations;
    }

    async softDelete(id: string, deletedBy: string): Promise<IOrganizationWithRelations> {
        return this.prisma.organization.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
            include: this.orgInclude,
        }) as unknown as IOrganizationWithRelations;
    }

    async createMember(data: Prisma.OrganizationMemberCreateInput): Promise<IOrganizationMember> {
        return this.prisma.organizationMember.create({
            data,
            include: this.memberInclude,
        }) as unknown as IOrganizationMember;
    }

    async findMemberById(id: string): Promise<IOrganizationMember | null> {
        return this.prisma.organizationMember.findFirst({
            where: { id, is_deleted: false },
            include: this.memberInclude,
        }) as unknown as IOrganizationMember | null;
    }

    async findMemberByUserAndOrg(userId: string, orgId: string): Promise<IOrganizationMember | null> {
        return this.prisma.organizationMember.findFirst({
            where: { user_id: userId, organization_id: orgId, is_deleted: false },
            include: this.memberInclude,
        }) as unknown as IOrganizationMember | null;
    }

    async findMembersByOrgId(
        orgId: string,
        query: { limit?: number; offset?: number; is_accepted?: boolean },
    ): Promise<IPaginatedResponse<IOrganizationMember>> {
        const { limit = 10, offset = 0, is_accepted } = query;

        const where: Prisma.OrganizationMemberWhereInput = {
            organization_id: orgId,
            is_deleted: false,
            ...(is_accepted !== undefined && { is_accepted }),
        };

        const [items, total] = await Promise.all([
            this.prisma.organizationMember.findMany({
                where,
                include: this.memberInclude,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.organizationMember.count({ where }),
        ]);

        return {
            items: items as unknown as IOrganizationMember[],
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    async updateMember(id: string, data: Prisma.OrganizationMemberUpdateInput): Promise<IOrganizationMember> {
        return this.prisma.organizationMember.update({
            where: { id },
            data,
            include: this.memberInclude,
        }) as unknown as IOrganizationMember;
    }

    async softDeleteMember(id: string, deletedBy: string): Promise<void> {
        await this.prisma.organizationMember.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async assignMemberRoles(
        memberId: string,
        roleIds: string[],
        createdBy: string,
    ): Promise<void> {
        // Xóa roles cũ
        await this.prisma.organizationMemberRole.updateMany({
            where: { organization_member_id: memberId },
            data: { is_deleted: true, deleted_at: new Date() },
        });

        // Thêm roles mới
        if (roleIds.length > 0) {
            await this.prisma.organizationMemberRole.createMany({
                data: roleIds.map((roleId) => ({
                    organization_member_id: memberId,
                    organization_role_id: roleId,
                    is_active: true,
                })),
            });
        }
    }

    async assignMemberPermissions(
        memberId: string,
        permissionIds: string[],
        createdBy: string,
    ): Promise<void> {
        // Xóa permissions cũ
        await this.prisma.organizationMemberPermission.updateMany({
            where: { organization_member_id: memberId },
            data: { is_deleted: true, deleted_at: new Date() },
        });

        // Thêm permissions mới
        if (permissionIds.length > 0) {
            await this.prisma.organizationMemberPermission.createMany({
                data: permissionIds.map((permissionId) => ({
                    organization_member_id: memberId,
                    organization_permission_id: permissionId,
                    is_active: true,
                })),
            });
        }
    }

    async createRole(data: Prisma.OrganizationRoleCreateInput): Promise<IOrganizationRole> {
        return this.prisma.organizationRole.create({
            data,
            include: {
                permissions: {
                    where: { is_deleted: false },
                    include: { permission: { select: { id: true, name: true, key: true } } },
                },
            },
        }) as unknown as IOrganizationRole;
    }

    async findRoleById(id: string): Promise<IOrganizationRole | null> {
        return this.prisma.organizationRole.findFirst({
            where: { id, is_deleted: false },
            include: {
                permissions: {
                    where: { is_deleted: false },
                    include: { permission: { select: { id: true, name: true, key: true } } },
                },
            },
        }) as unknown as IOrganizationRole | null;
    }

    async findRolesByOrgId(orgId: string): Promise<IOrganizationRole[]> {
        return this.prisma.organizationRole.findMany({
            where: { organization_id: orgId, is_deleted: false },
            include: {
                permissions: {
                    where: { is_deleted: false },
                    include: { permission: { select: { id: true, name: true, key: true } } },
                },
            },
            orderBy: { created_at: 'desc' },
        }) as unknown as IOrganizationRole[];
    }

    async updateRole(id: string, data: Prisma.OrganizationRoleUpdateInput): Promise<IOrganizationRole> {
        return this.prisma.organizationRole.update({
            where: { id },
            data,
            include: {
                permissions: {
                    where: { is_deleted: false },
                    include: { permission: { select: { id: true, name: true, key: true } } },
                },
            },
        }) as unknown as IOrganizationRole;
    }

    async softDeleteRole(id: string): Promise<void> {
        await this.prisma.organizationRole.update({
            where: { id },
            data: { is_deleted: true, deleted_at: new Date() },
        });
    }

    async assignRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
        // Xóa permissions cũ
        await this.prisma.organizationRolePermission.updateMany({
            where: { organization_role_id: roleId },
            data: { is_deleted: true, deleted_at: new Date() },
        });

        // Thêm permissions mới
        if (permissionIds.length > 0) {
            await this.prisma.organizationRolePermission.createMany({
                data: permissionIds.map((permissionId) => ({
                    organization_role_id: roleId,
                    organization_permission_id: permissionId,
                    is_active: true,
                })),
            });
        }
    }

    async isRoleInUse(roleId: string): Promise<boolean> {
        const count = await this.prisma.organizationMemberRole.count({
            where: { organization_role_id: roleId, is_deleted: false },
        });
        return count > 0;
    }

    /**
     * Lấy tất cả organization-level permissions (shared)
     */
    async findAllOrganizationPermissions(): Promise<IOrganizationPermission[]> {
        return this.prisma.organizationPermission.findMany({
            where: { is_deleted: false, is_active: true },
            orderBy: { key: 'asc' },
        }) as unknown as IOrganizationPermission[];
    }

    async createApiKey(data: Prisma.ApiKeyCreateInput): Promise<IApiKey> {
        return this.prisma.apiKey.create({
            data,
            include: {
                roles: {
                    where: { is_deleted: false },
                    include: { role: { select: { id: true, name: true } } },
                },
                permissions: {
                    where: { is_deleted: false },
                    include: { permission: { select: { id: true, name: true, key: true } } },
                },
            },
        }) as unknown as IApiKey;
    }

    async findApiKeyById(id: string): Promise<IApiKey | null> {
        return this.prisma.apiKey.findFirst({
            where: { id, is_deleted: false },
            include: {
                roles: {
                    where: { is_deleted: false },
                    include: { role: { select: { id: true, name: true } } },
                },
                permissions: {
                    where: { is_deleted: false },
                    include: { permission: { select: { id: true, name: true, key: true } } },
                },
            },
        }) as unknown as IApiKey | null;
    }

    async findApiKeysByOrgId(orgId: string): Promise<IApiKey[]> {
        return this.prisma.apiKey.findMany({
            where: { organization_id: orgId, is_deleted: false },
            include: {
                roles: {
                    where: { is_deleted: false },
                    include: { role: { select: { id: true, name: true } } },
                },
                permissions: {
                    where: { is_deleted: false },
                    include: { permission: { select: { id: true, name: true, key: true } } },
                },
            },
            orderBy: { created_at: 'desc' },
        }) as unknown as IApiKey[];
    }

    async updateApiKey(id: string, data: Prisma.ApiKeyUpdateInput): Promise<IApiKey> {
        return this.prisma.apiKey.update({
            where: { id },
            data,
            include: {
                roles: {
                    where: { is_deleted: false },
                    include: { role: { select: { id: true, name: true } } },
                },
                permissions: {
                    where: { is_deleted: false },
                    include: { permission: { select: { id: true, name: true, key: true } } },
                },
            },
        }) as unknown as IApiKey;
    }

    async softDeleteApiKey(id: string, deletedBy: string): Promise<void> {
        await this.prisma.apiKey.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async assignApiKeyRoles(apiKeyId: string, roleIds: string[]): Promise<void> {
        // Xóa roles cũ
        await this.prisma.apiKeyRole.updateMany({
            where: { api_key_id: apiKeyId },
            data: { is_deleted: true, deleted_at: new Date() },
        });

        // Thêm roles mới
        if (roleIds.length > 0) {
            await this.prisma.apiKeyRole.createMany({
                data: roleIds.map((roleId) => ({
                    api_key_id: apiKeyId,
                    organization_role_id: roleId,
                    is_active: true,
                })),
            });
        }
    }

    async assignApiKeyPermissions(apiKeyId: string, permissionIds: string[]): Promise<void> {
        // Xóa permissions cũ
        await this.prisma.apiKeyPermission.updateMany({
            where: { api_key_id: apiKeyId },
            data: { is_deleted: true, deleted_at: new Date() },
        });

        // Thêm permissions mới
        if (permissionIds.length > 0) {
            await this.prisma.apiKeyPermission.createMany({
                data: permissionIds.map((permissionId) => ({
                    api_key_id: apiKeyId,
                    organization_permission_id: permissionId,
                    is_active: true,
                })),
            });
        }
    }

    async findUserById(userId: string) {
        return this.prisma.user.findFirst({
            where: { id: userId },
            select: { id: true, name: true, email: true },
        });
    }
}
