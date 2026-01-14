'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    name: string;
    email: string;
}

interface LoginResponse {
    success?: boolean;
    code?: string;
    data?: {
        requires_2fa?: boolean;
        temp_token?: string;
        user?: User;
    };
    authorization?: {
        access_token: string;
        refresh_token: string;
    };
}

interface AuthContextType {
    user: User | null;
    permissions: string[];
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string, turnstileToken?: string) => Promise<LoginResponse>;
    logout: () => Promise<void>;
    verify2FA: (temp_token: string, code?: string, backup_code?: string) => Promise<LoginResponse>;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchProfile = async () => {
        try {
            const data = await auth.getProfile();
            if (data.success && data.data?.user) {
                setUser(data.data.user);
                // Lưu permissions từ profile API
                // Profile API trả về [{id, name, key, ...}] nên cần map lấy .key
                if (data.data.permissions && Array.isArray(data.data.permissions)) {
                    const permissionKeys = data.data.permissions.map(
                        (p: { key?: string }) => p.key
                    ).filter((key: string | undefined): key is string => !!key);
                    setPermissions(permissionKeys);
                }
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
    };

    useEffect(() => {
        // Check if user is already logged in
        const checkAuth = async () => {
            // Check if has any token (access or refresh)
            const isAuth = auth.isAuthenticated();
            if (isAuth) {
                try {
                    // Try to fetch profile - if access token is missing/expired,
                    // the interceptor will automatically use refresh token to get new one
                    await fetchProfile();
                } catch (error) {
                    // If profile fetch fails (including after refresh attempt), user stays logged out
                    console.log('Auth check failed:', error);
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string, turnstileToken?: string) => {
        setIsLoading(true);
        try {
            const data = await auth.login(email, password, turnstileToken);
            // Return data so the UI can check for requires_2fa
            if (data.data?.requires_2fa) {
                // Do not set user yet
                return data;
            }

            // Login thành công khi có authorization (tokens)
            if (data.authorization) {
                // Fetch full profile to get roles permissions etc
                await fetchProfile();
                window.location.href = '/dashboard';
            }
            return data;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const verify2FA = async (temp_token: string, code?: string, backup_code?: string) => {
        setIsLoading(true);
        try {
            const data = await auth.verifyLogin2FA(temp_token, code, backup_code);
            if (data.success) {
                await fetchProfile();
                window.location.href = '/dashboard';
            }
            return data;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    }

    const logout = async () => {
        setIsLoading(true);
        try {
            await auth.logout();
            setUser(null);
            setPermissions([]);
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper để kiểm tra permission
    const hasPermission = (permission: string): boolean => {
        return permissions.includes(permission);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                permissions,
                isLoading,
                isAuthenticated: !!user,
                login,
                verify2FA,
                logout,
                hasPermission,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
