import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * API Key Log Service
 * Sử dụng fire-and-forget pattern để không ảnh hưởng response time
 */
@Injectable()
export class ApiKeyLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log API key request - fire-and-forget
   */
  logRequest(params: {
    organizationId: string;
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    durationMs: number;
    requestBody?: Record<string, unknown>;
    responseBody?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    this.createLog(params).catch((error) => {
      console.error('[ApiKeyLog] Failed to create log:', error.message);
    });
  }

  /**
   * Tạo log entry trong database
   */
  private async createLog(params: {
    organizationId: string;
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    durationMs: number;
    requestBody?: Record<string, unknown>;
    responseBody?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.apiKeyLog.create({
      data: {
        organization_id: params.organizationId,
        api_key_id: params.apiKeyId,
        endpoint: params.endpoint,
        method: params.method,
        status_code: params.statusCode,
        duration_ms: params.durationMs,
        request_body: params.requestBody
          ? (params.requestBody as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        response_body: params.responseBody
          ? (params.responseBody as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
      },
    });
  }
}
