import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DatabaseAdminGuard } from './guards/database-admin.guard';
import { DatabaseAdminService } from './database-admin.service';

export interface FilterCondition {
    column: string;
    operator: 'equals' | 'not' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'isNull' | 'isNotNull';
    value?: any;
}

export interface BatchChanges {
    created: any[];
    updated: { id: string; data: any }[];
    deleted: string[];
}

@ApiTags('Database')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, DatabaseAdminGuard)
export class DatabaseAdminController {
    constructor(private readonly databaseAdminService: DatabaseAdminService) { }

    /**
     * Lấy danh sách tất cả tables có thể quản lý
     */
    @Get('tables')
    @ApiOperation({ summary: 'Get list of all manageable tables' })
    async getTables() {
        return this.databaseAdminService.getTables();
    }

    /**
     * Lấy thống kê tổng quan cho tất cả tables
     */
    @Get('statistics')
    @ApiOperation({ summary: 'Get statistics for all tables' })
    async getStatistics() {
        return this.databaseAdminService.getStatistics();
    }

    /**
     * Lấy schema của một table
     */
    @Get('tables/:tableName/schema')
    @ApiOperation({ summary: 'Get schema of a specific table' })
    async getTableSchema(@Param('tableName') tableName: string) {
        return this.databaseAdminService.getTableSchema(tableName);
    }

    /**
     * Lấy records của một table với pagination và filtering
     */
    @Get('tables/:tableName')
    @ApiOperation({ summary: 'Get records of a table with pagination and filtering' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'orderBy', required: false, type: String })
    @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
    @ApiQuery({ name: 'filters', required: false, type: String, description: 'JSON array of filter conditions' })
    async getRecords(
        @Param('tableName') tableName: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('orderBy') orderBy?: string,
        @Query('orderDirection') orderDirection?: 'asc' | 'desc',
        @Query('filters') filters?: string,
    ) {
        let parsedFilters: FilterCondition[] | undefined;
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch {
                parsedFilters = undefined;
            }
        }

        return this.databaseAdminService.getRecords(tableName, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            orderBy,
            orderDirection,
            filters: parsedFilters,
        });
    }

    /**
     * Lấy chi tiết một record
     */
    @Get('tables/:tableName/:id')
    @ApiOperation({ summary: 'Get a specific record by ID' })
    async getRecord(
        @Param('tableName') tableName: string,
        @Param('id') id: string,
    ) {
        return this.databaseAdminService.getRecord(tableName, id);
    }

    /**
     * Tạo record mới
     */
    @Post('tables/:tableName')
    @ApiOperation({ summary: 'Create a new record' })
    async createRecord(
        @Param('tableName') tableName: string,
        @Body() data: any,
        @Req() req: Request,
    ) {
        const context = this.extractContext(req);
        return this.databaseAdminService.createRecord(tableName, data, context);
    }

    /**
     * Batch update - tạo, cập nhật, xóa nhiều records cùng lúc
     */
    @Post('tables/:tableName/batch')
    @ApiOperation({ summary: 'Batch create, update, delete records' })
    async batchUpdate(
        @Param('tableName') tableName: string,
        @Body() changes: BatchChanges,
        @Req() req: Request,
    ) {
        const context = this.extractContext(req);
        return this.databaseAdminService.batchUpdate(tableName, changes, context);
    }

    /**
     * Bulk delete - xóa nhiều records
     */
    @Delete('tables/:tableName/bulk')
    @ApiOperation({ summary: 'Delete multiple records' })
    async bulkDelete(
        @Param('tableName') tableName: string,
        @Body() body: { ids: string[] },
        @Req() req: Request,
    ) {
        const context = this.extractContext(req);
        return this.databaseAdminService.bulkDelete(tableName, body.ids, context);
    }

    /**
     * Cập nhật record
     */
    @Put('tables/:tableName/:id')
    @ApiOperation({ summary: 'Update an existing record' })
    async updateRecord(
        @Param('tableName') tableName: string,
        @Param('id') id: string,
        @Body() data: any,
        @Req() req: Request,
    ) {
        const context = this.extractContext(req);
        return this.databaseAdminService.updateRecord(tableName, id, data, context);
    }

    /**
     * Xóa record
     */
    @Delete('tables/:tableName/:id')
    @ApiOperation({ summary: 'Delete a record' })
    async deleteRecord(
        @Param('tableName') tableName: string,
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        const context = this.extractContext(req);
        return this.databaseAdminService.deleteRecord(tableName, id, context);
    }

    /**
     * Lấy schema cho ER Diagram
     * Bao gồm thông tin tables, fields và relations
     */
    @Get('diagram/schema')
    @ApiOperation({ summary: 'Get database schema for ER diagram visualization' })
    async getDiagramSchema() {
        return this.databaseAdminService.getDiagramSchema();
    }

    /**
     * Lấy cấu hình diagram đã lưu của user
     */
    @Get('diagram/config')
    @ApiOperation({ summary: 'Get saved diagram configuration' })
    @ApiQuery({ name: 'name', required: false, type: String, description: 'Config name, default is "default"' })
    async getDiagramConfig(
        @Req() req: Request,
        @Query('name') name?: string,
    ) {
        const user = req.user as any;
        return this.databaseAdminService.getDiagramConfig(user.userId, name);
    }

    /**
     * Lưu cấu hình diagram của user
     */
    @Put('diagram/config')
    @ApiOperation({ summary: 'Save diagram configuration' })
    async saveDiagramConfig(
        @Req() req: Request,
        @Body() config: {
            name?: string;
            node_positions?: Record<string, { x: number; y: number }>;
            table_colors?: Record<string, string>;
            show_relations?: boolean;
            dark_mode?: boolean;
        },
    ) {
        const user = req.user as any;
        return this.databaseAdminService.saveDiagramConfig(user.userId, config);
    }

    /**
     * Thực thi raw SQL query
     */
    @Post('query/execute')
    @ApiOperation({ summary: 'Execute raw SQL query' })
    async executeRawQuery(
        @Body() body: { query: string },
        @Req() req: Request,
    ) {
        const context = this.extractContext(req);
        return this.databaseAdminService.executeRawQuery(body.query, context);
    }

    /**
     * Extract context từ request
     */
    private extractContext(req: Request) {
        const user = req.user as any;
        return {
            userId: user?.userId,
            ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
            userAgent: req.headers['user-agent'],
        };
    }
}
