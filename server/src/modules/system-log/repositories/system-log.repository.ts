import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { QuerySystemLogDto } from '../dto';
import {
    ISystemLog,
    ISystemLogPaginated,
    ISystemLogStats,
} from '../interfaces';

/**
 * Select fields for system log queries
 * Chỉ lấy các trường cần thiết để tối ưu performance
 */
const SYSTEM_LOG_SELECT = {
    id: true,
    level: true,
    module: true,
    action: true,
    message: true,
    meta_data: true,
    user_id: true,
    ip_address: true,
    user_agent: true,
    created_at: true,
} as const;

const SYSTEM_LOG_WITH_USER_SELECT = {
    ...SYSTEM_LOG_SELECT,
    user: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
} as const;

/**
 * Repository xử lý database operations cho SystemLog
 * Tách biệt hoàn toàn khỏi business logic
 */
@Injectable()
export class SystemLogRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Tạo log entry mới
     */
    async create(
        data: Prisma.SystemLogCreateInput,
    ): Promise<ISystemLog> {
        return this.prisma.systemLog.create({
            data,
            select: SYSTEM_LOG_SELECT,
        }) as Promise<ISystemLog>;
    }

    /**
     * Tìm log theo ID
     */
    async findById(id: string): Promise<ISystemLog | null> {
        return this.prisma.systemLog.findUnique({
            where: { id },
            select: SYSTEM_LOG_WITH_USER_SELECT,
        }) as Promise<ISystemLog | null>;
    }

    /**
     * Lấy danh sách logs với pagination và filtering
     */
    async findPaginated(query: QuerySystemLogDto): Promise<ISystemLogPaginated> {
        const page = query.page || 1;
        const limit = query.limit || 50;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Prisma.SystemLogWhereInput = {};

        if (query.level) {
            where.level = query.level;
        }

        if (query.module) {
            where.module = { equals: query.module, mode: 'insensitive' };
        }

        if (query.search) {
            where.OR = [
                { message: { contains: query.search, mode: 'insensitive' } },
                { action: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        if (query.startDate || query.endDate) {
            where.created_at = {};
            if (query.startDate) {
                where.created_at.gte = query.startDate;
            }
            if (query.endDate) {
                where.created_at.lte = query.endDate;
            }
        }

        // Execute queries in parallel
        const [logs, total] = await Promise.all([
            this.prisma.systemLog.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
                select: SYSTEM_LOG_WITH_USER_SELECT,
            }),
            this.prisma.systemLog.count({ where }),
        ]);

        return {
            data: logs as ISystemLog[],
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Lấy statistics
     */
    async getStats(): Promise<ISystemLogStats> {
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
     * Lấy danh sách unique modules
     */
    async getUniqueModules(): Promise<string[]> {
        const modules = await this.prisma.systemLog.findMany({
            select: { module: true },
            distinct: ['module'],
            orderBy: { module: 'asc' },
        });

        return modules.map((m) => m.module);
    }
}
