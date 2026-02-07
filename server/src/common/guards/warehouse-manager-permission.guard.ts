import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../modules/redis/redis.service';
import { WM_PERMISSION_KEY } from '../decorators/require-wm-permission.decorator';
import { ResponseCode } from '../responses';

/**
 * Guard kiểm tra quyền truy cập của Warehouse Manager
 * Sử dụng hệ thống permission riêng của Warehouse Manager (WarehouseManagerPermission)
 * 
 * Flow:
 * 1. Kiểm tra user đã được gán làm manager của template (qua WarehouseTemplateManager)
 * 2. Kiểm tra manager có permission cần thiết qua roles được gán (WarehouseManagerRole → WarehouseManagerPermission)
 * 
 * Yêu cầu:
 * - Route phải có param :templateId
 * - Sử dụng @RequireWMPermission('permission.code') decorator
 */
@Injectable()
export class WarehouseManagerPermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission = this.reflector.getAllAndOverride<string>(
            WM_PERMISSION_KEY,
            [context.getHandler(), context.getClass()],
        );

        // Nếu không có permission nào được yêu cầu, cho phép truy cập
        if (!requiredPermission) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as { userId: string } | undefined;
        const templateId = request.params?.templateId;

        if (!user?.userId) {
            throw new ForbiddenException({
                code: ResponseCode.ERROR_FORBIDDEN,
                message: 'Không có quyền truy cập',
                success: false,
            });
        }

        if (!templateId) {
            throw new ForbiddenException({
                code: ResponseCode.ERROR_FORBIDDEN,
                message: 'Thiếu thông tin kho mẫu',
                success: false,
            });
        }

        // Kiểm tra tài khoản đã được xác minh và không bị ban
        const userRecord = await this.prisma.user.findUnique({
            where: { id: user.userId },
            select: { is_verified: true, is_banned: true },
        });

        if (!userRecord) {
            throw new ForbiddenException({
                code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_NOT_FOUND,
                message: 'Tài khoản không tồn tại',
                success: false,
            });
        }

        if (userRecord.is_banned) {
            throw new ForbiddenException({
                code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_BANNED,
                message: 'Tài khoản đã bị khóa',
                success: false,
            });
        }

        if (!userRecord.is_verified) {
            throw new ForbiddenException({
                code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_NOT_VERIFIED,
                message: 'Tài khoản chưa được xác minh. Vui lòng xác minh email để tiếp tục.',
                success: false,
            });
        }

        // Kiểm tra user là manager của template và có permission cần thiết
        const hasPermission = await this.checkManagerPermission(
            user.userId,
            templateId,
            requiredPermission,
        );

        if (!hasPermission) {
            throw new ForbiddenException({
                code: ResponseCode.ERROR_FORBIDDEN_NO_PERMISSION,
                message: 'Bạn không phải quản lý của kho mẫu này hoặc không có quyền thực hiện thao tác này',
                success: false,
            });
        }

        // Gắn manager info vào request để sử dụng trong controller/service
        request.warehouseManager = { templateId };

        return true;
    }

    /**
     * Kiểm tra user là manager của template và có permission cần thiết
     */
    private async checkManagerPermission(
        userId: string,
        templateId: string,
        requiredPermission: string,
    ): Promise<boolean> {
        // Check cache first
        const cacheKey = `wm:perm:${userId}:${templateId}:${requiredPermission}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached !== null) {
            return cached === 'true';
        }

        // Query database
        const manager = await this.prisma.warehouseTemplateManager.findUnique({
            where: {
                warehouse_template_id_user_id: {
                    warehouse_template_id: templateId,
                    user_id: userId,
                },
            },
            include: {
                roles: {
                    where: { is_active: true },
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    where: { is_active: true },
                                    include: {
                                        permission: {
                                            select: { key: true, is_active: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        // Nếu không phải manager hoặc manager đã bị xóa/inactive
        if (!manager || manager.is_deleted || !manager.is_active) {
            await this.redisService.set(cacheKey, 'false', 300); // Cache 5 phút
            return false;
        }

        // Type assertion cho manager với included relations
        const managerWithRoles = manager as typeof manager & {
            roles: Array<{
                role: {
                    permissions: Array<{
                        permission: { code: string; is_active: boolean };
                    }>;
                } | null;
            }>;
        };

        // Kiểm tra permission
        const hasPermission = managerWithRoles.roles.some(managerRole =>
            managerRole.role?.permissions.some(
                rolePermission =>
                    rolePermission.permission.is_active && rolePermission.permission.key === requiredPermission
            )
        );

        // Cache kết quả
        await this.redisService.set(cacheKey, hasPermission ? 'true' : 'false', 300);

        return hasPermission;
    }
}
