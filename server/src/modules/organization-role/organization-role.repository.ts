import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IOrganizationRole, IOrganizationPermission } from '../organization/interfaces';

@Injectable()
export class OrganizationRoleRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.OrganizationRoleCreateInput): Promise<IOrganizationRole> {
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

    async findById(id: string): Promise<IOrganizationRole | null> {
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

    async findByOrgId(orgId: string): Promise<IOrganizationRole[]> {
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

    async update(id: string, data: Prisma.OrganizationRoleUpdateInput): Promise<IOrganizationRole> {
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

    async softDelete(id: string): Promise<void> {
        await this.prisma.organizationRole.update({
            where: { id },
            data: { is_deleted: true, deleted_at: new Date() },
        });
    }

    async softDeleteMany(ids: string[]): Promise<void> {
        await this.prisma.organizationRole.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
            },
        });
    }

    async findByIds(ids: string[]): Promise<IOrganizationRole[]> {
        return this.prisma.organizationRole.findMany({
            where: { id: { in: ids }, is_deleted: false },
            include: {
                permissions: {
                    where: { is_deleted: false },
                    include: { permission: { select: { id: true, name: true, key: true } } },
                },
            },
        }) as unknown as IOrganizationRole[];
    }

    async assignPermissions(roleId: string, permissionIds: string[]): Promise<void> {
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

    async updateMemberRolesStatusByRoleId(roleId: string, isActive: boolean): Promise<void> {
        await this.prisma.organizationMemberRole.updateMany({
            where: { organization_role_id: roleId, is_deleted: false },
            data: { is_active: isActive, updated_at: new Date() },
        });
    }

    async updateApiKeyRolesStatusByRoleId(roleId: string, isActive: boolean): Promise<void> {
        await this.prisma.apiKeyRole.updateMany({
            where: { organization_role_id: roleId, is_deleted: false },
            data: { is_active: isActive, updated_at: new Date() },
        });
    }

    async findAllOrganizationPermissions(): Promise<IOrganizationPermission[]> {
        return this.prisma.organizationPermission.findMany({
            where: { is_deleted: false, is_active: true },
            orderBy: { key: 'asc' },
        }) as unknown as IOrganizationPermission[];
    }

    async softDeleteMemberRolesByRoleId(roleId: string): Promise<void> {
        await this.prisma.organizationMemberRole.updateMany({
            where: { organization_role_id: roleId, is_deleted: false },
            data: { is_deleted: true, deleted_at: new Date() },
        });
    }

    async softDeleteApiKeyRolesByRoleId(roleId: string): Promise<void> {
        await this.prisma.apiKeyRole.updateMany({
            where: { organization_role_id: roleId, is_deleted: false },
            data: { is_deleted: true, deleted_at: new Date() },
        });
    }
}
