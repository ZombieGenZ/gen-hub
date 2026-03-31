import type { ApiResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface TableInfo {
    name: string;
    displayName: string;
}

export interface TableStatistics {
    tableName: string;
    rowCount: number;
    columnCount: number;
    sizeBytes: number;
    lastUpdated: string;
}

export interface TableField {
    name: string;
    type: string;
    isRequired: boolean;
    isList: boolean;
    isId: boolean;
    isUnique: boolean;
    hasDefaultValue: boolean;
    isRelation: boolean;
    enumValues?: string[];
}

export interface TableSchema {
    tableName: string;
    displayName: string;
    sensitiveFields: string[];
    fields: TableField[];
}

export interface TableRelation {
    id: string;
    sourceTable: string;
    sourceField: string;
    targetTable: string;
    targetField: string;
    type: string;
}

export interface PaginatedRecords {
    data: Record<string, any>[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface BatchChanges {
    created: Record<string, any>[];
    updated: { id: string; data: Record<string, any> }[];
    deleted: string[];
}

export interface BatchResult {
    created: Record<string, any>[];
    updated: Record<string, any>[];
    deleted: string[];
    errors: Array<{ type: string; id?: string; error: string }>;
}

export interface BulkDeleteResult {
    deleted: string[];
    errors: Array<{ id: string; error: string }>;
}

export interface RawQueryResult {
    success: boolean;
    data: Record<string, any>[];
    columns: string[];
    executionTime: number;
}

export interface DiagramConfig {
    node_positions?: Record<string, { x: number; y: number }>;
    table_colors?: Record<string, string>;
    show_relations?: boolean;
    dark_mode?: boolean;
}

export interface DiagramSchema {
    tables: Array<{
        name: string;
        displayName: string;
        fields: Array<{
            name: string;
            type: string;
            isId: boolean;
            isRequired: boolean;
            isUnique: boolean;
            isList: boolean;
            hasDefaultValue: boolean;
        }>;
    }>;
    relations: TableRelation[];
}

export interface FilterCondition {
    column: string;
    operator: 'equals' | 'not' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'isNull' | 'isNotNull';
    value?: any;
}

export interface QueryRecordsParams {
    page?: number;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    search?: string;
    filters?: FilterCondition[];
}

/**
 * Service quản trị Database (Admin)
 */
export class DatabaseAdminService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Lấy danh sách các bảng có thể quản trị */
    async getTables(token: string): Promise<ApiResponse<TableInfo[]>> {
        const response = await fetch(`${API}/admin/tables`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách bảng');
        }

        return response.json();
    }

    /** Lấy thống kê tổng quan database */
    async getStatistics(token: string): Promise<ApiResponse<TableStatistics[]>> {
        const response = await fetch(`${API}/admin/statistics`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thống kê database');
        }

        return response.json();
    }

    /** Lấy schema chi tiết của một bảng */
    async getTableSchema(token: string, tableName: string): Promise<ApiResponse<TableSchema>> {
        const response = await fetch(`${API}/admin/tables/${tableName}/schema`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy schema bảng');
        }

        return response.json();
    }

    /** Lấy danh sách record của một bảng */
    async getRecords(token: string, tableName: string, query?: QueryRecordsParams): Promise<ApiResponse<PaginatedRecords>> {
        const params = new URLSearchParams();
        if (query?.page != null) params.append('page', String(query.page));
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.orderBy) params.append('orderBy', query.orderBy);
        if (query?.orderDirection) params.append('orderDirection', query.orderDirection);
        if (query?.search) params.append('search', query.search);
        if (query?.filters && query.filters.length > 0) {
            params.append('filters', JSON.stringify(query.filters));
        }

        const response = await fetch(`${API}/admin/tables/${tableName}?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách records');
        }

        return response.json();
    }

    /** Lấy chi tiết một record theo ID */
    async getRecord(token: string, tableName: string, id: string): Promise<ApiResponse<Record<string, any>>> {
        const response = await fetch(`${API}/admin/tables/${tableName}/${id}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin record');
        }

        return response.json();
    }

    /** Tạo record mới trong bảng */
    async createRecord(token: string, tableName: string, data: Record<string, any>): Promise<ApiResponse<Record<string, any>>> {
        const response = await fetch(`${API}/admin/tables/${tableName}`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo record');
        }

        return response.json();
    }

    /** Cập nhật một record theo ID */
    async updateRecord(token: string, tableName: string, id: string, data: Record<string, any>): Promise<ApiResponse<Record<string, any>>> {
        const response = await fetch(`${API}/admin/tables/${tableName}/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật record');
        }

        return response.json();
    }

    /** Xóa một record theo ID */
    async deleteRecord(token: string, tableName: string, id: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
        const response = await fetch(`${API}/admin/tables/${tableName}/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa record');
        }

        return response.json();
    }

    /** Thực hiện batch create, update, delete */
    async batchUpdate(token: string, tableName: string, changes: BatchChanges): Promise<ApiResponse<BatchResult>> {
        const response = await fetch(`${API}/admin/tables/${tableName}/batch`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(changes),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể thực hiện batch update');
        }

        return response.json();
    }

    /** Xóa nhiều record theo danh sách ID */
    async bulkDelete(token: string, tableName: string, ids: string[]): Promise<ApiResponse<BulkDeleteResult>> {
        const response = await fetch(`${API}/admin/tables/${tableName}/bulk`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa nhiều records');
        }

        return response.json();
    }

    /** Lấy schema ER diagram */
    async getDiagramSchema(token: string): Promise<ApiResponse<DiagramSchema>> {
        const response = await fetch(`${API}/admin/diagram/schema`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy schema diagram');
        }

        return response.json();
    }

    /** Lấy config ER diagram */
    async getDiagramConfig(token: string): Promise<ApiResponse<DiagramConfig>> {
        const response = await fetch(`${API}/admin/diagram/config`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy config diagram');
        }

        return response.json();
    }

    /** Lưu config ER diagram */
    async saveDiagramConfig(token: string, config: DiagramConfig): Promise<ApiResponse<{ success: boolean; config: DiagramConfig }>> {
        const response = await fetch(`${API}/admin/diagram/config`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(config),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lưu config diagram');
        }

        return response.json();
    }
}

export const databaseAdminService = new DatabaseAdminService();
