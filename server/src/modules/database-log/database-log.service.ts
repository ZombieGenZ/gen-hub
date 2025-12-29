import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, AuditAction } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Context interface cho request information
 */
export interface DatabaseLogContext {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * AsyncLocalStorage để lưu context theo request
 */
export const databaseLogContext = new AsyncLocalStorage<DatabaseLogContext>();

/**
 * Service quản lý auto-logging cho database operations
 * Hoạt động như trigger trong SQL
 */
@Injectable()
export class DatabaseLogService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseLogService.name);

    private readonly enabled: boolean;
    private readonly excludedTables: string[];
    private readonly asyncMode: boolean;
    private readonly batchSize: number;
    private readonly flushIntervalMs: number;

    private logBuffer: Prisma.DatabaseLogCreateInput[] = [];
    private flushTimer: NodeJS.Timeout | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        this.enabled = this.configService.get<boolean>('DATABASE_LOG_ENABLED') ?? true;
        this.excludedTables = (this.configService.get<string>('DATABASE_LOG_EXCLUDED_TABLES') || '')
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(Boolean);
        this.asyncMode = this.configService.get<boolean>('DATABASE_LOG_ASYNC') ?? true;
        this.batchSize = this.configService.get<number>('DATABASE_LOG_BATCH_SIZE') || 100;
        this.flushIntervalMs = this.configService.get<number>('DATABASE_LOG_FLUSH_INTERVAL_MS') || 5000;
    }

    async onModuleInit() {
        if (!this.enabled) {
            this.logger.log('⏸️ Database logging is disabled');
            return;
        }

        this.logger.log('🔌 Initializing database auto-logging...');
        this.logger.log(`📋 Excluded tables: ${this.excludedTables.join(', ') || 'none'}`);
        this.logger.log(`📝 Mode: ${this.asyncMode ? 'async (batched)' : 'sync'}`);

        // Start batch flush timer if async mode
        if (this.asyncMode) {
            this.startFlushTimer();
        }

        this.logger.log('✅ Database auto-logging initialized');
    }

    /**
     * Log một CREATE operation
     */
    async logCreate(model: string, newData: any, executionTime?: number) {
        if (!this.enabled || this.isExcludedTable(model)) return;

        this.logOperation({
            model,
            action: 'CREATE',
            args: {},
            oldData: null,
            newData,
            executionTime: executionTime || 0,
        });
    }

    /**
     * Log một UPDATE operation
     */
    async logUpdate(model: string, oldData: any, newData: any, executionTime?: number) {
        if (!this.enabled || this.isExcludedTable(model)) return;

        this.logOperation({
            model,
            action: 'UPDATE',
            args: { where: { id: newData?.id } },
            oldData,
            newData,
            executionTime: executionTime || 0,
        });
    }

    /**
     * Log một DELETE operation
     */
    async logDelete(model: string, oldData: any, executionTime?: number) {
        if (!this.enabled || this.isExcludedTable(model)) return;

        this.logOperation({
            model,
            action: 'DELETE',
            args: { where: { id: oldData?.id } },
            oldData,
            newData: null,
            executionTime: executionTime || 0,
        });
    }


    /**
     * Log operation vào buffer hoặc database
     */
    private logOperation(options: {
        model: string;
        action: AuditAction;
        args: any;
        oldData: any;
        newData: any;
        executionTime: number;
    }) {
        const ctx = databaseLogContext.getStore() || {};

        // Tính changed columns
        const changedColumns = this.getChangedColumns(options.oldData, options.newData);

        // Lấy record ID
        const recordId = options.newData?.id || options.args?.where?.id;

        const logEntry: Prisma.DatabaseLogCreateInput = {
            action: options.action,
            table_name: this.toSnakeCase(options.model),
            record_id: recordId?.toString(),
            primary_key_column: 'id',
            trigger_operation: options.action === 'CREATE' ? 'INSERT' : options.action,
            query_type: options.action === 'CREATE' ? 'INSERT' : options.action === 'DELETE' ? 'DELETE' : 'UPDATE',
            affected_rows: 1,
            execution_time_ms: options.executionTime,
            old_data: options.oldData ? this.sanitizeData(options.oldData) : undefined,
            new_data: options.newData ? this.sanitizeData(options.newData) : undefined,
            changed_columns: changedColumns,
            ip_address: ctx.ipAddress,
            user_agent: ctx.userAgent,
            user: ctx.userId ? { connect: { id: ctx.userId } } : undefined,
        };

        if (this.asyncMode) {
            this.logBuffer.push(logEntry);

            // Flush nếu buffer đầy
            if (this.logBuffer.length >= this.batchSize) {
                this.flushLogs();
            }
        } else {
            // Sync mode - write immediately
            this.writeLog(logEntry).catch(err => {
                this.logger.error(`Failed to write log: ${err.message}`);
            });
        }
    }

    /**
     * Flush logs từ buffer vào database
     */
    private async flushLogs() {
        if (this.logBuffer.length === 0) return;

        const logs = [...this.logBuffer];
        this.logBuffer = [];

        try {
            // Batch insert
            await this.prisma.databaseLog.createMany({
                data: logs.map(log => ({
                    action: log.action,
                    table_name: log.table_name,
                    record_id: log.record_id,
                    primary_key_column: log.primary_key_column,
                    trigger_operation: log.trigger_operation,
                    query_type: log.query_type,
                    affected_rows: log.affected_rows,
                    execution_time_ms: log.execution_time_ms,
                    old_data: log.old_data as any,
                    new_data: log.new_data as any,
                    changed_columns: log.changed_columns,
                    ip_address: log.ip_address,
                    user_agent: log.user_agent,
                    user_id: (log.user as any)?.connect?.id,
                })),
                skipDuplicates: true,
            });
        } catch (err: any) {
            this.logger.error(`Failed to flush ${logs.length} logs: ${err.message}`);
            // Re-add failed logs back to buffer (với giới hạn)
            if (this.logBuffer.length < this.batchSize * 2) {
                this.logBuffer.unshift(...logs);
            }
        }
    }

    /**
     * Write single log entry
     */
    private async writeLog(log: Prisma.DatabaseLogCreateInput) {
        await this.prisma.databaseLog.create({ data: log });
    }

    /**
     * Start timer để flush logs định kỳ
     */
    private startFlushTimer() {
        this.flushTimer = setInterval(() => {
            this.flushLogs().catch(err => {
                this.logger.error(`Scheduled flush failed: ${err.message}`);
            });
        }, this.flushIntervalMs);
    }

    /**
     * Cleanup khi module destroy
     */
    async onModuleDestroy() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        // Final flush
        await this.flushLogs();
    }

    /**
     * Check nếu table bị excluded
     */
    private isExcludedTable(model?: string): boolean {
        if (!model) return true;
        const tableName = this.toSnakeCase(model).toLowerCase();
        return this.excludedTables.includes(tableName);
    }

    /**
     * Map Prisma action sang AuditAction
     */
    private mapActionToAuditAction(action: string): AuditAction | null {
        switch (action) {
            case 'create':
            case 'createMany':
                return 'CREATE';
            case 'update':
            case 'updateMany':
            case 'upsert':
                return 'UPDATE';
            case 'delete':
            case 'deleteMany':
                return 'DELETE';
            default:
                return null;
        }
    }

    /**
     * Convert PascalCase sang snake_case
     */
    private toSnakeCase(str: string): string {
        return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    }

    /**
     * Lấy danh sách columns đã thay đổi
     */
    private getChangedColumns(oldData: any, newData: any): string[] {
        if (!oldData || !newData) return [];

        const changed: string[] = [];
        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

        for (const key of allKeys) {
            if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
                changed.push(key);
            }
        }

        return changed;
    }

    /**
     * Sanitize data để tránh lưu sensitive info
     */
    private sanitizeData(data: any): any {
        if (!data) return data;

        const sensitiveKeys = ['password', 'password_hash', 'secret', 'token', 'api_key'];
        const sanitized = { ...data };

        for (const key of sensitiveKeys) {
            if (key in sanitized) {
                sanitized[key] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    /**
     * Set context cho current request (gọi từ middleware)
     */
    static setContext(ctx: DatabaseLogContext, callback: () => Promise<any>) {
        return databaseLogContext.run(ctx, callback);
    }
}
