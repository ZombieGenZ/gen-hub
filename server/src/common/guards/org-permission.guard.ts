import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ORG_PERMISSIONS_KEY } from '../decorators/require-org-permission.decorator';
import { IApiKeyInfo } from '../decorators/current-actor.decorator';
import { ResponseCode } from '../responses';

/**
 * Guard kiểm tra permission cấp tổ chức
 * Hỗ trợ cả JWT user và API key
 * 
 * Với JWT user: Kiểm tra permission qua member roles/permissions
 * Với API key: Kiểm tra permission có allow_api_key = true và API key có permission đó
 */
@Injectable()
export class OrgPermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            ORG_PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        // Support both :orgId (dedicated org routes) and :id (organization controller routes)
        const orgId = request.params.orgId ?? request.params.id;

        if (!orgId) {
            throw new ForbiddenException('Không xác định được tổ chức');
        }

        // Kiểm tra xem là JWT auth hay API key auth
        const userId = request.user?.userId;
        const apiKey = request.apiKey as IApiKeyInfo | undefined;

        if (userId) {
            // JWT auth - kiểm tra qua member permissions
            return this.checkUserPermission(userId, orgId, requiredPermissions);
        }

        if (apiKey) {
            // API key auth - kiểm tra allow_api_key và permissions
            return this.checkApiKeyPermission(apiKey, orgId, requiredPermissions);
        }

        throw new ForbiddenException('Không có quyền truy cập');
    }

    /**
     * Kiểm tra permission cho user qua JWT
     */
    private async checkUserPermission(
        userId: string,
        orgId: string,
        requiredPermissions: string[],
    ): Promise<boolean> {
        // Kiểm tra xem user có phải owner không
        const org = await this.prisma.organization.findFirst({
            where: { id: orgId, is_deleted: false },
            select: { owner_id: true },
        });

        if (!org) {
            throw new ForbiddenException('Tổ chức không tồn tại');
        }

        // Owner có full quyền
        if (org.owner_id === userId) {
            return true;
        }

        // Kiểm tra member permissions
        const userRecord = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { is_banned: true, banned_end: true },
        });

        if (userRecord?.is_banned && (!userRecord.banned_end || new Date(userRecord.banned_end) > new Date())) {
            throw new ForbiddenException({
                code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_BANNED,
                message: 'Tài khoản đã bị khóa',
                success: false,
            });
        }

        const member = await this.prisma.organizationMember.findFirst({
            where: {
                user_id: userId,
                organization_id: orgId,
                is_deleted: false,
                is_active: true,
                is_accepted: true,
            },
            include: {
                permissions: {
                    where: { is_deleted: false, is_active: true },
                    include: {
                        permission: {
                            select: { key: true, is_active: true },
                        },
                    },
                },
                roles: {
                    where: { is_deleted: false, is_active: true },
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    where: { is_deleted: false, is_active: true },
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

        if (!member) {
            throw new ForbiddenException('Bạn không phải thành viên của tổ chức này');
        }

        // Thu thập tất cả permission keys
        const userPermissions = new Set<string>();

        // Direct permissions
        for (const mp of member.permissions) {
            if (mp.permission.is_active) {
                userPermissions.add(mp.permission.key);
            }
        }

        // Role permissions
        for (const mr of member.roles) {
            for (const rp of mr.role.permissions) {
                if (rp.permission.is_active) {
                    userPermissions.add(rp.permission.key);
                }
            }
        }

        // Kiểm tra required permissions
        const hasAllPermissions = requiredPermissions.every((p) =>
            userPermissions.has(p),
        );

        if (!hasAllPermissions) {
            throw new ForbiddenException({
                code: ResponseCode.ERROR_FORBIDDEN_NO_PERMISSION,
                message: 'Không có quyền thực hiện thao tác này',
                success: false,
            });
        }

        return true;
    }

    /**
     * Kiểm tra permission cho API key
     * Phải kiểm tra cả allow_api_key trên permission
     */
    private async checkApiKeyPermission(
        apiKey: IApiKeyInfo,
        orgId: string,
        requiredPermissions: string[],
    ): Promise<boolean> {
        // Kiểm tra API key thuộc organization này
        if (apiKey.organization_id !== orgId) {
            throw new ForbiddenException('API key không thuộc tổ chức này');
        }

        // Kiểm tra các permission có allow_api_key = true không
        const allowedPermissions = await this.prisma.organizationPermission.findMany({
            where: {
                key: { in: requiredPermissions },
                is_deleted: false,
                is_active: true,
                allow_api_key: true,
            },
            select: { key: true },
        });

        const allowedKeys = new Set(allowedPermissions.map((p) => p.key));

        // Kiểm tra xem tất cả required permissions có được phép cho API key không
        for (const required of requiredPermissions) {
            if (!allowedKeys.has(required)) {
                throw new ForbiddenException(
                    `Permission "${required}" không cho phép sử dụng API key`,
                );
            }
        }

        // Kiểm tra API key có các permission cần thiết không
        const hasAllPermissions = requiredPermissions.every((p) =>
            apiKey.permissions.includes(p),
        );

        if (!hasAllPermissions) {
            throw new ForbiddenException('API key không có quyền thực hiện thao tác này');
        }

        return true;
    }
}
