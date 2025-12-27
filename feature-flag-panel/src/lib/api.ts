import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

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
                            expires: 1 / 96, // ~15 mins
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
    login: async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (data.authorization) {
            // Store tokens in cookies
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
    // Get all feature flags with pagination
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

    // Get feature flag by ID
    getById: async (id: string): Promise<FeatureFlag & { logs?: FeatureFlagLog[] }> => {
        const { data } = await api.get(`/admin/feature-flags/${id}`);
        return data;
    },

    // Get all modules
    getModules: async (): Promise<string[]> => {
        const { data } = await api.get('/admin/feature-flags/modules');
        return data;
    },

    // Toggle feature flag
    toggle: async (id: string, isActive: boolean): Promise<FeatureFlag> => {
        const { data } = await api.put(`/admin/feature-flags/${id}`, { is_active: isActive });
        return data;
    },

    // Bulk toggle feature flags
    bulkToggle: async (ids: string[], isActive: boolean): Promise<{ updated: number }> => {
        const { data } = await api.put('/admin/feature-flags/bulk/toggle', { ids, is_active: isActive });
        return data;
    },

    // Get logs for a feature flag
    getLogs: async (id: string, options?: { page?: number; limit?: number }): Promise<{ data: FeatureFlagLog[]; total: number }> => {
        const params = new URLSearchParams();
        if (options?.page) params.append('page', String(options.page));
        if (options?.limit) params.append('limit', String(options.limit));

        const { data } = await api.get(`/admin/feature-flags/${id}/logs?${params.toString()}`);
        return data;
    },

    // Reload cache
    reloadCache: async (): Promise<{ message: string }> => {
        const { data } = await api.put('/admin/feature-flags/cache/reload');
        return data;
    },

    // Get stats (total counts)
    getStats: async (): Promise<{ total: number; active: number; inactive: number }> => {
        const { data } = await api.get('/admin/feature-flags/stats');
        return data;
    },
};

export default api;
