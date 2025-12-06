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
}
