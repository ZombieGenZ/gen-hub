import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseLogService } from './services/database-log.service';
import { SystemLogService } from '../system-log/system-log.service';
import { Prisma } from '@prisma/client';
import { FilterCondition, BatchChanges } from './database-admin.controller';

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
     * Lấy thống kê tổng quan cho tất cả tables
     * Sử dụng batch processing để tránh lỗi too many connections
     */
    async getStatistics() {
        const dmmf = Prisma.dmmf;
        const tables = this.availableTables;
        const BATCH_SIZE = 5; // Giới hạn số query song song

        const tableStats: {
            name: string;
            displayName: string;
            recordCount: number;
            columnCount: number;
        }[] = [];

        // Process tables in batches
        for (let i = 0; i < tables.length; i += BATCH_SIZE) {
            const batch = tables.slice(i, i + BATCH_SIZE);

            const batchResults = await Promise.all(
                batch.map(async (tableName) => {
                    try {
                        const prismaModel = this.getPrismaModel(tableName);
                        const count = await prismaModel.count();

                        // Get column count from DMMF
                        const modelName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
                        const model = dmmf.datamodel.models.find((m) => m.name === modelName);
                        const columnCount = model?.fields.filter(f => !f.relationName).length || 0;

                        return {
                            name: tableName,
                            displayName: this.formatTableName(tableName),
                            recordCount: count,
                            columnCount,
                        };
                    } catch (error) {
                        this.logger.error(`Failed to get stats for ${tableName}`, error);
                        return {
                            name: tableName,
                            displayName: this.formatTableName(tableName),
                            recordCount: 0,
                            columnCount: 0,
                        };
                    }
                })
            );

            tableStats.push(...batchResults);
        }

        // Calculate aggregates
        const totalTables = tableStats.length;
        const totalRecords = tableStats.reduce((sum, t) => sum + t.recordCount, 0);
        const totalColumns = tableStats.reduce((sum, t) => sum + t.columnCount, 0);
        const avgRecordsPerTable = totalTables > 0 ? Math.round(totalRecords / totalTables) : 0;

        return {
            summary: {
                totalTables,
                totalRecords,
                totalColumns,
                avgRecordsPerTable,
            },
            tables: tableStats,
        };
    }

    /**
     * Build Prisma where clause từ filter conditions
     */
    private buildWhereClause(filters?: FilterCondition[]): any {
        if (!filters || filters.length === 0) return {};

        const conditions: any[] = [];

        for (const filter of filters) {
            const { column, operator, value } = filter;
            let condition: any = {};

            switch (operator) {
                case 'equals':
                    condition[column] = { equals: value };
                    break;
                case 'not':
                    condition[column] = { not: value };
                    break;
                case 'gt':
                    condition[column] = { gt: value };
                    break;
                case 'gte':
                    condition[column] = { gte: value };
                    break;
                case 'lt':
                    condition[column] = { lt: value };
                    break;
                case 'lte':
                    condition[column] = { lte: value };
                    break;
                case 'contains':
                    condition[column] = { contains: value, mode: 'insensitive' };
                    break;
                case 'startsWith':
                    condition[column] = { startsWith: value, mode: 'insensitive' };
                    break;
                case 'endsWith':
                    condition[column] = { endsWith: value, mode: 'insensitive' };
                    break;
                case 'in':
                    condition[column] = { in: Array.isArray(value) ? value : [value] };
                    break;
                case 'isNull':
                    condition[column] = null;
                    break;
                case 'isNotNull':
                    condition[column] = { not: null };
                    break;
                default:
                    continue;
            }

            conditions.push(condition);
        }

        return conditions.length > 0 ? { AND: conditions } : {};
    }

    /**
     * Lấy records của một table với pagination và filtering
     */
    async getRecords(
        tableName: string,
        options: {
            page?: number;
            limit?: number;
            orderBy?: string;
            orderDirection?: 'asc' | 'desc';
            filters?: FilterCondition[];
        } = {},
    ) {
        this.validateTable(tableName);

        const { page = 1, limit = 20, orderBy, orderDirection = 'desc', filters } = options;
        const skip = (page - 1) * limit;

        const prismaModel = this.getPrismaModel(tableName);
        const whereClause = this.buildWhereClause(filters);

        // Get available fields for this table from schema
        const schema = await this.getTableSchema(tableName);
        const availableFields = schema.fields.map((f: any) => f.name);

        // Determine orderBy field - check if field exists
        let orderByClause: any = undefined;

        if (orderBy && availableFields.includes(orderBy)) {
            // Use specified orderBy if it exists
            orderByClause = { [orderBy]: orderDirection };
        } else if (availableFields.includes('created_at')) {
            // Fallback to created_at if exists
            orderByClause = { created_at: orderDirection };
        } else if (availableFields.includes('id')) {
            // Fallback to id if exists
            orderByClause = { id: orderDirection };
        }
        // If none exist, don't order

        const [records, total] = await Promise.all([
            prismaModel.findMany({
                where: whereClause,
                take: limit,
                skip,
                ...(orderByClause && { orderBy: orderByClause }),
            }),
            prismaModel.count({ where: whereClause }),
        ]);

        // Không ẩn các fields nhạy cảm - hiển thị đầy đủ
        return {
            data: records,
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
     * Batch update - tạo, cập nhật, xóa nhiều records cùng lúc
     */
    async batchUpdate(
        tableName: string,
        changes: BatchChanges,
        context: { userId?: string; ipAddress?: string; userAgent?: string },
    ) {
        this.validateTable(tableName);

        const prismaModel = this.getPrismaModel(tableName);
        const results = {
            created: [] as any[],
            updated: [] as any[],
            deleted: [] as string[],
            errors: [] as { type: string; id?: string; error: string }[],
        };

        // Use transaction for atomicity
        await this.prisma.$transaction(async (tx) => {
            const txModel = (tx as any)[tableName];

            // Create records
            for (const data of changes.created || []) {
                try {
                    const cleanData = this.cleanInputData(tableName, data);
                    const record = await txModel.create({ data: cleanData });
                    results.created.push(record);

                    // Log after transaction
                    await this.databaseLogService.logCreate(tableName, record.id, record, context);
                } catch (error: any) {
                    results.errors.push({ type: 'create', error: error.message });
                }
            }

            // Update records
            for (const { id, data } of changes.updated || []) {
                try {
                    const oldRecord = await txModel.findUnique({ where: { id } });
                    if (!oldRecord) {
                        results.errors.push({ type: 'update', id, error: 'Record not found' });
                        continue;
                    }

                    const cleanData = this.cleanInputData(tableName, data);
                    const record = await txModel.update({
                        where: { id },
                        data: cleanData,
                    });
                    results.updated.push(record);

                    // Log after transaction
                    await this.databaseLogService.logUpdate(tableName, id, oldRecord, record, context);
                } catch (error: any) {
                    results.errors.push({ type: 'update', id, error: error.message });
                }
            }

            // Delete records
            for (const id of changes.deleted || []) {
                try {
                    const oldRecord = await txModel.findUnique({ where: { id } });
                    if (!oldRecord) {
                        results.errors.push({ type: 'delete', id, error: 'Record not found' });
                        continue;
                    }

                    await txModel.delete({ where: { id } });
                    results.deleted.push(id);

                    // Log after transaction
                    await this.databaseLogService.logDelete(tableName, id, oldRecord, context);
                } catch (error: any) {
                    results.errors.push({ type: 'delete', id, error: error.message });
                }
            }
        });

        // Log batch operation to SystemLog
        await this.systemLogService.info(
            'admin',
            'BATCH_UPDATE',
            `Batch update on ${tableName}: ${results.created.length} created, ${results.updated.length} updated, ${results.deleted.length} deleted`,
            {
                userId: context.userId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                metaData: {
                    tableName,
                    createdCount: results.created.length,
                    updatedCount: results.updated.length,
                    deletedCount: results.deleted.length,
                    errorCount: results.errors.length,
                },
            },
        );

        return results;
    }

    /**
     * Bulk delete - xóa nhiều records
     */
    async bulkDelete(
        tableName: string,
        ids: string[],
        context: { userId?: string; ipAddress?: string; userAgent?: string },
    ) {
        this.validateTable(tableName);

        if (!ids || ids.length === 0) {
            throw new BadRequestException('No IDs provided for bulk delete');
        }

        const prismaModel = this.getPrismaModel(tableName);
        const results = {
            deleted: [] as string[],
            errors: [] as { id: string; error: string }[],
        };

        // Get old records for logging before delete
        const oldRecords = await prismaModel.findMany({
            where: { id: { in: ids } },
        });

        const oldRecordMap = new Map(oldRecords.map((r: any) => [r.id, r]));

        // Delete records
        await this.prisma.$transaction(async (tx) => {
            const txModel = (tx as any)[tableName];

            for (const id of ids) {
                try {
                    const oldRecord = oldRecordMap.get(id);
                    if (!oldRecord) {
                        results.errors.push({ id, error: 'Record not found' });
                        continue;
                    }

                    await txModel.delete({ where: { id } });
                    results.deleted.push(id);

                    // Log deletion
                    await this.databaseLogService.logDelete(tableName, id, oldRecord, context);
                } catch (error: any) {
                    results.errors.push({ id, error: error.message });
                }
            }
        });

        // Log bulk delete to SystemLog
        await this.systemLogService.info(
            'admin',
            'BULK_DELETE',
            `Bulk delete on ${tableName}: ${results.deleted.length} deleted, ${results.errors.length} errors`,
            {
                userId: context.userId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                metaData: {
                    tableName,
                    deletedCount: results.deleted.length,
                    errorCount: results.errors.length,
                    deletedIds: results.deleted,
                },
            },
        );

        return results;
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

        // Chuyển đổi chuỗi rỗng thành null cho các trường DateTime
        // Prisma yêu cầu DateTime phải là ISO-8601 hợp lệ hoặc null
        for (const key in cleaned) {
            if (cleaned[key] === '' || cleaned[key] === undefined) {
                cleaned[key] = null;
            }
        }

        return cleaned;
    }

    private formatTableName(tableName: string): string {
        return tableName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
    }

    /**
     * Lấy thông tin schema cho ER Diagram
     * Bao gồm danh sách tables, fields và relations
     */
    async getDiagramSchema() {
        try {
            const dmmf = Prisma.dmmf;
            const models = dmmf.datamodel.models;

            // Get visible table names (not in PROTECTED_TABLES)
            const visibleTableNames = new Set(
                models
                    .map((model) => model.name.charAt(0).toLowerCase() + model.name.slice(1))
                    .filter((name) => !PROTECTED_TABLES.includes(name)),
            );

            // Map để lưu thông tin tables
            const tables = models
                .filter((model) => !PROTECTED_TABLES.includes(model.name.charAt(0).toLowerCase() + model.name.slice(1)))
                .map((model) => {
                    const tableName = model.name.charAt(0).toLowerCase() + model.name.slice(1);

                    // Lấy danh sách fields (không bao gồm relations)
                    const fields = model.fields
                        .filter((field) => !field.relationName)
                        .map((field) => ({
                            name: field.name,
                            type: field.type,
                            isId: field.isId,
                            isRequired: field.isRequired,
                            isUnique: field.isUnique,
                            isList: field.isList,
                            hasDefaultValue: field.hasDefaultValue,
                        }));

                    return {
                        name: tableName,
                        displayName: this.formatTableName(tableName),
                        fields,
                    };
                });

            // Lấy danh sách relations - dựa trên fields kết thúc bằng _id
            const relations: {
                id: string;
                sourceTable: string;
                sourceField: string;
                targetTable: string;
                targetField: string;
                type: 'one-to-one' | 'one-to-many' | 'many-to-many';
            }[] = [];

            // Build a map of table names to check existence
            const tableNameMap = new Map<string, boolean>();
            visibleTableNames.forEach((name) => tableNameMap.set(name, true));

            tables.forEach((table) => {
                table.fields.forEach((field) => {
                    // Check if field ends with _id and is not the primary id
                    if (field.name.endsWith('_id') && !field.isId) {
                        // Extract target table name from field name (e.g., user_id -> user, warehouse_template_id -> warehouseTemplate)
                        const fieldNameWithoutId = field.name.slice(0, -3); // Remove _id

                        // Convert snake_case to camelCase for matching
                        const targetTableCamel = fieldNameWithoutId.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

                        // Check if target table exists in visible tables
                        if (tableNameMap.has(targetTableCamel)) {
                            // Determine relation type
                            const relationType: 'one-to-one' | 'one-to-many' | 'many-to-many' = field.isUnique
                                ? 'one-to-one'
                                : 'one-to-many';

                            relations.push({
                                id: `${table.name}_${field.name}_${targetTableCamel}_id`,
                                sourceTable: table.name,
                                sourceField: field.name,
                                targetTable: targetTableCamel,
                                targetField: 'id',
                                type: relationType,
                            });
                        }
                    }
                });
            });

            this.logger.log(`Diagram schema: ${tables.length} tables, ${relations.length} relations`);

            return {
                tables,
                relations,
            };
        } catch (error) {
            this.logger.error('Failed to get diagram schema', error);
            return {
                tables: [],
                relations: [],
            };
        }
    }

    /**
     * Lấy cấu hình diagram đã lưu của user
     */
    async getDiagramConfig(userId: string, name: string = 'default') {
        const config = await this.prisma.diagramConfig.findUnique({
            where: {
                user_id_name: {
                    user_id: userId,
                    name,
                },
            },
        });

        if (!config) {
            return {
                node_positions: {},
                table_colors: {},
                show_relations: true,
                dark_mode: true,
            };
        }

        return {
            node_positions: config.node_positions || {},
            table_colors: config.table_colors || {},
            show_relations: config.show_relations,
            dark_mode: config.dark_mode,
        };
    }

    /**
     * Lưu cấu hình diagram của user
     */
    async saveDiagramConfig(
        userId: string,
        config: {
            name?: string;
            node_positions?: Record<string, { x: number; y: number }>;
            table_colors?: Record<string, string>;
            show_relations?: boolean;
            dark_mode?: boolean;
        },
    ) {
        const name = config.name || 'default';

        const result = await this.prisma.diagramConfig.upsert({
            where: {
                user_id_name: {
                    user_id: userId,
                    name,
                },
            },
            update: {
                node_positions: config.node_positions,
                table_colors: config.table_colors,
                show_relations: config.show_relations,
                dark_mode: config.dark_mode,
                updated_at: new Date(),
            },
            create: {
                user_id: userId,
                name,
                node_positions: config.node_positions,
                table_colors: config.table_colors,
                show_relations: config.show_relations ?? true,
                dark_mode: config.dark_mode ?? true,
            },
        });

        return {
            success: true,
            config: {
                node_positions: result.node_positions || {},
                table_colors: result.table_colors || {},
                show_relations: result.show_relations,
                dark_mode: result.dark_mode,
            },
        };
    }
}
