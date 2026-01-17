import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, RefreshToken, UserWarning, Prisma } from '@prisma/client';
import {
    IUserListResult,
    IUserListItem,
    IUserDetail,
    IUserWarningItem,
    IUserWarningsResult,
    IUserSession,
    IUserSessionsResult,
} from './interfaces';

/**
 * Repository cho User Management
 * Cung cấp các phương thức quản lý user cho admin
 */
@Injectable()
export class UserManagementRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lấy danh sách users với phân trang
     */
    async findMany(params: {
        limit?: number;
        offset?: number;
        keywords?: string;
        status?: string;
    }): Promise<IUserListResult> {
        const { limit = 10, offset = 0, keywords, status } = params;

        const where: Prisma.UserWhereInput = {};

        if (keywords) {
            where.OR = [
                { name: { contains: keywords, mode: 'insensitive' } },
                { email: { contains: keywords, mode: 'insensitive' } },
            ];
        }

        if (status === 'active') {
            where.is_banned = false;
        } else if (status === 'banned') {
            where.is_banned = true;
        } else if (status === 'verified') {
            where.is_verified = true;
        } else if (status === 'unverified') {
            where.is_verified = false;
        }

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    email_confirmed: true,
                    is_verified: true,
                    is_banned: true,
                    banned_end: true,
                    is_online: true,
                    last_online: true,
                    created_at: true,
                    _count: {
                        select: {
                            warnings: {
                                where: { is_active: true, is_deleted: false },
                            },
                        },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        const items: IUserListItem[] = users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            email_confirmed: user.email_confirmed,
            is_verified: user.is_verified,
            is_banned: user.is_banned,
            banned_end: user.banned_end,
            is_online: user.is_online,
            last_online: user.last_online,
            created_at: user.created_at,
            warning_count: user._count.warnings,
        }));

        return { items, total, limit, offset };
    }

    /**
     * Lấy chi tiết user
     */
    async findById(id: string): Promise<IUserDetail | null> {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                warnings: {
                    where: { is_active: true, is_deleted: false },
                    include: {
                        category: {
                            select: { id: true, name: true, severity: true },
                        },
                    },
                    orderBy: { created_at: 'desc' },
                    take: 5,
                },
                system_roles: {
                    where: { is_active: true, is_deleted: false },
                    include: {
                        role: { select: { id: true, name: true } },
                    },
                },
            },
        });

        if (!user) return null;

        const warningCount = await this.prisma.userWarning.count({
            where: { user_id: id, is_active: true, is_deleted: false },
        });

        return {
            ...user,
            warning_count: warningCount,
            active_warnings: user.warnings.map((w) => ({
                id: w.id,
                reason: w.reason,
                is_permanent: w.is_permanent,
                expires_at: w.expires_at,
                is_active: w.is_active,
                created_at: w.created_at,
                removed_at: w.removed_at,
                warned_by: w.warned_by,
                removed_by: w.removed_by,
                category: w.category,
            })),
            roles: user.system_roles.map((r) => r.role),
        } as IUserDetail;
    }

    /**
     * Ban user
     */
    async banUser(
        id: string,
        bannedEnd: Date | null,
    ): Promise<User> {
        return this.prisma.user.update({
            where: { id },
            data: {
                is_banned: true,
                banned_start: new Date(),
                banned_end: bannedEnd,
            },
        });
    }

    /**
     * Unban user
     */
    async unbanUser(id: string): Promise<User> {
        return this.prisma.user.update({
            where: { id },
            data: {
                is_banned: false,
                banned_start: null,
                banned_end: null,
            },
        });
    }

    /**
     * Lấy danh sách warnings của user
     */
    async findUserWarnings(
        userId: string,
        params: { limit?: number; offset?: number; status?: string },
    ): Promise<IUserWarningsResult> {
        const { limit = 10, offset = 0, status } = params;

        const where: Prisma.UserWarningWhereInput = {
            user_id: userId,
            is_deleted: false,
        };

        if (status === 'active') {
            where.is_active = true;
            where.OR = [
                { is_permanent: true },
                { expires_at: { gt: new Date() } },
            ];
        } else if (status === 'removed') {
            where.is_active = false;
        } else if (status === 'expired') {
            where.is_active = true;
            where.is_permanent = false;
            where.expires_at = { lte: new Date() };
        }

        const [warnings, total] = await Promise.all([
            this.prisma.userWarning.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    category: {
                        select: { id: true, name: true, severity: true },
                    },
                },
            }),
            this.prisma.userWarning.count({ where }),
        ]);

        const items: IUserWarningItem[] = warnings.map((w) => ({
            id: w.id,
            reason: w.reason,
            is_permanent: w.is_permanent,
            expires_at: w.expires_at,
            is_active: w.is_active,
            created_at: w.created_at,
            removed_at: w.removed_at,
            warned_by: w.warned_by,
            removed_by: w.removed_by,
            category: w.category,
        }));

        return { items, total, limit, offset };
    }

    /**
     * Tạo warning cho user
     */
    async createWarning(data: {
        user_id: string;
        category_id: string;
        reason: string;
        is_permanent?: boolean;
        expires_at?: Date;
        warned_by: string;
    }): Promise<UserWarning> {
        return this.prisma.userWarning.create({
            data: {
                user_id: data.user_id,
                category_id: data.category_id,
                reason: data.reason,
                is_permanent: data.is_permanent ?? false,
                expires_at: data.expires_at,
                warned_by: data.warned_by,
            },
            include: {
                category: {
                    select: { id: true, name: true, severity: true },
                },
            },
        });
    }

    /**
     * Lấy warning theo ID
     */
    async findWarningById(id: string): Promise<UserWarning | null> {
        return this.prisma.userWarning.findFirst({
            where: { id, is_deleted: false },
            include: {
                category: {
                    select: { id: true, name: true, severity: true },
                },
            },
        });
    }

    /**
     * Gỡ warning
     */
    async removeWarning(id: string, removedBy: string): Promise<UserWarning> {
        return this.prisma.userWarning.update({
            where: { id },
            data: {
                is_active: false,
                removed_by: removedBy,
                removed_at: new Date(),
            },
        });
    }

    /**
     * Lấy danh sách sessions (refresh tokens) của user
     */
    async findUserSessions(
        userId: string,
        params: { limit?: number; offset?: number },
    ): Promise<IUserSessionsResult> {
        const { limit = 10, offset = 0 } = params;

        const where: Prisma.RefreshTokenWhereInput = {
            user_id: userId,
            is_deleted: false,
        };

        const [tokens, total] = await Promise.all([
            this.prisma.refreshToken.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    ip: true,
                    location: true,
                    device: true,
                    os: true,
                    created_at: true,
                    updated_at: true,
                },
            }),
            this.prisma.refreshToken.count({ where }),
        ]);

        return { items: tokens, total, limit, offset };
    }

    /**
     * Xóa session theo ID
     */
    async deleteSessionById(id: string, userId: string): Promise<boolean> {
        const result = await this.prisma.refreshToken.updateMany({
            where: { id, user_id: userId, is_deleted: false },
            data: { is_deleted: true, deleted_at: new Date() },
        });
        return result.count > 0;
    }

    /**
     * Xóa tất cả sessions của user
     */
    async deleteAllSessions(userId: string): Promise<number> {
        const result = await this.prisma.refreshToken.updateMany({
            where: { user_id: userId, is_deleted: false },
            data: { is_deleted: true, deleted_at: new Date() },
        });
        return result.count;
    }

    /**
     * Lấy số lượng warnings active của user
     */
    async countActiveWarnings(userId: string): Promise<number> {
        return this.prisma.userWarning.count({
            where: {
                user_id: userId,
                is_active: true,
                is_deleted: false,
                OR: [
                    { is_permanent: true },
                    { expires_at: { gt: new Date() } },
                ],
            },
        });
    }

    /**
     * Lấy thống kê users
     */
    async getStats(): Promise<{
        total: number;
        online: number;
        active: number;
        warned: number;
        banned: number;
    }> {
        const [total, online, banned, warnedUsers] = await Promise.all([
            // Total users
            this.prisma.user.count(),
            // Online users
            this.prisma.user.count({ where: { is_online: true } }),
            // Banned users
            this.prisma.user.count({ where: { is_banned: true } }),
            // Users with active warnings (need to count distinct users)
            this.prisma.userWarning.groupBy({
                by: ['user_id'],
                where: {
                    is_active: true,
                    is_deleted: false,
                    OR: [
                        { is_permanent: true },
                        { expires_at: { gt: new Date() } },
                    ],
                },
            }),
        ]);

        return {
            total,
            online,
            active: total - banned, // Active = not banned
            warned: warnedUsers.length, // Count of distinct users with warnings
            banned,
        };
    }

    /**
     * Ban nhiều users cùng lúc
     */
    async banManyUsers(
        userIds: string[],
        bannedEnd: Date | null,
    ): Promise<{ count: number }> {
        const result = await this.prisma.user.updateMany({
            where: {
                id: { in: userIds },
                is_banned: false, // Chỉ ban những user chưa bị ban
            },
            data: {
                is_banned: true,
                banned_start: new Date(),
                banned_end: bannedEnd,
            },
        });
        return { count: result.count };
    }

    /**
     * Unban nhiều users cùng lúc
     */
    async unbanManyUsers(userIds: string[]): Promise<{ count: number }> {
        const result = await this.prisma.user.updateMany({
            where: {
                id: { in: userIds },
                is_banned: true, // Chỉ unban những user đang bị ban
            },
            data: {
                is_banned: false,
                banned_start: null,
                banned_end: null,
            },
        });
        return { count: result.count };
    }

    /**
     * Xóa tất cả warnings active của một user
     */
    async clearAllWarnings(userId: string, removedBy: string): Promise<{ count: number }> {
        const result = await this.prisma.userWarning.updateMany({
            where: {
                user_id: userId,
                is_active: true,
                is_deleted: false,
            },
            data: {
                is_active: false,
                removed_by: removedBy,
                removed_at: new Date(),
            },
        });
        return { count: result.count };
    }

    /**
     * Xóa tất cả warnings của nhiều users
     */
    async clearAllWarningsForMany(
        userIds: string[],
        removedBy: string,
    ): Promise<{ count: number }> {
        const result = await this.prisma.userWarning.updateMany({
            where: {
                user_id: { in: userIds },
                is_active: true,
                is_deleted: false,
            },
            data: {
                is_active: false,
                removed_by: removedBy,
                removed_at: new Date(),
            },
        });
        return { count: result.count };
    }

    /**
     * Tạo warning cho nhiều users cùng lúc
     */
    async createWarningsForMany(data: {
        userIds: string[];
        category_id: string;
        reason: string;
        is_permanent?: boolean;
        expires_at?: Date;
        warned_by: string;
    }): Promise<{ count: number }> {
        const warningsData = data.userIds.map((userId) => ({
            user_id: userId,
            category_id: data.category_id,
            reason: data.reason,
            is_permanent: data.is_permanent ?? false,
            expires_at: data.expires_at,
            warned_by: data.warned_by,
        }));

        const result = await this.prisma.userWarning.createMany({
            data: warningsData,
        });

        return { count: result.count };
    }

    /**
     * Lấy danh sách users theo IDs
     */
    async findManyByIds(ids: string[]): Promise<{ id: string; name: string; email: string | null }[]> {
        return this.prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, email: true },
        });
    }

    /**
     * Kiểm tra xem user có quyền superadmin.bypass hay không
     * User có quyền này được bảo vệ khỏi các hành động quản lý
     */
    async hasProtectedPermission(userId: string): Promise<boolean> {
        // Kiểm tra quyền trực tiếp
        const directPermission = await this.prisma.userPermission.findFirst({
            where: {
                user_id: userId,
                is_active: true,
                is_deleted: false,
                permission: {
                    key: 'superadmin.bypass',
                    is_active: true,
                    is_deleted: false,
                },
            },
        });

        if (directPermission) return true;

        // Kiểm tra quyền từ role
        const rolePermission = await this.prisma.userRole.findFirst({
            where: {
                user_id: userId,
                is_active: true,
                is_deleted: false,
                role: {
                    is_active: true,
                    is_deleted: false,
                    permissions: {
                        some: {
                            is_active: true,
                            is_deleted: false,
                            permission: {
                                key: 'superadmin.bypass',
                                is_active: true,
                                is_deleted: false,
                            },
                        },
                    },
                },
            },
        });

        return !!rolePermission;
    }
}
