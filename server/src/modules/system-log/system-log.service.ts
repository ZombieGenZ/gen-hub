import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLogDto, LogBuilder } from './dto';

/**
 * System Log Service
 * Cung cấp logging async cho tất cả hoạt động trên server
 * Sử dụng fire-and-forget pattern để không ảnh hưởng response time
 */
@Injectable()
export class SystemLogService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Log async - fire-and-forget, không await
     * Không làm tăng thời gian phản hồi của request
     * @param params CreateLogDto hoặc LogBuilder result
     */
    logAsync(params: CreateLogDto): void {
        this.createLog(params).catch((error) => {
            console.error('[SystemLog] Failed to create log:', error.message);
        });
    }

    /**
     * Log sync - awaitable, sử dụng khi cần đảm bảo log được ghi
     * @param params CreateLogDto
     */
    async log(params: CreateLogDto): Promise<void> {
        await this.createLog(params);
    }

    /**
     * Tạo log entry trong database
     */
    private async createLog(params: CreateLogDto): Promise<void> {
        await this.prisma.systemLog.create({
            data: {
                level: params.level || 'INFO',
                module: params.module,
                action: params.action,
                message: params.message,
                meta_data: params.metaData ? (params.metaData as Prisma.InputJsonValue) : Prisma.JsonNull,
                user_id: params.userId || null,
                ip_address: params.ipAddress || null,
                user_agent: params.userAgent || null,
            },
        });
    }

    /**
     * Helper để tạo LogBuilder
     * @example
     * systemLogService.logAsync(
     *   systemLogService.builder('auth', 'login')
     *     .message('User logged in')
     *     .userId(user.id)
     *     .ipAddress(req.ip)
     *     .build()
     * );
     */
    builder(module: string, action: string): LogBuilder {
        return LogBuilder.create(module, action);
    }



    /**
     * Log INFO level
     */
    info(module: string, action: string, message: string, options?: Partial<CreateLogDto>): void {
        this.logAsync({
            level: 'INFO',
            module,
            action,
            message,
            ...options,
        });
    }

    /**
     * Log WARN level
     */
    warn(module: string, action: string, message: string, options?: Partial<CreateLogDto>): void {
        this.logAsync({
            level: 'WARN',
            module,
            action,
            message,
            ...options,
        });
    }

    /**
     * Log ERROR level
     */
    error(module: string, action: string, message: string, options?: Partial<CreateLogDto>): void {
        this.logAsync({
            level: 'ERROR',
            module,
            action,
            message,
            ...options,
        });
    }

    /**
     * Log DEBUG level
     */
    debug(module: string, action: string, message: string, options?: Partial<CreateLogDto>): void {
        this.logAsync({
            level: 'DEBUG',
            module,
            action,
            message,
            ...options,
        });
    }

    // ============================================================
    // Server Lifecycle Logging Methods
    // ============================================================

    /**
     * Log server startup - gọi khi server khởi động thành công
     * @param port - Port server đang chạy
     * @param startTime - Thời gian bắt đầu (Date object)
     */
    logServerStart(port: number | string, startTime: Date): void {
        this.logAsync({
            level: 'INFO',
            module: 'server',
            action: 'startup',
            message: `Server started successfully on port ${port}`,
            metaData: {
                port,
                startTime: startTime.toISOString(),
                nodeVersion: process.version,
                platform: process.platform,
                environment: process.env.NODE_ENV || 'development',
            },
        });
    }

    /**
     * Log server shutdown - gọi khi server tắt
     * SỬ DỤNG SYNC để đảm bảo log được ghi trước khi process exit
     * @param startTime - Thời gian server bắt đầu
     * @param signal - Signal nhận được (SIGTERM, SIGINT, etc.)
     */
    async logServerShutdown(startTime: Date, signal?: string): Promise<void> {
        const uptime = Date.now() - startTime.getTime();
        const uptimeFormatted = this.formatUptime(uptime);

        // Sử dụng log sync để đảm bảo ghi được trước khi exit
        await this.log({
            level: 'INFO',
            module: 'server',
            action: 'shutdown',
            message: `Server shutting down. Uptime: ${uptimeFormatted}`,
            metaData: {
                signal,
                uptimeMs: uptime,
                uptimeFormatted,
                shutdownTime: new Date().toISOString(),
            },
        });
    }

    /**
     * Log critical error - dùng cho crash hoặc fatal errors
     * SỬ DỤNG SYNC để đảm bảo log được ghi trước khi process crash
     * @param error - Error object
     * @param context - Context bổ sung
     */
    async logCritical(error: Error, context?: string): Promise<void> {
        // Sử dụng log sync để đảm bảo ghi được trước khi crash
        await this.log({
            level: 'ERROR',
            module: 'server',
            action: 'critical_error',
            message: `CRITICAL: ${context || 'Unhandled error'} - ${error.message}`,
            metaData: {
                errorName: error.name,
                errorMessage: error.message,
                stack: error.stack,
                context,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Log exception với stack trace - helper cho exception filter
     * @param exception - Exception object
     * @param request - Request info
     */
    logException(
        exception: Error,
        request: { method: string; url: string; userId?: string; ip?: string; userAgent?: string },
    ): void {
        this.logAsync({
            level: 'ERROR',
            module: 'http',
            action: 'exception',
            message: `${request.method} ${request.url} - ${exception.message}`,
            userId: request.userId,
            ipAddress: request.ip,
            userAgent: request.userAgent,
            metaData: {
                errorName: exception.name,
                errorMessage: exception.message,
                stack: exception.stack,
            },
        });
    }

    /**
     * Format uptime từ milliseconds sang human-readable string
     */
    private formatUptime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    }
}
