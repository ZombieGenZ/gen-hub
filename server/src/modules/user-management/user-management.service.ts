import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { UserManagementRepository } from './user-management.repository';
import { WarningCategoryRepository } from '../warning-category/warning-category.repository';
import { BanSchedulerService } from '../ban-scheduler/ban-scheduler.service';
import { WarnSchedulerService } from '../warn-scheduler/warn-scheduler.service';
import { RedisService } from '../redis/redis.service';
import { SystemLogService } from '../system-log/system-log.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { RoleRepository } from '../role/role.repository';
import {
    QueryUsersDto,
    BanUserDto,
    UnbanUserDto,
    WarnUserDto,
    UnwarnUserDto,
    QueryUserWarningsDto,
    QuerySessionsDto,
    AssignUserRolesPermissionsDto,
} from './dto';
import {
    IUserListResult,
    IUserDetail,
    IUserWarningsResult,
    IUserSessionsResult,
    IUserRolesAndPermissions,
} from './interfaces';

const CACHE_KEY_PREFIX = 'user_management';
const CACHE_LIST_KEY = `${CACHE_KEY_PREFIX}:list`;

@Injectable()
export class UserManagementService {
    constructor(
        private readonly repository: UserManagementRepository,
        private readonly warningCategoryRepo: WarningCategoryRepository,
        private readonly banSchedulerService: BanSchedulerService,
        private readonly warnSchedulerService: WarnSchedulerService,
        private readonly roleRepository: RoleRepository,
        private readonly redisService: RedisService,
        private readonly systemLogService: SystemLogService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly i18n: I18nService,
    ) { }

    private getListCacheTtl(): number {
        return parseInt(process.env.REDIS_USER_LIST_TTL || '120', 10);
    }

    private getDetailCacheTtl(): number {
        return parseInt(process.env.REDIS_USER_DETAIL_TTL || '300', 10);
    }

    private getWarningsCacheTtl(): number {
        return parseInt(process.env.REDIS_USER_WARNINGS_TTL || '300', 10);
    }

    private getSessionsCacheTtl(): number {
        return parseInt(process.env.REDIS_USER_SESSIONS_TTL || '120', 10);
    }

    /**
     * Kiểm tra xem có thể thực hiện hành động lên user hay không
     * - Không thể thao tác lên chính mình
     * - Không thể thao tác lên user có quyền superadmin.bypass
     */
    private async validateUserAction(
        targetUserId: string,
        adminId: string,
        lang: string,
    ): Promise<void> {
        // Không cho phép thao tác lên chính mình
        if (targetUserId === adminId) {
            throw new BadRequestException(
                this.i18n.t('user-management.error.cannot_action_self', { lang })
            );
        }

        // Kiểm tra xem target user có được bảo vệ không
        const isProtected = await this.repository.hasProtectedPermission(targetUserId);
        if (isProtected) {
            throw new BadRequestException(
                this.i18n.t('user-management.error.protected_user', { lang })
            );
        }
    }

    /**
     * Lấy danh sách users với phân trang
     */
    async findMany(query: QueryUsersDto, lang: string): Promise<IUserListResult> {
        const cacheKey = `${CACHE_LIST_KEY}:${JSON.stringify(query)}`;

        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const result = await this.repository.findMany({
            limit: query.limit ? Number(query.limit) : 10,
            offset: query.offset ? Number(query.offset) : 0,
            keywords: query.keywords,
            status: query.status,
        });

        await this.redisService.set(cacheKey, JSON.stringify(result), this.getListCacheTtl());
        return result;
    }

    /**
     * Lấy chi tiết user
     */
    async findById(id: string, lang: string): Promise<IUserDetail> {
        const cacheKey = `${CACHE_KEY_PREFIX}:${id}`;

        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const user = await this.repository.findById(id);
        if (!user) {
            throw new NotFoundException(this.i18n.t('user-management.error.user_not_found', { lang }));
        }

        await this.redisService.set(cacheKey, JSON.stringify(user), this.getDetailCacheTtl());
        return user;
    }

    /**
     * Ban user
     */
    async banUser(
        userId: string,
        dto: BanUserDto,
        adminId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<IUserDetail> {
        // Kiểm tra quyền thao tác lên user
        await this.validateUserAction(userId, adminId, lang);

        const user = await this.repository.findById(userId);
        if (!user) {
            throw new NotFoundException(this.i18n.t('user-management.error.user_not_found', { lang }));
        }

        if (user.is_banned) {
            throw new BadRequestException(this.i18n.t('user-management.error.already_banned', { lang }));
        }

        let bannedEnd: Date | null = null;
        if (!dto.is_permanent && dto.banned_end) {
            bannedEnd = new Date(dto.banned_end);
        }

        await this.repository.banUser(userId, bannedEnd);

        // Lên lịch unban nếu có thời hạn
        if (bannedEnd) {
            this.banSchedulerService.scheduleUnban(userId, bannedEnd, user.email || user.name);
        }

        // Invalidate caches
        await this.invalidateUserCache(userId);
        await this.invalidateListCache();

        // Log
        this.systemLogService.logAsync({
            level: 'WARN',
            module: 'user-management',
            action: 'ban',
            message: `Ban user: ${user.email || user.name}`,
            userId: adminId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: {
                targetUserId: userId,
                reason: dto.reason,
                is_permanent: dto.is_permanent,
                banned_end: bannedEnd?.toISOString(),
            },
        });

        // Emit realtime events
        // Emit realtime events
        this.websocketGateway.emitUserBanned(
            userId,
            dto.reason,
            dto.is_permanent || false,
            bannedEnd?.toISOString() || null,
            adminId,
        );

        return this.repository.findById(userId) as Promise<IUserDetail>;
    }

    /**
     * Unban user
     */
    async unbanUser(
        userId: string,
        dto: UnbanUserDto,
        adminId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<IUserDetail> {
        // Kiểm tra quyền thao tác lên user
        await this.validateUserAction(userId, adminId, lang);

        const user = await this.repository.findById(userId);
        if (!user) {
            throw new NotFoundException(this.i18n.t('user-management.error.user_not_found', { lang }));
        }

        if (!user.is_banned) {
            throw new BadRequestException(this.i18n.t('user-management.error.not_banned', { lang }));
        }

        await this.repository.unbanUser(userId);

        // Hủy lịch unban nếu có
        this.banSchedulerService.cancelScheduledUnban(userId);

        // Invalidate caches
        await this.invalidateUserCache(userId);
        await this.invalidateListCache();
        await this.redisService.invalidateUserCache(userId);

        // Log
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'user-management',
            action: 'unban',
            message: `Unban user: ${user.email || user.name}`,
            userId: adminId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: {
                targetUserId: userId,
                note: dto.note,
            },
        });

        // Emit realtime events
        // Emit realtime events
        this.websocketGateway.emitUserUnbanned(userId, adminId);

        return this.repository.findById(userId) as Promise<IUserDetail>;
    }

    /**
     * Lấy danh sách warnings của user
     */
    async findUserWarnings(
        userId: string,
        query: QueryUserWarningsDto,
        lang: string,
    ): Promise<IUserWarningsResult> {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new NotFoundException(this.i18n.t('user-management.error.user_not_found', { lang }));
        }

        const cacheKey = `${CACHE_KEY_PREFIX}:${userId}:warnings:${JSON.stringify(query)}`;

        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const result = await this.repository.findUserWarnings(userId, {
            limit: query.limit ? Number(query.limit) : 10,
            offset: query.offset ? Number(query.offset) : 0,
            status: query.status,
        });

        await this.redisService.set(cacheKey, JSON.stringify(result), this.getWarningsCacheTtl());
        return result;
    }

    /**
     * Cảnh báo user
     */
    async warnUser(
        userId: string,
        dto: WarnUserDto,
        adminId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ) {
        // Kiểm tra quyền thao tác lên user
        await this.validateUserAction(userId, adminId, lang);

        const user = await this.repository.findById(userId);
        if (!user) {
            throw new NotFoundException(this.i18n.t('user-management.error.user_not_found', { lang }));
        }

        const category = await this.warningCategoryRepo.findById(dto.category_id);
        if (!category) {
            throw new NotFoundException(this.i18n.t('warning-category.error.not_found', { lang }));
        }

        let expiresAt: Date | undefined;
        if (!dto.is_permanent && dto.expires_at) {
            expiresAt = new Date(dto.expires_at);
        }

        const warning = await this.repository.createWarning({
            user_id: userId,
            category_id: dto.category_id,
            reason: dto.reason,
            is_permanent: dto.is_permanent,
            expires_at: expiresAt,
            warned_by: adminId,
        });

        // Invalidate caches
        await this.invalidateUserWarningsCache(userId);
        await this.invalidateUserCache(userId);
        await this.invalidateListCache();

        // Log
        this.systemLogService.logAsync({
            level: 'WARN',
            module: 'user-management',
            action: 'warn',
            message: `Cảnh báo user: ${user.email || user.name}`,
            userId: adminId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: {
                targetUserId: userId,
                warningId: warning.id,
                categoryId: dto.category_id,
                categoryName: category.name,
                reason: dto.reason,
                is_permanent: dto.is_permanent,
                expires_at: expiresAt?.toISOString(),
            },
        });

        // Emit realtime events
        this.websocketGateway.emitUserWarned(
            userId,
            warning.id,
            dto.reason,
            expiresAt?.toISOString() || null,
            adminId,
        );

        // Lên lịch gỡ warn nếu có thời hạn
        if (expiresAt && !dto.is_permanent) {
            this.warnSchedulerService.scheduleRemoveWarning(warning.id, expiresAt, user.email || user.name);
        }

        // Kiểm tra và áp dụng ban nếu đạt ngưỡng warn
        const penaltyResult = await this.warnSchedulerService.checkAndApplyPenalty(userId);
        if (penaltyResult.banned) {
            // Log thêm về việc user bị ban tự động
            this.systemLogService.logAsync({
                level: 'WARN',
                module: 'user-management',
                action: 'auto_ban_from_warn',
                message: `User ${user.email || user.name} bị ban tự động do đạt ngưỡng cảnh báo`,
                userId: 'system',
                metaData: {
                    targetUserId: userId,
                    isPermanent: penaltyResult.isPermanent,
                    bannedEnd: penaltyResult.bannedEnd?.toISOString(),
                },
            });
        }

        return warning;
    }

    /**
     * Gỡ cảnh báo
     */
    async unwarnUser(
        userId: string,
        warningId: string,
        dto: UnwarnUserDto,
        adminId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ) {
        // Kiểm tra quyền thao tác lên user
        await this.validateUserAction(userId, adminId, lang);

        const user = await this.repository.findById(userId);
        if (!user) {
            throw new NotFoundException(this.i18n.t('user-management.error.user_not_found', { lang }));
        }

        const warning = await this.repository.findWarningById(warningId);
        if (!warning || warning.user_id !== userId) {
            throw new NotFoundException(this.i18n.t('user-management.error.warning_not_found', { lang }));
        }

        if (!warning.is_active) {
            throw new BadRequestException(this.i18n.t('user-management.error.warning_already_removed', { lang }));
        }

        await this.repository.removeWarning(warningId, adminId);

        // Invalidate caches
        await this.invalidateUserWarningsCache(userId);
        await this.invalidateUserCache(userId);
        await this.invalidateListCache();

        // Log
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'user-management',
            action: 'unwarn',
            message: `Gỡ cảnh báo user: ${user.email || user.name}`,
            userId: adminId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: {
                targetUserId: userId,
                warningId,
                note: dto.note,
            },
        });

        // Emit realtime events
        // Emit realtime events
        this.websocketGateway.emitUserUnwarned(userId, warningId, adminId);

        return { success: true };
    }

    /**
     * Lấy danh sách sessions của user
     */
    async findUserSessions(
        userId: string,
        query: QuerySessionsDto,
        lang: string,
    ): Promise<IUserSessionsResult> {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new NotFoundException(this.i18n.t('user-management.error.user_not_found', { lang }));
        }

        const cacheKey = `${CACHE_KEY_PREFIX}:${userId}:sessions:${JSON.stringify(query)}`;

        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const result = await this.repository.findUserSessions(userId, {
            limit: query.limit ? Number(query.limit) : 10,
            offset: query.offset ? Number(query.offset) : 0,
        });

        await this.redisService.set(cacheKey, JSON.stringify(result), this.getSessionsCacheTtl());
        return result;
    }

    /**
     * Đăng xuất một session
     */
    async revokeSession(
        userId: string,
        sessionId: string,
        adminId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ) {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new NotFoundException(this.i18n.t('user-management.error.user_not_found', { lang }));
        }

        const deleted = await this.repository.deleteSessionById(sessionId, userId);
        if (!deleted) {
            throw new NotFoundException(this.i18n.t('user-management.error.session_not_found', { lang }));
        }

        // Invalidate caches
        await this.invalidateUserSessionsCache(userId);

        // Log
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'user-management',
            action: 'revoke_session',
            message: `Đăng xuất session của user: ${user.email || user.name}`,
            userId: adminId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: {
                targetUserId: userId,
                sessionId,
            },
        });

        // Emit to user để force logout
        // Emit to user để force logout
        this.websocketGateway.emitUserSessionRevoked(userId, sessionId, adminId);

        return { success: true };
    }

    /**
     * Đăng xuất tất cả sessions
     */
    async revokeAllSessions(
        userId: string,
        adminId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ) {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new NotFoundException(this.i18n.t('user-management.error.user_not_found', { lang }));
        }

        const count = await this.repository.deleteAllSessions(userId);

        // Invalidate caches
        await this.invalidateUserSessionsCache(userId);
        await this.redisService.invalidateUserCache(userId);

        // Log
        this.systemLogService.logAsync({
            level: 'WARN',
            module: 'user-management',
            action: 'revoke_all_sessions',
            message: `Đăng xuất tất cả sessions của user: ${user.email || user.name}`,
            userId: adminId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: {
                targetUserId: userId,
                sessionCount: count,
            },
        });

        // Emit to user để force logout
        // Emit to user để force logout
        this.websocketGateway.emitAllUserSessionsRevoked(userId, adminId);

        return { success: true, count };
    }

    // Cache invalidation helpers
    private async invalidateUserCache(userId: string): Promise<void> {
        await this.redisService.del(`${CACHE_KEY_PREFIX}:${userId}`);
    }

    private async invalidateListCache(): Promise<void> {
        await this.redisService.delByPattern(`${CACHE_LIST_KEY}:*`);
    }

    private async invalidateUserWarningsCache(userId: string): Promise<void> {
        await this.redisService.delByPattern(`${CACHE_KEY_PREFIX}:${userId}:warnings:*`);
    }

    private async invalidateUserSessionsCache(userId: string): Promise<void> {
        await this.redisService.delByPattern(`${CACHE_KEY_PREFIX}:${userId}:sessions:*`);
    }

    /**
     * Lấy roles và permissions của user
     */
    async getUserRolesAndPermissions(
        userId: string,
        lang: string,
    ): Promise<IUserRolesAndPermissions> {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new NotFoundException(this.i18n.t('user-management.error.user_not_found', { lang }));
        }

        const [roles, permissions] = await Promise.all([
            this.roleRepository.getUserRoles(userId),
            this.roleRepository.getUserAllPermissions(userId),
        ]);

        return { roles, permissions };
    }

    /**
     * Gán roles và permissions cho user (gộp 2 operations vào 1)
     */
    async assignUserRolesPermissions(
        userId: string,
        dto: AssignUserRolesPermissionsDto,
        adminId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<IUserRolesAndPermissions> {
        // Kiểm tra quyền thao tác lên user
        await this.validateUserAction(userId, adminId, lang);

        const user = await this.repository.findById(userId);
        if (!user) {
            throw new NotFoundException(this.i18n.t('user-management.error.user_not_found', { lang }));
        }

        // Sync roles nếu có
        if (dto.role_ids !== undefined) {
            await this.roleRepository.syncUserRoles(userId, dto.role_ids);
        }

        // Sync permissions trực tiếp nếu có
        if (dto.permission_ids !== undefined) {
            await this.roleRepository.syncUserPermissions(userId, dto.permission_ids);
        }

        // Invalidate user caches
        await this.invalidateUserCache(userId);
        await this.redisService.invalidateUserCache(userId);
        await this.redisService.invalidateUserPermissionsCache(userId);

        // Log
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'user-management',
            action: 'assign_roles_permissions',
            message: `Gán roles/permissions cho user: ${user.email || user.name}`,
            userId: adminId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: {
                targetUserId: userId,
                roleIds: dto.role_ids,
                permissionIds: dto.permission_ids,
            },
        });

        // Emit socket events
        if (dto.role_ids !== undefined) {
            this.websocketGateway.emitUserRolesUpdated(userId, dto.role_ids, adminId);
        }
        if (dto.permission_ids !== undefined) {
            this.websocketGateway.emitUserPermissionsUpdated(userId, dto.permission_ids, adminId);
        }

        // Trả về kết quả mới
        return this.getUserRolesAndPermissions(userId, lang);
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
        const cacheKey = `${CACHE_KEY_PREFIX}:stats`;

        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const stats = await this.repository.getStats();

        // Cache for 30 seconds
        await this.redisService.set(cacheKey, JSON.stringify(stats), 30);
        return stats;
    }

    /**
     * Bulk ban users
     */
    async bulkBanUsers(
        userIds: string[],
        reason: string,
        isPermanent: boolean,
        bannedEnd: Date | null,
        adminId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<{ count: number }> {
        if (userIds.length === 0) {
            throw new BadRequestException(this.i18n.t('user-management.error.no_users_selected', { lang }));
        }

        const result = await this.repository.banManyUsers(userIds, bannedEnd);

        // Schedule unbans if not permanent
        if (bannedEnd) {
            const users = await this.repository.findManyByIds(userIds);
            for (const user of users) {
                this.banSchedulerService.scheduleUnban(user.id, bannedEnd, user.email || user.name);
            }
        }

        // Invalidate caches
        await this.invalidateListCache();
        for (const userId of userIds) {
            await this.invalidateUserCache(userId);
        }

        // Log
        this.systemLogService.logAsync({
            level: 'WARN',
            module: 'user-management',
            action: 'bulk_ban',
            message: `Bulk ban ${result.count} users`,
            userId: adminId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: {
                targetUserIds: userIds,
                reason,
                is_permanent: isPermanent,
                banned_end: bannedEnd?.toISOString(),
            },
        });

        // Emit realtime events
        for (const userId of userIds) {
            this.websocketGateway.emitUserBanned(
                userId,
                reason,
                isPermanent,
                bannedEnd?.toISOString() || null,
                adminId,
            );
        }

        return result;
    }

    /**
     * Bulk unban users
     */
    async bulkUnbanUsers(
        userIds: string[],
        note: string | undefined,
        adminId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<{ count: number }> {
        if (userIds.length === 0) {
            throw new BadRequestException(this.i18n.t('user-management.error.no_users_selected', { lang }));
        }

        const result = await this.repository.unbanManyUsers(userIds);

        // Cancel scheduled unbans
        for (const userId of userIds) {
            this.banSchedulerService.cancelScheduledUnban(userId);
        }

        // Invalidate caches
        await this.invalidateListCache();
        for (const userId of userIds) {
            await this.invalidateUserCache(userId);
            await this.redisService.invalidateUserCache(userId);
        }

        // Log
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'user-management',
            action: 'bulk_unban',
            message: `Bulk unban ${result.count} users`,
            userId: adminId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: {
                targetUserIds: userIds,
                note,
            },
        });

        // Emit realtime events
        for (const userId of userIds) {
            this.websocketGateway.emitUserUnbanned(userId, adminId);
        }

        return result;
    }

    /**
     * Bulk warn users
     */
    async bulkWarnUsers(
        userIds: string[],
        categoryId: string,
        reason: string,
        isPermanent: boolean,
        expiresAt: Date | undefined,
        adminId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<{ count: number }> {
        if (userIds.length === 0) {
            throw new BadRequestException(this.i18n.t('user-management.error.no_users_selected', { lang }));
        }

        const category = await this.warningCategoryRepo.findById(categoryId);
        if (!category) {
            throw new NotFoundException(this.i18n.t('warning-category.error.not_found', { lang }));
        }

        const result = await this.repository.createWarningsForMany({
            userIds,
            category_id: categoryId,
            reason,
            is_permanent: isPermanent,
            expires_at: expiresAt,
            warned_by: adminId,
        });

        // Invalidate caches
        await this.invalidateListCache();
        for (const userId of userIds) {
            await this.invalidateUserWarningsCache(userId);
            await this.invalidateUserCache(userId);
        }

        // Log
        this.systemLogService.logAsync({
            level: 'WARN',
            module: 'user-management',
            action: 'bulk_warn',
            message: `Bulk warn ${result.count} users`,
            userId: adminId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: {
                targetUserIds: userIds,
                categoryId,
                categoryName: category.name,
                reason,
                is_permanent: isPermanent,
                expires_at: expiresAt?.toISOString(),
            },
        });

        // Check and apply penalty for each user
        for (const userId of userIds) {
            const penaltyResult = await this.warnSchedulerService.checkAndApplyPenalty(userId);
            if (penaltyResult.banned) {
                const users = await this.repository.findManyByIds([userId]);
                if (users.length > 0) {
                    this.systemLogService.logAsync({
                        level: 'WARN',
                        module: 'user-management',
                        action: 'auto_ban_from_warn',
                        message: `User ${users[0].email || users[0].name} bị ban tự động do đạt ngưỡng cảnh báo`,
                        userId: 'system',
                        metaData: {
                            targetUserId: userId,
                            isPermanent: penaltyResult.isPermanent,
                            bannedEnd: penaltyResult.bannedEnd?.toISOString(),
                        },
                    });
                }
            }
        }

        return result;
    }

    /**
     * Clear all warnings for a user
     */
    async clearAllWarnings(
        userId: string,
        note: string | undefined,
        adminId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<{ count: number }> {
        // Kiểm tra quyền thao tác lên user
        await this.validateUserAction(userId, adminId, lang);

        const user = await this.repository.findById(userId);
        if (!user) {
            throw new NotFoundException(this.i18n.t('user-management.error.user_not_found', { lang }));
        }

        const result = await this.repository.clearAllWarnings(userId, adminId);

        // Invalidate caches
        await this.invalidateUserWarningsCache(userId);
        await this.invalidateUserCache(userId);
        await this.invalidateListCache();

        // Log
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'user-management',
            action: 'clear_all_warnings',
            message: `Xóa tất cả cảnh cáo của user: ${user.email || user.name}`,
            userId: adminId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: {
                targetUserId: userId,
                warningsRemoved: result.count,
                note,
            },
        });

        return result;
    }

    /**
     * Bulk clear all warnings for multiple users
     */
    async bulkClearAllWarnings(
        userIds: string[],
        note: string | undefined,
        adminId: string,
        lang: string,
        requestInfo?: { ip?: string; userAgent?: string },
    ): Promise<{ count: number }> {
        if (userIds.length === 0) {
            throw new BadRequestException(this.i18n.t('user-management.error.no_users_selected', { lang }));
        }

        const result = await this.repository.clearAllWarningsForMany(userIds, adminId);

        // Invalidate caches
        await this.invalidateListCache();
        for (const userId of userIds) {
            await this.invalidateUserWarningsCache(userId);
            await this.invalidateUserCache(userId);
        }

        // Log
        this.systemLogService.logAsync({
            level: 'INFO',
            module: 'user-management',
            action: 'bulk_clear_all_warnings',
            message: `Xóa tất cả cảnh cáo của ${userIds.length} users`,
            userId: adminId,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            metaData: {
                targetUserIds: userIds,
                warningsRemoved: result.count,
                note,
            },
        });

        return result;
    }
}
