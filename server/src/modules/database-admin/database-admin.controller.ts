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

@ApiTags('Database Admin')
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
     * Lấy schema của một table
     */
    @Get('tables/:tableName/schema')
    @ApiOperation({ summary: 'Get schema of a specific table' })
    async getTableSchema(@Param('tableName') tableName: string) {
        return this.databaseAdminService.getTableSchema(tableName);
    }

    /**
     * Lấy records của một table với pagination
     */
    @Get('tables/:tableName')
    @ApiOperation({ summary: 'Get records of a table with pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'orderBy', required: false, type: String })
    @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
    @ApiQuery({ name: 'search', required: false, type: String })
    async getRecords(
        @Param('tableName') tableName: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('orderBy') orderBy?: string,
        @Query('orderDirection') orderDirection?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.databaseAdminService.getRecords(tableName, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            orderBy,
            orderDirection,
            search,
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
