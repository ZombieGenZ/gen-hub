import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    accountProfileSelect,
    accountBasicSelect,
    accountPasswordSelect,
    accountDeleteSelect,
} from './selects/account.select';

/**
 * Account Repository
 * Xử lý database operations cho Account module
 * Tách biệt data access layer khỏi business logic
 */
@Injectable()
export class AccountRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lấy user profile với roles và permissions
     * Sử dụng cho getProfile endpoint
     */
    async getUserWithRolesAndPermissions(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                ...accountProfileSelect,
                system_roles: {
                    where: { is_deleted: false, is_active: true },
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                permissions: {
                                    where: { is_deleted: false, is_active: true },
                                    include: {
                                        permission: {
                                            select: {
                                                id: true,
                                                name: true,
                                                key: true,
                                                description: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                system_permissions: {
                    where: { is_deleted: false, is_active: true },
                    include: {
                        permission: {
                            select: {
                                id: true,
                                name: true,
                                key: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Lấy user cơ bản theo ID
     * Sử dụng cho updateProfile check
     */
    async findById(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: accountBasicSelect,
        });
    }

    /**
     * Lấy user với password để verify
     * Sử dụng cho changePassword endpoint
     */
    async findByIdWithPassword(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: accountPasswordSelect,
        });
    }

    /**
     * Lấy user cho delete check
     */
    async findByIdForDelete(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: accountDeleteSelect,
        });
    }

    /**
     * Update profile
     * @returns Updated user với basic select fields
     */
    async updateProfile(
        userId: string,
        data: { name?: string; language?: string },
    ) {
        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: accountBasicSelect,
        });
    }

    /**
     * Update password
     */
    async updatePassword(userId: string, hashedPassword: string) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
            select: { id: true },
        });
    }

    /**
     * Soft delete user
     */
    async softDelete(userId: string, deletedBy: string) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
            select: { id: true },
        });
    }

    /**
     * Lấy toàn bộ dữ liệu của user để export
     * Sử dụng cho downloadPersonalData endpoint
     */
    async getUserFullDataForExport(userId: string) {
        // Lấy thông tin cơ bản của user
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                email_confirmed: true,
                language: true,
                is_verified: true,
                two_factor_enabled: true,
                is_banned: true,
                banned_start: true,
                banned_end: true,
                is_online: true,
                last_online: true,
                created_at: true,
                updated_at: true,
            },
        });

        if (!user) return null;

        // Query từng phần song song để tối ưu performance
        const [
            userRoles,
            userPermissions,
            ownedOrgs,
            memberships,
            notifications,
            warnings,
            sessions,
        ] = await Promise.all([
            // User roles
            this.prisma.userRole.findMany({
                where: { user_id: userId, is_deleted: false, is_active: true },
                include: {
                    role: { select: { id: true, name: true, description: true } },
                },
            }),
            // User permissions
            this.prisma.userPermission.findMany({
                where: { user_id: userId, is_deleted: false, is_active: true },
                include: {
                    permission: {
                        select: { id: true, name: true, key: true, description: true },
                    },
                },
            }),
            // Owned organizations
            this.prisma.organization.findMany({
                where: { owner_id: userId, is_deleted: false },
                select: { id: true, name: true, created_at: true },
            }),
            // Organization memberships
            this.prisma.organizationMember.findMany({
                where: { user_id: userId, is_deleted: false },
                include: { organization: { select: { id: true, name: true } } },
            }),
            // Notifications (last 100)
            this.prisma.userNotification.findMany({
                where: { user_id: userId, is_deleted: false },
                orderBy: { created_at: 'desc' },
                take: 100,
                select: {
                    id: true,
                    title: true,
                    content: true,
                    is_read: true,
                    created_at: true,
                },
            }),
            // Warnings
            this.prisma.userWarning.findMany({
                where: { user_id: userId, is_deleted: false },
                include: { category: { select: { id: true, name: true } } },
            }),
            // Sessions (refresh tokens)
            this.prisma.refreshToken.findMany({
                where: { user_id: userId, is_deleted: false },
                select: {
                    id: true,
                    ip: true,
                    location: true,
                    device: true,
                    os: true,
                    created_at: true,
                },
            }),
        ]);

        // Format dữ liệu để export
        return {
            personal_info: {
                id: user.id,
                name: user.name,
                email: user.email,
                email_confirmed: user.email_confirmed,
                language: user.language,
                is_verified: user.is_verified,
                two_factor_enabled: user.two_factor_enabled,
                created_at: user.created_at,
                updated_at: user.updated_at,
            },
            account_status: {
                is_banned: user.is_banned,
                banned_start: user.banned_start,
                banned_end: user.banned_end,
                is_online: user.is_online,
                last_online: user.last_online,
            },
            system_roles: userRoles.map((ur) => ({
                id: ur.role.id,
                name: ur.role.name,
                description: ur.role.description,
                assigned_at: ur.created_at,
            })),
            system_permissions: userPermissions.map((up) => ({
                id: up.permission.id,
                name: up.permission.name,
                key: up.permission.key,
                description: up.permission.description,
                assigned_at: up.created_at,
            })),
            organizations: {
                owned: ownedOrgs,
                memberships: memberships.map((om) => ({
                    organization: om.organization,
                    display_name: om.display_name,
                    is_accepted: om.is_accepted,
                    joined_at: om.created_at,
                })),
            },
            notifications,
            warnings: warnings.map((w) => ({
                id: w.id,
                category: w.category,
                reason: w.reason,
                is_permanent: w.is_permanent,
                expires_at: w.expires_at,
                is_active: w.is_active,
                created_at: w.created_at,
            })),
            sessions,
            export_info: {
                exported_at: new Date().toISOString(),
                data_version: '1.0',
            },
        };
    }
}
