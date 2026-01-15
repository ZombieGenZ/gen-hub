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
const api: AxiosInstance = axios.create({
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

// Admin API functions
export const adminApi = {
    // Tables
    getTables: async () => {
        const { data } = await api.get('/admin/tables');
        return data;
    },

    // Statistics - Get all stats in one call
    getStatistics: async () => {
        const { data } = await api.get('/admin/statistics');
        return data;
    },

    getTableSchema: async (tableName: string) => {
        const { data } = await api.get(`/admin/tables/${tableName}/schema`);
        return data;
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
        return data;
    },

    getRecord: async (tableName: string, id: string) => {
        const { data } = await api.get(`/admin/tables/${tableName}/${id}`);
        return data;
    },

    createRecord: async (tableName: string, recordData: Record<string, unknown>) => {
        const { data } = await api.post(`/admin/tables/${tableName}`, recordData);
        return data;
    },

    updateRecord: async (tableName: string, id: string, recordData: Record<string, unknown>) => {
        const { data } = await api.put(`/admin/tables/${tableName}/${id}`, recordData);
        return data;
    },

    deleteRecord: async (tableName: string, id: string) => {
        const { data } = await api.delete(`/admin/tables/${tableName}/${id}`);
        return data;
    },

    // Batch operations
    batchUpdate: async (tableName: string, changes: BatchChanges) => {
        const { data } = await api.post(`/admin/tables/${tableName}/batch`, changes);
        return data;
    },

    bulkDelete: async (tableName: string, ids: string[]) => {
        const { data } = await api.delete(`/admin/tables/${tableName}/bulk`, { data: { ids } });
        return data;
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
        return data;
    },

    // Diagram API
    getDiagramSchema: async () => {
        const { data } = await api.get('/admin/diagram/schema');
        return data;
    },

    getDiagramConfig: async (name?: string) => {
        const params = name ? `?name=${name}` : '';
        const { data } = await api.get(`/admin/diagram/config${params}`);
        return data;
    },

    saveDiagramConfig: async (config: {
        name?: string;
        node_positions?: Record<string, { x: number; y: number }>;
        table_colors?: Record<string, string>;
        show_relations?: boolean;
        dark_mode?: boolean;
    }) => {
        const { data } = await api.put('/admin/diagram/config', config);
        return data;
    },

    // Raw SQL Query Execution
    executeRawQuery: async (query: string) => {
        const { data } = await api.post('/admin/query/execute', { query });
        return data;
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
        if (options?.limit) params.append('limit', String(options.limit));
        if (options?.level) params.append('level', options.level);
        if (options?.module) params.append('module', options.module);
        if (options?.search) params.append('search', options.search);
        if (options?.startDate) params.append('startDate', options.startDate);
        if (options?.endDate) params.append('endDate', options.endDate);

        const { data } = await api.get(`/admin/system-logs?${params.toString()}`);
        return data;
    },

    getStats: async (): Promise<SystemLogsStats> => {
        const { data } = await api.get('/admin/system-logs/stats');
        return data;
    },

    getModules: async (): Promise<string[]> => {
        const { data } = await api.get('/admin/system-logs/modules');
        return data;
    },

    getLevels: async (): Promise<string[]> => {
        const { data } = await api.get('/admin/system-logs/levels');
        return data;
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

export default api;

