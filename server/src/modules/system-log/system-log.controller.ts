import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { LogLevel } from '@prisma/client';

/**
 * System Logs Controller
 * Provides endpoints for viewing system logs in admin panel
 */
@ApiTags('System Logs')
@ApiBearerAuth()
@Controller('admin/system-logs')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('systemlogs.admin')
export class SystemLogController {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get system logs with pagination and filtering
     */
    @Get()
    @ApiOperation({ summary: 'Get system logs with pagination and filtering' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'level', required: false, enum: LogLevel })
    @ApiQuery({ name: 'module', required: false, type: String })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    async getLogs(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('level') level?: LogLevel,
        @Query('module') module?: string,
        @Query('search') search?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 50;
        const skip = (pageNum - 1) * limitNum;

        // Build where clause
        const where: any = {};

        if (level) {
            where.level = level;
        }

        if (module) {
            // Case-insensitive module filter
            where.module = { equals: module, mode: 'insensitive' };
        }

        if (search) {
            where.OR = [
                { message: { contains: search, mode: 'insensitive' } },
                { action: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) {
                where.created_at.gte = new Date(startDate);
            }
            if (endDate) {
                where.created_at.lte = new Date(endDate);
            }
        }

        const [logs, total] = await Promise.all([
            this.prisma.systemLog.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: limitNum,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            }),
            this.prisma.systemLog.count({ where }),
        ]);

        return {
            data: logs,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        };
    }

    /**
     * Get logs statistics
     */
    @Get('stats')
    @ApiOperation({ summary: 'Get system logs statistics' })
    async getStats() {
        const [total, byLevel, recentCount] = await Promise.all([
            this.prisma.systemLog.count(),
            this.prisma.systemLog.groupBy({
                by: ['level'],
                _count: true,
            }),
            this.prisma.systemLog.count({
                where: {
                    created_at: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                    },
                },
            }),
        ]);

        const levelStats: Record<string, number> = {
            INFO: 0,
            WARN: 0,
            ERROR: 0,
            DEBUG: 0,
        };

        byLevel.forEach((item) => {
            levelStats[item.level] = item._count;
        });

        return {
            total,
            recentCount,
            byLevel: levelStats,
        };
    }

    /**
     * Get unique modules list
     */
    @Get('modules')
    @ApiOperation({ summary: 'Get unique module names' })
    async getModules() {
        const modules = await this.prisma.systemLog.findMany({
            select: { module: true },
            distinct: ['module'],
            orderBy: { module: 'asc' },
        });

        return modules.map((m) => m.module);
    }

    /**
     * Get enum values for LogLevel
     */
    @Get('levels')
    @ApiOperation({ summary: 'Get available log levels' })
    getLogLevels() {
        return Object.values(LogLevel);
    }
}
