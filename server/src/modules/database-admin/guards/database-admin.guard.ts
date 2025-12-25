import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DatabaseAdminGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.userId) {
            throw new UnauthorizedException('Authentication required');
        }

        // Kiểm tra user có permission database.admin không (trực tiếp hoặc qua role)
        const hasPermission = await this.prisma.user.findFirst({
            where: {
                id: user.userId,
                OR: [
                    // Permissions trực tiếp
                    {
                        system_permissions: {
                            some: {
                                is_active: true,
                                is_deleted: false,
                                permission: {
                                    key: 'database.admin',
                                    is_active: true,
                                    is_deleted: false,
                                },
                            },
                        },
                    },
                    // Permissions qua Roles
                    {
                        system_roles: {
                            some: {
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
                                                key: 'database.admin',
                                                is_active: true,
                                                is_deleted: false,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
            },
        });

        if (!hasPermission) {
            throw new ForbiddenException(
                'You do not have permission to access database admin panel',
            );
        }

        return true;
    }
}
