import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';

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

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
            if (isRefreshing) {
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
                        Cookies.set(ACCESS_TOKEN_KEY, authorization.access_token, {
                            expires: 1 / 96,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'strict',
                        });

                        api.defaults.headers.common['Authorization'] = `Bearer ${authorization.access_token}`;
                        originalRequest.headers.Authorization = `Bearer ${authorization.access_token}`;

                        processQueue(null, authorization.access_token);
                        return api(originalRequest);
                    }
                }

                processQueue(new Error('Refresh token missing or invalid'), null);
                return Promise.reject(error);

            } catch (refreshError) {
                processQueue(refreshError, null);

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
        const { data } = await api.post('/auth/login/resources-panel', { email, password, turnstileToken });
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

// Resources API
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

// Socket.io connection for realtime updates
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

export default api;
