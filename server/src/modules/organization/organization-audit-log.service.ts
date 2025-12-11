import { Injectable } from '@nestjs/common';
import { Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Audit Log Service cho Organization
 * Sử dụng fire-and-forget pattern để không ảnh hưởng response time
 */
@Injectable()
export class OrganizationAuditLogService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Log async - fire-and-forget, không await
     */
    logAsync(params: {
        organizationId: string;
        userId?: string;
        apiKeyId?: string;
        action: AuditAction;
        resourceType: string;
        resourceId?: string;
        resourceCode?: string;
        oldData?: Record<string, unknown>;
        newData?: Record<string, unknown>;
        description?: string;
        ipAddress?: string;
        userAgent?: string;
    }): void {
        this.createLog(params).catch((error) => {
            console.error('[OrganizationAuditLog] Failed to create log:', error.message);
        });
    }

    /**
     * Tạo log entry trong database
     */
    private async createLog(params: {
        organizationId: string;
        userId?: string;
        apiKeyId?: string;
        action: AuditAction;
        resourceType: string;
        resourceId?: string;
        resourceCode?: string;
        oldData?: Record<string, unknown>;
        newData?: Record<string, unknown>;
        description?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void> {
        await this.prisma.organizationAuditLog.create({
            data: {
                organization_id: params.organizationId,
                user_id: params.userId || null,
                api_key_id: params.apiKeyId || null,
                action: params.action,
                resource_type: params.resourceType,
                resource_id: params.resourceId || null,
                resource_code: params.resourceCode || null,
                old_data: params.oldData ? (params.oldData as Prisma.InputJsonValue) : Prisma.JsonNull,
                new_data: params.newData ? (params.newData as Prisma.InputJsonValue) : Prisma.JsonNull,
                description: params.description || null,
                ip_address: params.ipAddress || null,
                user_agent: params.userAgent || null,
            },
        });
    }

    // Các helper methods cho từng loại action

    logCreate(
        orgId: string,
        resourceType: string,
        resourceId: string,
        newData: Record<string, unknown>,
        options?: { userId?: string; description?: string; ipAddress?: string; userAgent?: string },
    ): void {
        this.logAsync({
            organizationId: orgId,
            userId: options?.userId,
            action: 'CREATE',
            resourceType,
            resourceId,
            newData,
            description: options?.description,
            ipAddress: options?.ipAddress,
            userAgent: options?.userAgent,
        });
    }

    logUpdate(
        orgId: string,
        resourceType: string,
        resourceId: string,
        oldData: Record<string, unknown>,
        newData: Record<string, unknown>,
        options?: { userId?: string; description?: string; ipAddress?: string; userAgent?: string },
    ): void {
        this.logAsync({
            organizationId: orgId,
            userId: options?.userId,
            action: 'UPDATE',
            resourceType,
            resourceId,
            oldData,
            newData,
            description: options?.description,
            ipAddress: options?.ipAddress,
            userAgent: options?.userAgent,
        });
    }

    logDelete(
        orgId: string,
        resourceType: string,
        resourceId: string,
        oldData: Record<string, unknown>,
        options?: { userId?: string; description?: string; ipAddress?: string; userAgent?: string },
    ): void {
        this.logAsync({
            organizationId: orgId,
            userId: options?.userId,
            action: 'DELETE',
            resourceType,
            resourceId,
            oldData,
            description: options?.description,
            ipAddress: options?.ipAddress,
            userAgent: options?.userAgent,
        });
    }
}
