import { LogLevel } from '@prisma/client';

/**
 * DTO cho việc tạo system log
 */
export interface CreateLogDto {
    /** Log level: INFO, WARN, ERROR, DEBUG */
    level?: LogLevel;
    /** Module name (e.g., 'auth', 'user', 'organization') */
    module: string;
    /** Action name (e.g., 'register', 'login', 'logout') */
    action: string;
    /** Log message */
    message: string;
    /** Additional metadata as JSON */
    metaData?: Record<string, unknown>;
    /** User ID if available */
    userId?: string;
    /** IP address of the request */
    ipAddress?: string;
    /** User agent string */
    userAgent?: string;
}

/**
 * Helper class để tạo log entries dễ dàng hơn
 */
export class LogBuilder {
    private dto: CreateLogDto;

    constructor(module: string, action: string) {
        this.dto = {
            module,
            action,
            message: '',
            level: 'INFO',
        };
    }

    static create(module: string, action: string): LogBuilder {
        return new LogBuilder(module, action);
    }

    level(level: LogLevel): LogBuilder {
        this.dto.level = level;
        return this;
    }

    message(message: string): LogBuilder {
        this.dto.message = message;
        return this;
    }

    userId(userId: string | undefined | null): LogBuilder {
        if (userId) {
            this.dto.userId = userId;
        }
        return this;
    }

    ipAddress(ip: string | undefined | null): LogBuilder {
        if (ip) {
            this.dto.ipAddress = ip;
        }
        return this;
    }

    userAgent(agent: string | undefined | null): LogBuilder {
        if (agent) {
            this.dto.userAgent = agent;
        }
        return this;
    }

    meta(data: Record<string, unknown>): LogBuilder {
        this.dto.metaData = { ...this.dto.metaData, ...data };
        return this;
    }

    build(): CreateLogDto {
        return this.dto;
    }
}
