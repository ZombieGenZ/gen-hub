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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DatabaseAdminGuard } from './guards/database-admin.guard';
import { DatabaseAdminService } from './database-admin.service';
import { ApiAuthResponses } from '../../common/decorators';

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
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, DatabaseAdminGuard)
export class DatabaseAdminController {
    constructor(private readonly databaseAdminService: DatabaseAdminService) { }

    /**
     * Lấy danh sách tất cả tables có thể quản lý
     */
    @Get('tables')
    @ApiOperation({
        summary: 'Get list of all manageable tables',
        description: 'Lấy danh sách tất cả các bảng trong database có thể quản lý qua Admin panel. Yêu cầu quyền Database Admin.',
    })
    @ApiResponse({
        status: 200,
        description: 'Danh sách tables',
        schema: {
            type: 'object',
            properties: {
                tables: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', example: 'User' },
                            displayName: { type: 'string', example: 'Users' },
                            recordCount: { type: 'number', example: 150 },
                        },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    async getTables() {
        return this.databaseAdminService.getTables();
    }

    /**
     * Lấy thống kê tổng quan cho tất cả tables
     */
    @Get('statistics')
    @ApiOperation({
        summary: 'Get statistics for all tables',
        description: 'Lấy thống kê tổng quan về số lượng records, dung lượng của tất cả các bảng trong database.',
    })
    @ApiResponse({ status: 200, description: 'Thống kê database' })
    @ApiAuthResponses()
    async getStatistics() {
        return this.databaseAdminService.getStatistics();
    }

    /**
     * Lấy schema của một table
     */
    @Get('tables/:tableName/schema')
    @ApiOperation({
        summary: 'Get schema of a specific table',
        description: 'Lấy thông tin schema của một bảng bao gồm: tên columns, kiểu dữ liệu, constraints, relations.',
    })
    @ApiParam({ name: 'tableName', description: 'Tên bảng (PascalCase)', type: 'string', example: 'User' })
    @ApiResponse({
        status: 200,
        description: 'Schema của table',
        schema: {
            type: 'object',
            properties: {
                tableName: { type: 'string', example: 'User' },
                columns: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', example: 'id' },
                            type: { type: 'string', example: 'String' },
                            isRequired: { type: 'boolean', example: true },
                            isPrimaryKey: { type: 'boolean', example: true },
                            isUnique: { type: 'boolean', example: false },
                            defaultValue: { type: 'string', nullable: true },
                        },
                    },
                },
                relations: { type: 'array', items: { type: 'object' } },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Table không tồn tại' })
    @ApiAuthResponses()
    async getTableSchema(@Param('tableName') tableName: string) {
        return this.databaseAdminService.getTableSchema(tableName);
    }

    /**
     * Lấy records của một table với pagination và filtering
     */
    @Get('tables/:tableName')
    @ApiOperation({
        summary: 'Get records of a table with pagination and filtering',
        description: 'Lấy danh sách records của một bảng với hỗ trợ phân trang, sắp xếp, và lọc theo nhiều điều kiện.',
    })
    @ApiParam({ name: 'tableName', description: 'Tên bảng (PascalCase)', type: 'string', example: 'User' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang (bắt đầu từ 1)', example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số records mỗi trang', example: 20 })
    @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Tên column để sắp xếp', example: 'created_at' })
    @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'], description: 'Hướng sắp xếp' })
    @ApiQuery({
        name: 'filters',
        required: false,
        type: String,
        description: 'JSON array of filter conditions. Example: [{"column":"name","operator":"contains","value":"test"}]',
    })
    @ApiResponse({ status: 200, description: 'Danh sách records với pagination' })
    @ApiResponse({ status: 404, description: 'Table không tồn tại' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Get a specific record by ID',
        description: 'Lấy chi tiết một record theo ID, bao gồm cả dữ liệu từ các bảng liên quan (relations).',
    })
    @ApiParam({ name: 'tableName', description: 'Tên bảng', example: 'User' })
    @ApiParam({ name: 'id', description: 'ID của record', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiResponse({ status: 200, description: 'Chi tiết record' })
    @ApiResponse({ status: 404, description: 'Record không tồn tại' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Create a new record',
        description: 'Tạo record mới trong bảng. Dữ liệu được validate theo schema của bảng. Tất cả thao tác được ghi log.',
    })
    @ApiParam({ name: 'tableName', description: 'Tên bảng', example: 'User' })
    @ApiBody({
        description: 'Dữ liệu record theo schema của bảng',
        schema: {
            type: 'object',
            additionalProperties: true,
            example: { name: 'John Doe', email: 'john@example.com' },
        },
    })
    @ApiResponse({ status: 201, description: 'Record đã được tạo' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Batch create, update, delete records',
        description: 'Thực hiện nhiều thao tác (tạo/cập nhật/xóa) cùng lúc trong một transaction. Đảm bảo tính toàn vẹn dữ liệu.',
    })
    @ApiParam({ name: 'tableName', description: 'Tên bảng', example: 'User' })
    @ApiBody({
        description: 'Danh sách thay đổi cần thực hiện',
        schema: {
            type: 'object',
            properties: {
                created: { type: 'array', items: { type: 'object' }, description: 'Records mới cần tạo' },
                updated: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            data: { type: 'object' },
                        },
                    },
                    description: 'Records cần cập nhật',
                },
                deleted: { type: 'array', items: { type: 'string' }, description: 'Danh sách ID cần xóa' },
            },
            example: {
                created: [{ name: 'New User' }],
                updated: [{ id: 'uuid-1', data: { name: 'Updated Name' } }],
                deleted: ['uuid-2'],
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Batch update thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Delete multiple records',
        description: 'Xóa nhiều records cùng lúc theo danh sách ID. Tất cả thao tác được ghi log.',
    })
    @ApiParam({ name: 'tableName', description: 'Tên bảng', example: 'User' })
    @ApiBody({
        description: 'Danh sách ID cần xóa',
        schema: {
            type: 'object',
            properties: { ids: { type: 'array', items: { type: 'string' } } },
            example: { ids: ['uuid-1', 'uuid-2', 'uuid-3'] },
        },
    })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Update an existing record',
        description: 'Cập nhật record theo ID. Chỉ các trường được gửi mới được cập nhật (partial update).',
    })
    @ApiParam({ name: 'tableName', description: 'Tên bảng', example: 'User' })
    @ApiParam({ name: 'id', description: 'ID của record', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiBody({ description: 'Dữ liệu cần cập nhật', schema: { type: 'object', additionalProperties: true } })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Record không tồn tại' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Delete a record',
        description: 'Xóa một record theo ID. Thao tác được ghi log để có thể audit.',
    })
    @ApiParam({ name: 'tableName', description: 'Tên bảng', example: 'User' })
    @ApiParam({ name: 'id', description: 'ID của record', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Record không tồn tại' })
    @ApiAuthResponses()
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
     */
    @Get('diagram/schema')
    @ApiOperation({
        summary: 'Get database schema for ER diagram visualization',
        description: 'Lấy thông tin schema đầy đủ để vẽ ER diagram bao gồm tables, fields, và relationships giữa các bảng.',
    })
    @ApiResponse({ status: 200, description: 'Schema cho ER diagram' })
    @ApiAuthResponses()
    async getDiagramSchema() {
        return this.databaseAdminService.getDiagramSchema();
    }

    /**
     * Lấy cấu hình diagram đã lưu của user
     */
    @Get('diagram/config')
    @ApiOperation({
        summary: 'Get saved diagram configuration',
        description: 'Lấy cấu hình diagram đã lưu của user bao gồm vị trí nodes, màu sắc, và các tùy chỉnh khác.',
    })
    @ApiQuery({ name: 'name', required: false, type: String, description: 'Tên cấu hình, mặc định là "default"' })
    @ApiResponse({ status: 200, description: 'Cấu hình diagram' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Save diagram configuration',
        description: 'Lưu cấu hình diagram của user để sử dụng lại sau này.',
    })
    @ApiBody({
        description: 'Cấu hình diagram',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Tên cấu hình', example: 'my-layout' },
                node_positions: { type: 'object', description: 'Vị trí các nodes' },
                table_colors: { type: 'object', description: 'Màu sắc các bảng' },
                show_relations: { type: 'boolean', example: true },
                dark_mode: { type: 'boolean', example: false },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Lưu thành công' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Execute raw SQL query',
        description: '⚠️ **DANGEROUS**: Thực thi raw SQL query trực tiếp. Chỉ dành cho Database Admin có quyền cao nhất. Tất cả queries được ghi log.',
    })
    @ApiBody({
        description: 'SQL query cần thực thi',
        schema: {
            type: 'object',
            properties: { query: { type: 'string', example: 'SELECT * FROM "User" LIMIT 10' } },
        },
    })
    @ApiResponse({ status: 200, description: 'Kết quả query' })
    @ApiResponse({ status: 400, description: 'Query không hợp lệ hoặc bị cấm' })
    @ApiAuthResponses()
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
