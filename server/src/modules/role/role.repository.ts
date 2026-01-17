import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, Prisma } from '@prisma/client';
import { IRoleListResult, IRoleWithPermissions } from './interfaces';
import { StatusFilter } from './dto';

interface FindManyParams {
    limit: number;
    offset: number;
    keywords?: string;
    status?: StatusFilter;
}

interface CreateRoleParams {
    name: string;
    description?: string;
    is_default?: boolean;
    permission_ids?: string[];
}

interface UpdateRoleParams {
    name?: string;
    description?: string;
    is_default?: boolean;
    is_active?: boolean;
    permission_ids?: string[];
}

@Injectable()
export class RoleRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lấy danh sách roles với phân trang
     */
    async findMany(params: FindManyParams): Promise<IRoleListResult> {
        const { limit, offset, keywords, status } = params;

        const where: Prisma.RoleWhereInput = {
            is_deleted: false,
        };

        if (status === StatusFilter.ACTIVE) {
            where.is_active = true;
        } else if (status === StatusFilter.INACTIVE) {
            where.is_active = false;
        }

        if (keywords) {
            where.OR = [
                { name: { contains: keywords, mode: 'insensitive' } },
                { description: { contains: keywords, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.prisma.role.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            this.prisma.role.count({ where }),
        ]);

        return { data, total, limit, offset };
    }

    /**
     * Lấy role theo ID
     */
    async findById(id: string): Promise<Role | null> {
        return this.prisma.role.findFirst({
            where: {
                id,
                is_deleted: false,
            },
        });
    }

    /**
     * Lấy role theo ID với permissions
     */
    async findByIdWithPermissions(id: string): Promise<IRoleWithPermissions | null> {
        const role = await this.prisma.role.findFirst({
            where: {
                id,
                is_deleted: false,
            },
            include: {
                permissions: {
                    where: {
                        is_active: true,
                        is_deleted: false,
                    },
                    include: {
                        permission: {
                            select: {
                                id: true,
                                key: true,
                                name: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        });

        if (!role) return null;

        return {
            ...role,
            permissions: role.permissions.map((rp) => rp.permission),
        };
    }

    /**
     * Tạo role mới
     */
    async create(data: CreateRoleParams): Promise<Role> {
        return this.prisma.role.create({
            data: {
                name: data.name,
                description: data.description,
                is_default: data.is_default ?? false,
            },
        });
    }

    /**
     * Cập nhật role
     */
    async update(id: string, data: UpdateRoleParams): Promise<Role> {
        return this.prisma.role.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                is_default: data.is_default,
                is_active: data.is_active,
            },
        });
    }

    /**
     * Soft delete role
     */
    async softDelete(id: string): Promise<void> {
        await this.prisma.$transaction([
            // Soft delete role
            this.prisma.role.update({
                where: { id },
                data: {
                    is_deleted: true,
                    is_active: false,
                    deleted_at: new Date(),
                },
            }),
            // Soft delete related RolePermissions
            this.prisma.rolePermission.updateMany({
                where: { role_id: id },
                data: {
                    is_deleted: true,
                    is_active: false,
                    deleted_at: new Date(),
                },
            }),
            // Soft delete related UserRoles
            this.prisma.userRole.updateMany({
                where: { role_id: id },
                data: {
                    is_deleted: true,
                    is_active: false,
                    deleted_at: new Date(),
                },
            }),
        ]);
    }

    /**
     * Soft delete nhiều roles
     */
    async softDeleteMany(ids: string[]): Promise<number> {
        const result = await this.prisma.$transaction([
            this.prisma.role.updateMany({
                where: { id: { in: ids } },
                data: {
                    is_deleted: true,
                    is_active: false,
                    deleted_at: new Date(),
                },
            }),
            this.prisma.rolePermission.updateMany({
                where: { role_id: { in: ids } },
                data: {
                    is_deleted: true,
                    is_active: false,
                    deleted_at: new Date(),
                },
            }),
            this.prisma.userRole.updateMany({
                where: { role_id: { in: ids } },
                data: {
                    is_deleted: true,
                    is_active: false,
                    deleted_at: new Date(),
                },
            }),
        ]);
        return result[0].count;
    }

    /**
     * Sync permissions cho role
     * Logic: thêm mới, giữ nguyên, soft delete, hoặc revert
     */
    async syncRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
        // Lấy tất cả RolePermissions hiện có (bao gồm đã deleted để revert)
        const existingMappings = await this.prisma.rolePermission.findMany({
            where: { role_id: roleId },
        });

        const existingMap = new Map(existingMappings.map((m) => [m.permission_id, m]));
        const newPermissionIdSet = new Set(permissionIds);

        const toCreate: string[] = [];
        const toRevert: string[] = [];
        const toSoftDelete: string[] = [];

        // Xác định cần thêm mới hoặc revert
        for (const permId of permissionIds) {
            const existing = existingMap.get(permId);
            if (!existing) {
                toCreate.push(permId);
            } else if (existing.is_deleted || !existing.is_active) {
                toRevert.push(existing.id);
            }
            // else: đã active và chưa delete -> giữ nguyên
        }

        // Xác định cần soft delete
        for (const [permId, mapping] of existingMap) {
            if (!newPermissionIdSet.has(permId) && !mapping.is_deleted && mapping.is_active) {
                toSoftDelete.push(mapping.id);
            }
        }

        // Thực hiện transaction
        await this.prisma.$transaction([
            // Tạo mới
            ...(toCreate.length > 0
                ? [
                    this.prisma.rolePermission.createMany({
                        data: toCreate.map((permId) => ({
                            role_id: roleId,
                            permission_id: permId,
                            is_active: true,
                            is_deleted: false,
                        })),
                        skipDuplicates: true,
                    }),
                ]
                : []),
            // Revert (set is_active = true, is_deleted = false)
            ...(toRevert.length > 0
                ? [
                    this.prisma.rolePermission.updateMany({
                        where: { id: { in: toRevert } },
                        data: {
                            is_active: true,
                            is_deleted: false,
                            deleted_at: null,
                        },
                    }),
                ]
                : []),
            // Soft delete
            ...(toSoftDelete.length > 0
                ? [
                    this.prisma.rolePermission.updateMany({
                        where: { id: { in: toSoftDelete } },
                        data: {
                            is_active: false,
                            is_deleted: true,
                            deleted_at: new Date(),
                        },
                    }),
                ]
                : []),
        ]);
    }

    /**
     * Sync roles cho user
     */
    async syncUserRoles(userId: string, roleIds: string[]): Promise<void> {
        const existingMappings = await this.prisma.userRole.findMany({
            where: { user_id: userId },
        });

        const existingMap = new Map(existingMappings.map((m) => [m.role_id, m]));
        const newRoleIdSet = new Set(roleIds);

        const toCreate: string[] = [];
        const toRevert: string[] = [];
        const toSoftDelete: string[] = [];

        for (const roleId of roleIds) {
            const existing = existingMap.get(roleId);
            if (!existing) {
                toCreate.push(roleId);
            } else if (existing.is_deleted || !existing.is_active) {
                toRevert.push(existing.id);
            }
        }

        for (const [roleId, mapping] of existingMap) {
            if (!newRoleIdSet.has(roleId) && !mapping.is_deleted && mapping.is_active) {
                toSoftDelete.push(mapping.id);
            }
        }

        await this.prisma.$transaction([
            ...(toCreate.length > 0
                ? [
                    this.prisma.userRole.createMany({
                        data: toCreate.map((roleId) => ({
                            user_id: userId,
                            role_id: roleId,
                            is_active: true,
                            is_deleted: false,
                        })),
                        skipDuplicates: true,
                    }),
                ]
                : []),
            ...(toRevert.length > 0
                ? [
                    this.prisma.userRole.updateMany({
                        where: { id: { in: toRevert } },
                        data: {
                            is_active: true,
                            is_deleted: false,
                            deleted_at: null,
                        },
                    }),
                ]
                : []),
            ...(toSoftDelete.length > 0
                ? [
                    this.prisma.userRole.updateMany({
                        where: { id: { in: toSoftDelete } },
                        data: {
                            is_active: false,
                            is_deleted: true,
                            deleted_at: new Date(),
                        },
                    }),
                ]
                : []),
        ]);
    }

    /**
     * Sync permissions trực tiếp cho user
     */
    async syncUserPermissions(userId: string, permissionIds: string[]): Promise<void> {
        const existingMappings = await this.prisma.userPermission.findMany({
            where: { user_id: userId },
        });

        const existingMap = new Map(existingMappings.map((m) => [m.permission_id, m]));
        const newPermissionIdSet = new Set(permissionIds);

        const toCreate: string[] = [];
        const toRevert: string[] = [];
        const toSoftDelete: string[] = [];

        for (const permId of permissionIds) {
            const existing = existingMap.get(permId);
            if (!existing) {
                toCreate.push(permId);
            } else if (existing.is_deleted || !existing.is_active) {
                toRevert.push(existing.id);
            }
        }

        for (const [permId, mapping] of existingMap) {
            if (!newPermissionIdSet.has(permId) && !mapping.is_deleted && mapping.is_active) {
                toSoftDelete.push(mapping.id);
            }
        }

        await this.prisma.$transaction([
            ...(toCreate.length > 0
                ? [
                    this.prisma.userPermission.createMany({
                        data: toCreate.map((permId) => ({
                            user_id: userId,
                            permission_id: permId,
                            is_active: true,
                            is_deleted: false,
                        })),
                        skipDuplicates: true,
                    }),
                ]
                : []),
            ...(toRevert.length > 0
                ? [
                    this.prisma.userPermission.updateMany({
                        where: { id: { in: toRevert } },
                        data: {
                            is_active: true,
                            is_deleted: false,
                            deleted_at: null,
                        },
                    }),
                ]
                : []),
            ...(toSoftDelete.length > 0
                ? [
                    this.prisma.userPermission.updateMany({
                        where: { id: { in: toSoftDelete } },
                        data: {
                            is_active: false,
                            is_deleted: true,
                            deleted_at: new Date(),
                        },
                    }),
                ]
                : []),
        ]);
    }

    /**
     * Lấy roles của user
     */
    async getUserRoles(userId: string) {
        const userRoles = await this.prisma.userRole.findMany({
            where: {
                user_id: userId,
                is_active: true,
                is_deleted: false,
            },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        is_active: true,
                    },
                },
            },
        });
        return userRoles.map((ur) => ur.role);
    }

    /**
     * Lấy permissions trực tiếp của user
     */
    async getUserDirectPermissions(userId: string) {
        const userPermissions = await this.prisma.userPermission.findMany({
            where: {
                user_id: userId,
                is_active: true,
                is_deleted: false,
            },
            include: {
                permission: {
                    select: {
                        id: true,
                        key: true,
                        name: true,
                        description: true,
                    },
                },
            },
        });
        return userPermissions.map((up) => ({
            ...up.permission,
            source: 'direct' as const,
        }));
    }

    /**
     * Lấy tất cả permissions của user (direct + từ roles)
     */
    async getUserAllPermissions(userId: string): Promise<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        source: 'direct' | 'role';
    }[]> {
        // Run both queries in parallel for better performance
        const [directPermissionsRaw, userRoles] = await Promise.all([
            this.prisma.userPermission.findMany({
                where: {
                    user_id: userId,
                    is_active: true,
                    is_deleted: false,
                },
                select: {
                    permission: {
                        select: {
                            id: true,
                            key: true,
                            name: true,
                            description: true,
                        },
                    },
                },
            }),
            this.prisma.userRole.findMany({
                where: {
                    user_id: userId,
                    is_active: true,
                    is_deleted: false,
                    role: {
                        is_active: true,
                        is_deleted: false,
                    },
                },
                select: {
                    role: {
                        select: {
                            permissions: {
                                where: {
                                    is_active: true,
                                    is_deleted: false,
                                },
                                select: {
                                    permission: {
                                        select: {
                                            id: true,
                                            key: true,
                                            name: true,
                                            description: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
        ]);

        const directPermissions = directPermissionsRaw.map((up) => ({
            ...up.permission,
            source: 'direct' as const,
        }));

        const rolePermissions = userRoles.flatMap((ur) =>
            ur.role.permissions.map((rp) => ({
                ...rp.permission,
                source: 'role' as const,
            })),
        );

        // Merge và loại bỏ trùng lặp (ưu tiên direct)
        type PermissionWithSource = {
            id: string;
            key: string;
            name: string;
            description: string | null;
            source: 'direct' | 'role';
        };
        const permMap = new Map<string, PermissionWithSource>();

        for (const perm of directPermissions) {
            permMap.set(perm.id, perm);
        }

        for (const perm of rolePermissions) {
            if (!permMap.has(perm.id)) {
                permMap.set(perm.id, perm);
            }
        }

        return Array.from(permMap.values());
    }
}
