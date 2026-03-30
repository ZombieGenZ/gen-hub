import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Token storage keys from env
const ACCESS_TOKEN_KEY = process.env.NEXT_PUBLIC_ACCESS_TOKEN_KEY || 'access_token';
const REFRESH_TOKEN_KEY = process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY || 'refresh_token';

// Cookie expiration from env (in days)
const JWT_ACCESS_EXPIRATION = parseFloat(process.env.NEXT_PUBLIC_JWT_ACCESS_EXPIRATION || '0.0104'); // ~15 mins
const JWT_REFRESH_EXPIRATION = parseFloat(process.env.NEXT_PUBLIC_JWT_REFRESH_EXPIRATION || '7');

// Create axios instance
export const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor - Add token to headers
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = Cookies.get(ACCESS_TOKEN_KEY);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Variables to handle token refresh logic
let isRefreshing = false;
let failedQueue: { resolve: (token: string | null) => void; reject: (error: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// Response interceptor - Handle errors
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as (typeof error.config) & { _retry?: boolean };

        // If 401 error and it's not a retry and not the refresh token call itself
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {

            if (isRefreshing) {
                // If already refreshing, add to queue
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);
                if (refreshToken) {
                    const { authorization } = await auth.refreshToken(refreshToken);
                    if (authorization?.access_token) {
                        // Update token in cookies
                        Cookies.set(ACCESS_TOKEN_KEY, authorization.access_token, {
                            expires: JWT_ACCESS_EXPIRATION,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'strict',
                        });

                        // Retry original request with new token
                        api.defaults.headers.common['Authorization'] = `Bearer ${authorization.access_token}`;
                        originalRequest.headers.Authorization = `Bearer ${authorization.access_token}`;

                        processQueue(null, authorization.access_token);
                        return api(originalRequest);
                    }
                }

                // If no refresh token or invalid refresh response, reject
                processQueue(new Error('Refresh token missing or invalid'), null);
                return Promise.reject(error);

            } catch (refreshError) {
                processQueue(refreshError, null);

                // If refresh fails, clear tokens and redirect
                if (typeof window !== 'undefined') {
                    Cookies.remove(ACCESS_TOKEN_KEY);
                    Cookies.remove(REFRESH_TOKEN_KEY);
                    window.location.href = '/';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// Auth functions
export const auth = {
    login: async (email: string, password: string, turnstileToken?: string) => {
        const { data } = await api.post('/auth/login/admin-panel', { email, password, turnstileToken });
        if (data.authorization) {
            // Store tokens in cookies using env config
            Cookies.set(ACCESS_TOKEN_KEY, data.authorization.access_token, {
                expires: JWT_ACCESS_EXPIRATION,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
            Cookies.set(REFRESH_TOKEN_KEY, data.authorization.refresh_token, {
                expires: JWT_REFRESH_EXPIRATION,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
        }
        return data;
    },

    verifyLogin2FA: async (temp_token: string, code?: string, backup_code?: string) => {
        const body: Record<string, string> = { temp_token };
        if (code) body.two_factor_code = code;
        if (backup_code) body.backup_code = backup_code;

        const { data } = await api.post('/2fa/verify-login', body);

        if (data.authorization) {
            Cookies.set(ACCESS_TOKEN_KEY, data.authorization.access_token, {
                expires: JWT_ACCESS_EXPIRATION,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
            Cookies.set(REFRESH_TOKEN_KEY, data.authorization.refresh_token, {
                expires: JWT_REFRESH_EXPIRATION,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
        }
        return data;
    },

    getProfile: async () => {
        const { data } = await api.get('/account/profile');
        return data;
    },

    refreshToken: async (refresh_token: string) => {
        const { data } = await api.post('/auth/refresh', { refresh_token });
        return data;
    },

    logout: async () => {
        const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);
        try {
            await api.post('/auth/logout', { refresh_token: refreshToken });
        } finally {
            Cookies.remove(ACCESS_TOKEN_KEY);
            Cookies.remove(REFRESH_TOKEN_KEY);
        }
    },

    getToken: () => {
        if (typeof window !== 'undefined') {
            return Cookies.get(ACCESS_TOKEN_KEY) || null;
        }
        return null;
    },

    getRefreshToken: () => {
        if (typeof window !== 'undefined') {
            return Cookies.get(REFRESH_TOKEN_KEY) || null;
        }
        return null;
    },

    // Check if user has either access token or refresh token (can potentially be authenticated)
    isAuthenticated: () => {
        return !!auth.getToken() || !!auth.getRefreshToken();
    },

    // Check if has valid access token (no refresh needed)
    hasValidAccessToken: () => {
        return !!auth.getToken();
    },
};

// Filter condition interface
export interface FilterCondition {
    column: string;
    operator: 'equals' | 'not' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'isNull' | 'isNotNull';
    value?: string | number | boolean | null;
}

// Batch changes interface
export interface BatchChanges {
    created: Record<string, unknown>[];
    updated: { id: string; data: Record<string, unknown> }[];
    deleted: string[];
}

export interface AdminTableInfo {
    name: string;
    displayName: string;
}

export interface AdminTableStatistic {
    tableName: string;
    rowCount: number;
    columnCount?: number;
    sizeBytes?: number;
    lastUpdated?: string;
}

interface AdminTableSchema {
    tableName: string;
    displayName?: string;
    sensitiveFields?: string[];
    fields: Array<{
        name: string;
        type: string;
        isRequired: boolean;
        isList?: boolean;
        isId: boolean;
        isUnique?: boolean;
        hasDefaultValue: boolean;
        isRelation: boolean;
        enumValues?: string[];
    }>;
}

interface AdminRecordsMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface AdminRecordsResponse<T = Record<string, unknown>> {
    data: T[];
    meta: AdminRecordsMeta;
}

const unwrapArrayResponse = <T>(payload: unknown): T[] => {
    if (Array.isArray(payload)) {
        return payload as T[];
    }

    if (
        payload &&
        typeof payload === 'object' &&
        'data' in payload &&
        Array.isArray((payload as { data?: unknown }).data)
    ) {
        return (payload as { data: T[] }).data;
    }

    return [];
};

const unwrapSuccessData = <T>(payload: unknown): T => {
    if (
        payload &&
        typeof payload === 'object' &&
        'data' in payload
    ) {
        return (payload as { data: T }).data;
    }

    return payload as T;
};

const normalizeAdminRecordsResponse = <T>(payload: unknown): AdminRecordsResponse<T> => {
    const unwrapped = unwrapSuccessData<unknown>(payload);
    const source = (unwrapped && typeof unwrapped === 'object')
        ? unwrapped as Record<string, unknown>
        : {};

    const items = Array.isArray(source.data) ? source.data as T[] : [];
    const rawMeta = (source.meta && typeof source.meta === 'object')
        ? source.meta as Record<string, unknown>
        : {};
    const total = typeof rawMeta.total === 'number' ? rawMeta.total : items.length;
    const page = typeof rawMeta.page === 'number' ? rawMeta.page : 1;
    const limit = typeof rawMeta.limit === 'number' ? rawMeta.limit : Math.max(items.length, 1);
    const totalPages = typeof rawMeta.totalPages === 'number'
        ? rawMeta.totalPages
        : Math.max(1, Math.ceil(total / Math.max(limit, 1)));

    return {
        data: items,
        meta: {
            total,
            page,
            limit,
            totalPages,
        },
    };
};

// Admin API functions
export const adminApi = {
    // Tables
    getTables: async (): Promise<AdminTableInfo[]> => {
        const { data } = await api.get('/admin/tables');
        return unwrapArrayResponse<AdminTableInfo>(data);
    },

    // Statistics - Get all stats in one call
    getStatistics: async (): Promise<AdminTableStatistic[]> => {
        const { data } = await api.get('/admin/statistics');
        return unwrapArrayResponse<AdminTableStatistic>(data);
    },

    getTableSchema: async (tableName: string) => {
        const { data } = await api.get(`/admin/tables/${tableName}/schema`);
        return unwrapSuccessData<AdminTableSchema>(data);
    },

    // Records
    getRecords: async (
        tableName: string,
        options?: {
            page?: number;
            limit?: number;
            orderBy?: string;
            orderDirection?: 'asc' | 'desc';
            filters?: FilterCondition[];
        }
    ) => {
        const params = new URLSearchParams();
        if (options?.page) params.append('page', String(options.page));
        if (options?.limit) params.append('limit', String(options.limit));
        if (options?.orderBy) params.append('orderBy', options.orderBy);
        if (options?.orderDirection) params.append('orderDirection', options.orderDirection);
        if (options?.filters && options.filters.length > 0) {
            params.append('filters', JSON.stringify(options.filters));
        }

        const { data } = await api.get(`/admin/tables/${tableName}?${params.toString()}`);
        return normalizeAdminRecordsResponse(data);
    },

    getRecord: async (tableName: string, id: string) => {
        const { data } = await api.get(`/admin/tables/${tableName}/${id}`);
        return unwrapSuccessData<Record<string, unknown>>(data);
    },

    createRecord: async (tableName: string, recordData: Record<string, unknown>) => {
        const { data } = await api.post(`/admin/tables/${tableName}`, recordData);
        return unwrapSuccessData<Record<string, unknown>>(data);
    },

    updateRecord: async (tableName: string, id: string, recordData: Record<string, unknown>) => {
        const { data } = await api.put(`/admin/tables/${tableName}/${id}`, recordData);
        return unwrapSuccessData<Record<string, unknown>>(data);
    },

    deleteRecord: async (tableName: string, id: string) => {
        const { data } = await api.delete(`/admin/tables/${tableName}/${id}`);
        return unwrapSuccessData<{ success: boolean; message: string }>(data);
    },

    // Batch operations
    batchUpdate: async (tableName: string, changes: BatchChanges) => {
        const { data } = await api.post(`/admin/tables/${tableName}/batch`, changes);
        return unwrapSuccessData<{
            created: Record<string, unknown>[];
            updated: Record<string, unknown>[];
            deleted: string[];
            errors: { type: string; id?: string; error: string }[];
        }>(data);
    },

    bulkDelete: async (tableName: string, ids: string[]) => {
        const { data } = await api.delete(`/admin/tables/${tableName}/bulk`, { data: { ids } });
        return unwrapSuccessData<{
            deleted: string[];
            errors: { id: string; error: string }[];
        }>(data);
    },

    // Lấy tất cả records để xuất (không phân trang)
    exportRecords: async (
        tableName: string,
        options?: {
            orderBy?: string;
            orderDirection?: 'asc' | 'desc';
            filters?: FilterCondition[];
        }
    ) => {
        const params = new URLSearchParams();
        // Lấy tối đa 10000 records
        params.append('limit', '10000');
        params.append('page', '1');
        if (options?.orderBy) params.append('orderBy', options.orderBy);
        if (options?.orderDirection) params.append('orderDirection', options.orderDirection);
        if (options?.filters && options.filters.length > 0) {
            params.append('filters', JSON.stringify(options.filters));
        }

        const { data } = await api.get(`/admin/tables/${tableName}?${params.toString()}`);
        return normalizeAdminRecordsResponse(data);
    },

    // Diagram API
    getDiagramSchema: async () => {
        const { data } = await api.get('/admin/diagram/schema');
        return unwrapSuccessData(data);
    },

    getDiagramConfig: async (name?: string) => {
        const params = name ? `?name=${name}` : '';
        const { data } = await api.get(`/admin/diagram/config${params}`);
        return unwrapSuccessData(data);
    },

    saveDiagramConfig: async (config: {
        name?: string;
        node_positions?: Record<string, { x: number; y: number }>;
        table_colors?: Record<string, string>;
        show_relations?: boolean;
        dark_mode?: boolean;
    }) => {
        const { data } = await api.put('/admin/diagram/config', config);
        return unwrapSuccessData(data);
    },

    // Raw SQL Query Execution
    executeRawQuery: async (query: string) => {
        const { data } = await api.post('/admin/query/execute', { query });
        return unwrapSuccessData(data);
    },
};

// Feature Flag types
export interface FeatureFlag {
    id: string;
    module: string;
    method: string;
    path: string;
    is_active: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface FeatureFlagLog {
    id: string;
    feature_flag_id: string;
    action: 'ENABLED' | 'DISABLED' | 'CREATED' | 'DELETED';
    previous_state: boolean;
    new_state: boolean;
    user_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    description: string | null;
    created_at: string;
}

// Feature Flag API functions
export const featureFlagApi = {
    getAll: async (options?: {
        page?: number;
        limit?: number;
        module?: string;
        isActive?: boolean;
        includeDeleted?: boolean;
        search?: string;
    }): Promise<{ data: FeatureFlag[]; total: number }> => {
        const params = new URLSearchParams();
        if (options?.page) params.append('page', String(options.page));
        if (options?.limit) params.append('limit', String(options.limit));
        if (options?.module) params.append('module', options.module);
        if (options?.isActive !== undefined) params.append('isActive', String(options.isActive));
        if (options?.includeDeleted) params.append('includeDeleted', 'true');
        if (options?.search) params.append('search', options.search);

        const { data } = await api.get(`/admin/feature-flags?${params.toString()}`);
        return data;
    },

    getById: async (id: string): Promise<FeatureFlag & { logs?: FeatureFlagLog[] }> => {
        const { data } = await api.get(`/admin/feature-flags/${id}`);
        return data;
    },

    getModules: async (): Promise<string[]> => {
        const { data } = await api.get('/admin/feature-flags/modules');
        return data;
    },

    toggle: async (id: string, isActive: boolean): Promise<FeatureFlag> => {
        const { data } = await api.put(`/admin/feature-flags/${id}`, { is_active: isActive });
        return data;
    },

    bulkToggle: async (ids: string[], isActive: boolean): Promise<{ updated: number }> => {
        const { data } = await api.put('/admin/feature-flags/bulk/toggle', { ids, is_active: isActive });
        return data;
    },

    getLogs: async (id: string, options?: { page?: number; limit?: number }): Promise<{ data: FeatureFlagLog[]; total: number }> => {
        const params = new URLSearchParams();
        if (options?.page) params.append('page', String(options.page));
        if (options?.limit) params.append('limit', String(options.limit));

        const { data } = await api.get(`/admin/feature-flags/${id}/logs?${params.toString()}`);
        return data;
    },

    getStats: async (): Promise<{ total: number; active: number; inactive: number }> => {
        const { data } = await api.get('/admin/feature-flags/stats');
        return data;
    },
};

// Resources API types
export interface ServiceMetrics {
    service: string;
    status: 'online' | 'offline' | 'unknown';
    cpu: { usage: number; cores: number };
    memory: { used: number; total: number; percentage: number };
    disk: { used: number; total: number; percentage: number };
    network: { bytesIn: number; bytesOut: number; bytesInPerSec: number; bytesOutPerSec: number };
    uptime: number;
    lastUpdated: string;
    responseTime?: number;
}

export interface ResourcesOverview {
    totalServices: number;
    onlineServices: number;
    offlineServices: number;
    averageCpu: number;
    averageMemory: number;
    averageDisk: number;
    timestamp: string;
}

export interface ResourcesData {
    services: ServiceMetrics[];
    overview: ResourcesOverview;
}

export const resourcesApi = {
    getStats: async (): Promise<ResourcesData> => {
        const { data } = await api.get('/admin/resources/stats');
        return data.data;
    },

    getOverview: async (): Promise<ResourcesOverview> => {
        const { data } = await api.get('/admin/resources/overview');
        return data.data;
    },
};

// Socket.io connection for resources realtime updates
let socket: Socket | null = null;

export const resourcesSocket = {
    connect: (): Socket => {
        if (socket?.connected) return socket;

        const token = auth.getToken();

        socket = io(`${API_URL}/resources`, {
            transports: ['websocket', 'polling'],
            auth: { token },
        });

        return socket;
    },

    disconnect: () => {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    },

    subscribe: (callback: (data: ResourcesData) => void) => {
        if (!socket) return;

        socket.emit('resources:subscribe', {});
        socket.on('resources:update', (event: { data: ResourcesData }) => {
            callback(event.data);
        });
    },

    unsubscribe: () => {
        if (!socket) return;
        socket.emit('resources:unsubscribe');
        socket.off('resources:update');
    },

    getSocket: () => socket,
};

export interface SystemLog {
    id: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
    module: string;
    action: string;
    message: string;
    meta_data?: Record<string, unknown>;
    user_id?: string;
    user?: { id: string; name: string; email: string } | null;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

export interface SystemLogsStats {
    total: number;
    recentCount: number;
    byLevel: Record<string, number>;
}

const normalizeSystemLogsResponse = (
    payload: unknown
): { data: SystemLog[]; meta: { total: number; page: number; limit: number; totalPages: number } } => {
    const source = (payload && typeof payload === 'object' && 'data' in payload && payload.data && typeof payload.data === 'object')
        ? payload.data as Record<string, unknown>
        : payload as Record<string, unknown> | undefined;

    const logs = Array.isArray(source?.data)
        ? source.data as SystemLog[]
        : Array.isArray(source?.items)
            ? source.items as SystemLog[]
            : Array.isArray(payload)
                ? payload as SystemLog[]
                : [];

    const rawMeta = (source?.meta && typeof source.meta === 'object' ? source.meta : {}) as Record<string, unknown>;
    const total = typeof rawMeta.total === 'number' ? rawMeta.total : logs.length;
    const page = typeof rawMeta.page === 'number' ? rawMeta.page : 1;
    const limit = typeof rawMeta.limit === 'number' ? rawMeta.limit : logs.length;
    const totalPages = typeof rawMeta.totalPages === 'number'
        ? rawMeta.totalPages
        : Math.max(1, Math.ceil(total / Math.max(1, limit)));

    return {
        data: logs,
        meta: { total, page, limit, totalPages },
    };
};

const normalizeSystemLogsStats = (payload: unknown): SystemLogsStats => {
    const source = (payload && typeof payload === 'object' && 'data' in payload && payload.data && typeof payload.data === 'object')
        ? payload.data as Record<string, unknown>
        : payload as Record<string, unknown> | undefined;

    const byLevelRaw = (source?.byLevel && typeof source.byLevel === 'object') ? source.byLevel as Record<string, unknown> : {};

    return {
        total: typeof source?.total === 'number' ? source.total : 0,
        recentCount: typeof source?.recentCount === 'number' ? source.recentCount : 0,
        byLevel: {
            INFO: typeof byLevelRaw.INFO === 'number' ? byLevelRaw.INFO : 0,
            WARN: typeof byLevelRaw.WARN === 'number' ? byLevelRaw.WARN : 0,
            ERROR: typeof byLevelRaw.ERROR === 'number' ? byLevelRaw.ERROR : 0,
            DEBUG: typeof byLevelRaw.DEBUG === 'number' ? byLevelRaw.DEBUG : 0,
        },
    };
};

const normalizeSystemLogsStringList = (payload: unknown): string[] => {
    if (Array.isArray(payload)) return payload.filter((item): item is string => typeof item === 'string');
    if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
        return (payload as { data: unknown[] }).data.filter((item): item is string => typeof item === 'string');
    }
    return [];
};

export const systemLogsApi = {
    getAll: async (options?: {
        page?: number;
        limit?: number;
        level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
        module?: string;
        search?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{ data: SystemLog[]; meta: { total: number; page: number; limit: number; totalPages: number } }> => {
        const params = new URLSearchParams();
        if (options?.page) params.append('page', String(options.page));
        if (options?.limit) {
            const normalizedLimit = Math.max(1, Math.min(100, options.limit));
            params.append('limit', String(normalizedLimit));
        }
        if (options?.level) params.append('level', options.level);
        if (options?.module) params.append('module', options.module);
        if (options?.search) params.append('search', options.search);
        if (options?.startDate) params.append('startDate', options.startDate);
        if (options?.endDate) params.append('endDate', options.endDate);

        const { data } = await api.get(`/admin/system-logs?${params.toString()}`);
        return normalizeSystemLogsResponse(data);
    },

    exportAll: async (options?: {
        level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
        module?: string;
        search?: string;
        startDate?: string;
        endDate?: string;
        maxLogs?: number;
    }): Promise<SystemLog[]> => {
        const pageSize = 100;
        const requestedMax = typeof options?.maxLogs === 'number' && options.maxLogs > 0
            ? Math.floor(options.maxLogs)
            : undefined;

        let page = 1;
        let totalPages = 1;
        const allLogs: SystemLog[] = [];

        do {
            const response = await systemLogsApi.getAll({
                page,
                limit: pageSize,
                level: options?.level,
                module: options?.module,
                search: options?.search,
                startDate: options?.startDate,
                endDate: options?.endDate,
            });

            if (!Array.isArray(response.data) || response.data.length === 0) {
                break;
            }

            allLogs.push(...response.data);

            if (requestedMax && allLogs.length >= requestedMax) {
                return allLogs.slice(0, requestedMax);
            }

            totalPages = response.meta?.totalPages ?? page;
            page += 1;
        } while (page <= totalPages);

        return allLogs;
    },

    getStats: async (): Promise<SystemLogsStats> => {
        const { data } = await api.get('/admin/system-logs/stats');
        return normalizeSystemLogsStats(data);
    },

    getModules: async (): Promise<string[]> => {
        const { data } = await api.get('/admin/system-logs/modules');
        return normalizeSystemLogsStringList(data);
    },

    getLevels: async (): Promise<string[]> => {
        const { data } = await api.get('/admin/system-logs/levels');
        return normalizeSystemLogsStringList(data);
    },
};

// Socket.io connection for system logs realtime updates
let systemLogsSocketInstance: Socket | null = null;

export const systemLogsSocket = {
    connect: (): Socket => {
        if (systemLogsSocketInstance?.connected) return systemLogsSocketInstance;

        const token = auth.getToken();

        systemLogsSocketInstance = io(API_URL, {
            transports: ['websocket', 'polling'],
            auth: { token },
        });

        return systemLogsSocketInstance;
    },

    disconnect: () => {
        if (systemLogsSocketInstance) {
            systemLogsSocketInstance.emit('systemLog:unsubscribe');
            systemLogsSocketInstance.disconnect();
            systemLogsSocketInstance = null;
        }
    },

    subscribe: (callback: (log: SystemLog) => void) => {
        if (!systemLogsSocketInstance) return;

        systemLogsSocketInstance.emit('systemLog:subscribe');
        systemLogsSocketInstance.on('systemLog:new', (log: SystemLog) => {
            callback(log);
        });
    },

    unsubscribe: () => {
        if (!systemLogsSocketInstance) return;
        systemLogsSocketInstance.emit('systemLog:unsubscribe');
        systemLogsSocketInstance.off('systemLog:new');
    },

    getSocket: () => systemLogsSocketInstance,
};

// Backup API types
export interface BackupItem {
    id: string;
    fileName: string;
    fileSize: number;
    backupType: 'SCHEDULED' | 'MANUAL_API' | 'MANUAL_DISCORD';
    createdAt: string;
    triggeredBy: string;
}

export interface BackupListResponse {
    items: BackupItem[];
    total: number;
}

export interface TriggerBackupResponse {
    id: string;
    fileName: string;
    fileSize: number;
    driveFileId: string;
    driveFileUrl?: string;
    backupType: string;
    createdAt: string;
    triggeredBy: string;
}

export interface DownloadUrlResponse {
    downloadUrl: string;
    expiresIn: number;
    expiresAt: string;
}

// Backup API functions
export const backupApi = {
    listBackups: async (key: string, options?: {
        limit?: number;
        offset?: number;
        keywords?: string;
    }): Promise<BackupListResponse> => {
        const params = new URLSearchParams();
        params.append('key', key);
        if (options?.limit) params.append('limit', String(options.limit));
        if (options?.offset) params.append('offset', String(options.offset));
        if (options?.keywords) params.append('keywords', options.keywords);

        const { data } = await api.get(`/admin/backups?${params.toString()}`);
        return data.data;
    },

    triggerBackup: async (key: string): Promise<TriggerBackupResponse> => {
        const { data } = await api.post('/admin/backups/trigger', { key });
        return data.data;
    },

    getDownloadUrl: async (id: string, key: string): Promise<DownloadUrlResponse> => {
        const { data } = await api.post(`/admin/backups/${id}/download-url`, { key });
        return data.data;
    },
};

export interface UserListItem {
    id: string;
    name: string;
    email: string | null;
    email_confirmed: boolean;
    is_verified: boolean | null;
    is_banned: boolean | null;
    banned_end: string | null;
    is_online: boolean;
    last_online: string | null;
    created_at: string;
    warning_count?: number;
}

export interface UserWarningCategory {
    id: string;
    name: string;
    severity: number;
}

export interface UserWarningItem {
    id: string;
    reason: string;
    is_permanent: boolean;
    expires_at: string | null;
    is_active: boolean;
    created_at: string;
    removed_at: string | null;
    warned_by: string;
    removed_by: string | null;
    category: UserWarningCategory;
}

export interface UserDetail extends UserListItem {
    banned_start?: string | null;
    banned_reason?: string | null;
    banned_by?: string | null;
    active_warnings?: UserWarningItem[];
    roles?: { id: string; name: string }[];
}

export interface UserSession {
    id: string;
    ip: string | null;
    location: string | null;
    device: string | null;
    os: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface UserRolesAndPermissions {
    roles: {
        id: string;
        name: string;
        description: string | null;
        is_active: boolean | null;
    }[];
    permissions: {
        id: string;
        key: string;
        name: string;
        description: string | null;
        source: 'direct' | 'role';
        is_denied?: boolean;
    }[];
}

export interface UserListResponse {
    items: UserListItem[];
    total: number;
    limit: number;
    offset: number;
}

export interface UserWarningsResponse {
    items: UserWarningItem[];
    total: number;
    limit: number;
    offset: number;
}

export interface UserSessionsResponse {
    items: UserSession[];
    total: number;
    limit: number;
    offset: number;
}

export const userManagementApi = {
    getUsers: async (options?: {
        limit?: number;
        offset?: number;
        keywords?: string;
        status?: 'active' | 'banned' | 'verified' | 'unverified';
    }): Promise<UserListResponse> => {
        const params = new URLSearchParams();
        if (options?.limit) params.append('limit', String(options.limit));
        if (options?.offset) params.append('offset', String(options.offset));
        if (options?.keywords) params.append('keywords', options.keywords);
        if (options?.status) params.append('status', options.status);

        const { data } = await api.get(`/admin/users?${params.toString()}`);
        return data.data;
    },

    getStats: async (): Promise<{
        total: number;
        online: number;
        active: number;
        warned: number;
        banned: number;
    }> => {
        const { data } = await api.get('/admin/users/stats');
        return data.data;
    },

    getUserById: async (id: string): Promise<UserDetail> => {
        const { data } = await api.get(`/admin/users/${id}`);
        return data.data;
    },

    banUser: async (id: string, dto: {
        reason: string;
        is_permanent?: boolean;
        duration_value?: number;
        duration_type?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
    }): Promise<UserDetail> => {
        const { data } = await api.post(`/admin/users/${id}/ban`, dto);
        return data.data;
    },

    unbanUser: async (id: string, dto?: { note?: string }): Promise<UserDetail> => {
        const { data } = await api.post(`/admin/users/${id}/unban`, dto || {});
        return data.data;
    },

    getUserWarnings: async (id: string, options?: {
        limit?: number;
        offset?: number;
        status?: 'active' | 'removed' | 'expired';
    }): Promise<UserWarningsResponse> => {
        const params = new URLSearchParams();
        if (options?.limit) params.append('limit', String(options.limit));
        if (options?.offset) params.append('offset', String(options.offset));
        if (options?.status) params.append('status', options.status);

        const { data } = await api.get(`/admin/users/${id}/warnings?${params.toString()}`);
        return data.data;
    },

    warnUser: async (id: string, dto: {
        category_id: string;
        reason: string;
        is_permanent?: boolean;
        duration_value?: number;
        duration_type?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
    }): Promise<UserWarningItem> => {
        const { data } = await api.post(`/admin/users/${id}/warn`, dto);
        return data.data;
    },

    unwarnUser: async (id: string, warningId: string, dto?: { note?: string }): Promise<void> => {
        await api.post(`/admin/users/${id}/unwarn/${warningId}`, dto || {});
    },

    getUserSessions: async (id: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<UserSessionsResponse> => {
        const params = new URLSearchParams();
        if (options?.limit) params.append('limit', String(options.limit));
        if (options?.offset) params.append('offset', String(options.offset));

        const { data } = await api.get(`/admin/users/${id}/sessions?${params.toString()}`);
        return data.data;
    },

    revokeSession: async (id: string, sessionId: string): Promise<void> => {
        await api.delete(`/admin/users/${id}/sessions/${sessionId}`);
    },

    revokeAllSessions: async (id: string): Promise<void> => {
        await api.delete(`/admin/users/${id}/sessions`);
    },

    getUserRolesAndPermissions: async (id: string): Promise<UserRolesAndPermissions> => {
        const { data } = await api.get(`/admin/users/${id}/roles-permissions`);
        return data.data;
    },

    assignUserRolesPermissions: async (id: string, dto: {
        role_ids?: string[];
        permission_ids?: string[];
        denied_permission_ids?: string[];
    }): Promise<UserRolesAndPermissions> => {
        const { data } = await api.put(`/admin/users/${id}/roles-permissions`, dto);
        return data.data;
    },

    // Bulk operations
    bulkBanUsers: async (dto: {
        user_ids: string[];
        reason: string;
        is_permanent?: boolean;
        duration_value?: number;
        duration_type?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
    }): Promise<{ count: number }> => {
        const { data } = await api.post('/admin/users/bulk/ban', dto);
        return data.data;
    },

    bulkUnbanUsers: async (dto: {
        user_ids: string[];
        note?: string;
    }): Promise<{ count: number }> => {
        const { data } = await api.post('/admin/users/bulk/unban', dto);
        return data.data;
    },

    bulkWarnUsers: async (dto: {
        user_ids: string[];
        category_id: string;
        reason: string;
        is_permanent?: boolean;
        duration_value?: number;
        duration_type?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
    }): Promise<{ count: number }> => {
        const { data } = await api.post('/admin/users/bulk/warn', dto);
        return data.data;
    },

    clearAllWarnings: async (id: string, dto?: { note?: string }): Promise<{ count: number }> => {
        const { data } = await api.delete(`/admin/users/${id}/warnings`, { data: dto || {} });
        return data.data;
    },

    bulkClearAllWarnings: async (dto: {
        user_ids: string[];
        note?: string;
    }): Promise<{ count: number }> => {
        const { data } = await api.delete('/admin/users/bulk/warnings', { data: dto });
        return data.data;
    },

    // User notifications (admin view)
    getUserNotifications: async (userId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{ items: UserNotification[]; total: number }> => {
        const params = new URLSearchParams();
        if (options?.limit) params.append('limit', String(options.limit));
        if (options?.offset) params.append('offset', String(options.offset));

        const { data } = await api.get(`/user-notifications/user/${userId}?${params.toString()}`);
        return data.data;
    },

    sendNotification: async (dto: {
        user_id: string;
        title: string;
        content: string;
        type?: string;
        url?: string;
    }): Promise<UserNotification> => {
        const { data } = await api.post('/user-notifications/send', dto);
        return data.data;
    },

    bulkSendNotification: async (dto: {
        user_ids: string[];
        title: string;
        content: string;
        type?: string;
    }): Promise<{ count: number }> => {
        const { data } = await api.post('/user-notifications/send-bulk', dto);
        return data.data;
    },
};

// User Notification type
export interface UserNotification {
    id: string;
    user_id: string;
    title: string;
    content: string;
    type: string;
    url: string | null;
    is_read: boolean;
    created_at: string;
}

export interface Role {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean | null;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface RolePermission {
    id: string;
    key: string;
    name: string;
    description: string | null;
}

export interface RoleWithPermissions extends Role {
    permissions: RolePermission[];
}

export interface RolesListResponse {
    data: Role[];
    total: number;
    limit: number;
    offset: number;
}

export const rolesApi = {
    getRoles: async (options?: {
        limit?: string;
        offset?: string;
        keywords?: string;
        status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
    }): Promise<RolesListResponse> => {
        const params = new URLSearchParams();
        if (options?.limit) params.append('limit', options.limit);
        if (options?.offset) params.append('offset', options.offset);
        if (options?.keywords) params.append('keywords', options.keywords);
        if (options?.status) params.append('status', options.status);

        const { data } = await api.get(`/roles?${params.toString()}`);
        return data.data;
    },

    getRoleById: async (id: string): Promise<RoleWithPermissions> => {
        const { data } = await api.get(`/roles/${id}`);
        return data.data;
    },

    createRole: async (dto: {
        name: string;
        description?: string;
        is_default?: boolean;
        permission_ids?: string[];
    }): Promise<Role> => {
        const { data } = await api.post('/roles', dto);
        return data.data;
    },

    updateRole: async (id: string, dto: {
        name?: string;
        description?: string;
        is_default?: boolean;
        is_active?: boolean;
        permission_ids?: string[];
    }): Promise<Role> => {
        const { data } = await api.put(`/roles/${id}`, dto);
        return data.data;
    },

    deleteRole: async (id: string): Promise<void> => {
        await api.delete(`/roles/${id}`);
    },

    deleteRoles: async (ids: string[]): Promise<void> => {
        await api.delete('/roles/delete/many', { data: { ids } });
    },
};

export interface Permission {
    id: string;
    key: string;
    name: string;
    description: string | null;
    is_active: boolean | null;
    created_at: string;
    updated_at: string;
}

export interface PermissionWithAssignment extends Permission {
    is_assigned: boolean;
}

export interface PermissionsListResponse {
    data: Permission[];
    total: number;
    limit: number;
    offset: number;
}

export interface PermissionsWithAssignmentListResponse {
    data: PermissionWithAssignment[];
    total: number;
    limit: number;
    offset: number;
}

export const permissionsApi = {
    getPermissions: async (options?: {
        limit?: string;
        offset?: string;
        keywords?: string;
        status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
        type?: 'role' | 'user';
        id?: string;
        module?: string;
    }): Promise<PermissionsListResponse | PermissionsWithAssignmentListResponse> => {
        const params = new URLSearchParams();
        if (options?.limit) params.append('limit', options.limit);
        if (options?.offset) params.append('offset', options.offset);
        if (options?.keywords) params.append('keywords', options.keywords);
        if (options?.status) params.append('status', options.status);
        if (options?.type) params.append('type', options.type);
        if (options?.id) params.append('id', options.id);
        if (options?.module) params.append('module', options.module);

        const { data } = await api.get(`/permissions?${params.toString()}`);
        return data.data;
    },

    getModules: async (): Promise<string[]> => {
        const { data } = await api.get('/permissions/modules');
        return data.data || [];
    },

    getByRoleIds: async (roleIds: string[]): Promise<string[]> => {
        const { data } = await api.post('/permissions/by-roles', { role_ids: roleIds });
        return data.data || [];
    },
};

export interface WarningCategory {
    id: string;
    name: string;
    description: string | null;
    severity: number;
    is_active: boolean;
}

export const warningCategoriesApi = {
    getCategories: async (): Promise<WarningCategory[]> => {
        const { data } = await api.get('/admin/warning-categories');
        // Handle different response formats
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.items)) return data.items;
        return [];
    },
};

export default api;

