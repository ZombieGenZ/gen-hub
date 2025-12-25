import axios, { AxiosInstance, AxiosError } from 'axios';

import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Token storage keys
const ACCESS_TOKEN_KEY = 'admin_access_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';

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

// Response interceptor - Handle errors
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as (typeof error.config) & { _retry?: boolean };
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);
                if (refreshToken) {
                    const { authorization } = await auth.refreshToken(refreshToken);
                    if (authorization?.access_token) {
                        // Update token in cookies
                        Cookies.set(ACCESS_TOKEN_KEY, authorization.access_token, {
                            expires: 1 / 96, // ~15 mins
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'strict',
                        });
                        // Retry original request with new token
                        originalRequest.headers.Authorization = `Bearer ${authorization.access_token}`;
                        return api(originalRequest);
                    }
                }
            } catch {
                // If refresh fails, clear tokens and redirect
                if (typeof window !== 'undefined') {
                    Cookies.remove(ACCESS_TOKEN_KEY);
                    Cookies.remove(REFRESH_TOKEN_KEY);
                    window.location.href = '/';
                }
            }
        }
        return Promise.reject(error);
    }
);

// Auth functions
export const auth = {
    login: async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (data.authorization) {
            // Store tokens in cookies
            // Access token expires in 15 minutes (or match server config)
            // Refresh token expires in 7 days
            Cookies.set(ACCESS_TOKEN_KEY, data.authorization.access_token, {
                expires: 1 / 96, // ~15 mins
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
            Cookies.set(REFRESH_TOKEN_KEY, data.authorization.refresh_token, {
                expires: 7, // 7 days
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
                expires: 1 / 96,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
            Cookies.set(REFRESH_TOKEN_KEY, data.authorization.refresh_token, {
                expires: 7,
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

    isAuthenticated: () => {
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
};

export default api;
