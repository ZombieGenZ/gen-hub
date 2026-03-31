import type { ApiResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface SystemLog {
    id: string;
    level: LogLevel;
    module: string;
    action: string;
    message: string;
    meta_data?: Record<string, any>;
    user_id?: string;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
    user?: {
        id: string;
        name?: string;
        email: string;
    };
}

export interface QuerySystemLogParams {
    page?: number;
    limit?: number;
    level?: LogLevel;
    module?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
}

export interface SystemLogStats {
    total: number;
    byLevel: Record<LogLevel, number>;
    byModule: Record<string, number>;
}

export interface PaginatedSystemLogs {
    data: SystemLog[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

/**
 * Service quản lý System Logs (Admin)
 */
export class SystemLogService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Lấy danh sách system logs */
    async findMany(token: string, query?: QuerySystemLogParams): Promise<ApiResponse<PaginatedSystemLogs>> {
        const params = new URLSearchParams();
        if (query?.page != null) params.append('page', String(query.page));
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.level) params.append('level', query.level);
        if (query?.module) params.append('module', query.module);
        if (query?.search) params.append('search', query.search);
        if (query?.startDate) params.append('startDate', query.startDate);
        if (query?.endDate) params.append('endDate', query.endDate);

        const response = await fetch(`${API}/admin/system-logs?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách system logs');
        }

        return response.json();
    }

    /** Lấy thống kê system logs */
    async getStats(token: string): Promise<ApiResponse<SystemLogStats>> {
        const response = await fetch(`${API}/admin/system-logs/stats`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thống kê system logs');
        }

        return response.json();
    }
}

export const systemLogService = new SystemLogService();
