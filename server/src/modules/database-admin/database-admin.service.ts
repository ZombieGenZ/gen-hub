import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseLogService } from './services/database-log.service';
import { SystemLogService } from '../system-log/system-log.service';
import { Prisma } from '@prisma/client';

// Các tables nhạy cảm cần ẩn một số fields
const SENSITIVE_FIELDS: Record<string, string[]> = {
    user: ['password', 'two_factor_token', 'email_verify_token', 'forgot_password_token'],
    refreshToken: ['token'],
    backupCode: ['code'],
    apiKey: ['key_hash', 'key_prefix'],
    organization: ['google_client_secret', 'google_refresh_token'],
};

// Tables không nên cho phép xóa hoặc edit trực tiếp
const PROTECTED_TABLES = ['_prisma_migrations'];

@Injectable()
export class DatabaseAdminService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseAdminService.name);
    private availableTables: string[] = [];

    constructor(
        private readonly prisma: PrismaService,
        private readonly databaseLogService: DatabaseLogService,
        private readonly systemLogService: SystemLogService,
    ) { }

    /**
     * Khởi tạo danh sách tables khi module được load
     */
    async onModuleInit() {
        this.discoverTables();
    }

    /**
     * Tự động discover tables từ Prisma DMMF (Data Model Meta Format)
     */
    private discoverTables() {
        try {
            // Lấy tất cả model names từ Prisma DMMF
            const dmmf = Prisma.dmmf;
            const models = dmmf.datamodel.models;

            this.availableTables = models
                .map((model) => {
                    // Convert PascalCase sang camelCase để match với prisma client
                    const name = model.name;
                    return name.charAt(0).toLowerCase() + name.slice(1);
                })
                .filter((name) => !PROTECTED_TABLES.includes(name));

            this.logger.log(`📊 Discovered ${this.availableTables.length} tables from Prisma schema`);
        } catch (error) {
            this.logger.error('Failed to discover tables from Prisma DMMF', error);
            this.availableTables = [];
        }
    }

    /**
     * Lấy danh sách tất cả tables có thể quản lý
     */
    async getTables() {
        return this.availableTables.map((table) => ({
            name: table,
            displayName: this.formatTableName(table),
        }));
    }

    /**
     * Lấy records của một table với pagination
     */
    async getRecords(
        tableName: string,
        options: {
            page?: number;
            limit?: number;
            orderBy?: string;
            orderDirection?: 'asc' | 'desc';
            search?: string;
        } = {},
    ) {
        this.validateTable(tableName);

        const { page = 1, limit = 20, orderBy = 'created_at', orderDirection = 'desc' } = options;
        const skip = (page - 1) * limit;

        const prismaModel = this.getPrismaModel(tableName);

        // Kiểm tra xem model có field orderBy không
        let orderByClause: any = {};
        try {
            // Thử order by field được chỉ định
            orderByClause = { [orderBy]: orderDirection };
        } catch {
            // Nếu không có field đó thì bỏ qua orderBy
            orderByClause = {};
        }

        const [records, total] = await Promise.all([
            prismaModel.findMany({
                take: limit,
                skip,
                orderBy: Object.keys(orderByClause).length > 0 ? orderByClause : undefined,
            }),
            prismaModel.count(),
        ]);

        // Ẩn các fields nhạy cảm
        const sanitizedRecords = records.map((record: any) =>
            this.sanitizeRecord(tableName, record),
        );

        return {
            data: sanitizedRecords,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Lấy chi tiết một record
     */
    async getRecord(tableName: string, id: string) {
        this.validateTable(tableName);

        const prismaModel = this.getPrismaModel(tableName);
        const record = await prismaModel.findUnique({ where: { id } });

        if (!record) {
            throw new NotFoundException(`Record with id ${id} not found in ${tableName}`);
        }

        return this.sanitizeRecord(tableName, record);
    }

    /**
     * Tạo record mới
     */
    async createRecord(
        tableName: string,
        data: any,
        context: { userId?: string; ipAddress?: string; userAgent?: string },
    ) {
        this.validateTable(tableName);

        const prismaModel = this.getPrismaModel(tableName);

        // Xóa các fields không được phép tạo
        const cleanData = this.cleanInputData(tableName, data);

        const record = await prismaModel.create({ data: cleanData });

        // Log vào cả DatabaseLog và SystemLog
        await Promise.all([
            this.databaseLogService.logCreate(tableName, record.id, record, context),
            this.systemLogService.info(
                'admin',
                'CREATE',
                `Created ${tableName} record: ${record.id}`,
                {
                    userId: context.userId,
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent,
                    metaData: { tableName, recordId: record.id },
                },
            ),
        ]);

        return this.sanitizeRecord(tableName, record);
    }

    /**
     * Cập nhật record
     */
    async updateRecord(
        tableName: string,
        id: string,
        data: any,
        context: { userId?: string; ipAddress?: string; userAgent?: string },
    ) {
        this.validateTable(tableName);

        const prismaModel = this.getPrismaModel(tableName);

        // Lấy old data trước khi update
        const oldRecord = await prismaModel.findUnique({ where: { id } });
        if (!oldRecord) {
            throw new NotFoundException(`Record with id ${id} not found in ${tableName}`);
        }

        // Xóa các fields không được phép update
        const cleanData = this.cleanInputData(tableName, data);

        const record = await prismaModel.update({
            where: { id },
            data: cleanData,
        });

        // Log vào cả DatabaseLog và SystemLog
        await Promise.all([
            this.databaseLogService.logUpdate(tableName, id, oldRecord, record, context),
            this.systemLogService.info(
                'admin',
                'UPDATE',
                `Updated ${tableName} record: ${id}`,
                {
                    userId: context.userId,
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent,
                    metaData: { tableName, recordId: id },
                },
            ),
        ]);

        return this.sanitizeRecord(tableName, record);
    }

    /**
     * Xóa record
     */
    async deleteRecord(
        tableName: string,
        id: string,
        context: { userId?: string; ipAddress?: string; userAgent?: string },
    ) {
        this.validateTable(tableName);

        const prismaModel = this.getPrismaModel(tableName);

        // Lấy old data trước khi delete
        const oldRecord = await prismaModel.findUnique({ where: { id } });
        if (!oldRecord) {
            throw new NotFoundException(`Record with id ${id} not found in ${tableName}`);
        }

        await prismaModel.delete({ where: { id } });

        // Log vào cả DatabaseLog và SystemLog
        await Promise.all([
            this.databaseLogService.logDelete(tableName, id, oldRecord, context),
            this.systemLogService.info(
                'admin',
                'DELETE',
                `Deleted ${tableName} record: ${id}`,
                {
                    userId: context.userId,
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent,
                    metaData: { tableName, recordId: id },
                },
            ),
        ]);

        return { success: true, message: `Record ${id} deleted from ${tableName}` };
    }

    /**
     * Lấy schema của một table (field types, required fields)
     */
    async getTableSchema(tableName: string) {
        this.validateTable(tableName);

        try {
            // Lấy thông tin schema từ Prisma DMMF
            const dmmf = Prisma.dmmf;
            const modelName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
            const model = dmmf.datamodel.models.find((m) => m.name === modelName);

            if (!model) {
                return {
                    tableName,
                    displayName: this.formatTableName(tableName),
                    sensitiveFields: SENSITIVE_FIELDS[tableName] || [],
                    fields: [],
                };
            }

            const fields = model.fields.map((field) => ({
                name: field.name,
                type: field.type,
                isRequired: field.isRequired,
                isList: field.isList,
                isId: field.isId,
                isUnique: field.isUnique,
                hasDefaultValue: field.hasDefaultValue,
                isRelation: !!field.relationName,
            }));

            return {
                tableName,
                displayName: this.formatTableName(tableName),
                sensitiveFields: SENSITIVE_FIELDS[tableName] || [],
                fields,
            };
        } catch (error) {
            this.logger.error(`Failed to get schema for ${tableName}`, error);
            return {
                tableName,
                displayName: this.formatTableName(tableName),
                sensitiveFields: SENSITIVE_FIELDS[tableName] || [],
                fields: [],
            };
        }
    }

    // ==================== PRIVATE METHODS ====================

    private validateTable(tableName: string) {
        if (!this.availableTables.includes(tableName)) {
            throw new BadRequestException(`Table "${tableName}" is not allowed or does not exist`);
        }
    }

    private getPrismaModel(tableName: string) {
        const model = (this.prisma as any)[tableName];
        if (!model) {
            throw new BadRequestException(`Table "${tableName}" not found in Prisma Client`);
        }
        return model;
    }

    private sanitizeRecord(tableName: string, record: any) {
        const sensitiveFields = SENSITIVE_FIELDS[tableName] || [];
        const sanitized = { ...record };

        for (const field of sensitiveFields) {
            if (sanitized[field] !== undefined) {
                sanitized[field] = '********';
            }
        }

        return sanitized;
    }

    private cleanInputData(tableName: string, data: any) {
        const sensitiveFields = SENSITIVE_FIELDS[tableName] || [];
        const cleaned = { ...data };

        // Xóa id vì không cho phép tự set id
        delete cleaned.id;

        // Xóa các fields nhạy cảm nếu giá trị là masked
        for (const field of sensitiveFields) {
            if (cleaned[field] === '********') {
                delete cleaned[field];
            }
        }

        // Xóa các timestamp fields
        delete cleaned.created_at;
        delete cleaned.updated_at;

        return cleaned;
    }

    private formatTableName(tableName: string): string {
        return tableName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
    }
}
