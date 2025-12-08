import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as { userId: string } | undefined;

        if (!user?.userId) {
            throw new ForbiddenException('Không có quyền truy cập');
        }

        const userPermissions = await this.getUserPermissions(user.userId);

        const hasPermission = requiredPermissions.every((permission) =>
            userPermissions.includes(permission),
        );

        if (!hasPermission) {
            throw new ForbiddenException('Không có quyền thực hiện thao tác này');
        }

        return true;
    }

    private async getUserPermissions(userId: string): Promise<string[]> {
        const directPermissions = await this.prisma.userPermission.findMany({
            where: {
                user_id: userId,
                is_active: true,
                is_deleted: false,
                permission: {
                    is_active: true,
                    is_deleted: false,
                },
            },
            include: {
                permission: true,
            },
        });

        const rolePermissions = await this.prisma.userRole.findMany({
            where: {
                user_id: userId,
                is_active: true,
                is_deleted: false,
                role: {
                    is_active: true,
                    is_deleted: false,
                },
            },
            include: {
                role: {
                    include: {
                        permissions: {
                            where: {
                                is_active: true,
                                is_deleted: false,
                                permission: {
                                    is_active: true,
                                    is_deleted: false,
                                },
                            },
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });

        const permissionKeys = new Set<string>();

        for (const dp of directPermissions) {
            permissionKeys.add(dp.permission.key);
        }

        for (const ur of rolePermissions) {
            for (const rp of ur.role.permissions) {
                permissionKeys.add(rp.permission.key);
            }
        }

        return Array.from(permissionKeys);
    }
}
