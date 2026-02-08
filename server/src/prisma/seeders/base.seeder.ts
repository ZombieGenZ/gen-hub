import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Base class for all seeders providing common utilities
 */
export abstract class BaseSeeder {
    protected readonly logger: Logger;
    protected readonly prisma: PrismaClient;

    constructor(prisma: PrismaClient, loggerContext: string) {
        this.prisma = prisma;
        this.logger = new Logger(loggerContext);
    }

    /**
     * Create a permission if it doesn't exist
     */
    protected async createPermissionIfNotExists(
        key: string,
        name: string,
        description: string,
    ): Promise<string | null> {
        try {
            const existing = await this.prisma.permission.findFirst({
                where: { key },
            });

            if (existing) {
                return existing.id;
            }

            const newPermission = await this.prisma.permission.create({
                data: {
                    key,
                    name,
                    description,
                    is_active: true,
                    is_deleted: false,
                },
            });

            return newPermission.id;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to create permission ${key}: ${errorMessage}`);
            return null;
        }
    }

    /**
     * Assign permission to role if not already assigned
     */
    protected async assignPermissionToRole(
        roleId: string,
        permissionId: string,
    ): Promise<boolean> {
        try {
            const existingAssignment = await this.prisma.rolePermission.findFirst({
                where: {
                    role_id: roleId,
                    permission_id: permissionId,
                },
            });

            if (existingAssignment) {
                return true;
            }

            await this.prisma.rolePermission.create({
                data: {
                    role_id: roleId,
                    permission_id: permissionId,
                    is_active: true,
                    is_deleted: false,
                },
            });

            return true;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to assign permission to role: ${errorMessage}`);
            return false;
        }
    }

    /**
     * Assign permission to user if not already assigned
     */
    protected async assignPermissionToUser(
        userId: string,
        permissionId: string,
    ): Promise<boolean> {
        try {
            const existingAssignment = await this.prisma.userPermission.findFirst({
                where: {
                    user_id: userId,
                    permission_id: permissionId,
                },
            });

            if (existingAssignment) {
                return true;
            }

            await this.prisma.userPermission.create({
                data: {
                    user_id: userId,
                    permission_id: permissionId,
                    is_active: true,
                    is_deleted: false,
                },
            });

            return true;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to assign permission to user: ${errorMessage}`);
            return false;
        }
    }

    /**
     * Get role by name
     */
    protected async getRoleByName(name: string) {
        return this.prisma.role.findFirst({
            where: { name, is_deleted: false },
        });
    }

    /**
     * Get admin roles (Admin and Super Admin)
     */
    protected async getAdminRoles() {
        return this.prisma.role.findMany({
            where: {
                name: { in: ['Admin', 'Super Admin'] },
                is_deleted: false,
            },
        });
    }

    /**
     * Get all roles
     */
    protected async getAllRoles() {
        return this.prisma.role.findMany({
            where: { is_deleted: false },
        });
    }

    /**
     * Abstract method to run the seeder
     */
    abstract run(): Promise<void>;
}
