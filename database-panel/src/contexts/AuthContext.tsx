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
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<LoginResponse>;
    logout: () => Promise<void>;
    verify2FA: (temp_token: string, code?: string, backup_code?: string) => Promise<LoginResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchProfile = async () => {
        try {
            const data = await auth.getProfile();
            if (data.success && data.data?.user) {
                // Check permissions
                const permissions: string[] = data.data.permissions || [];
                if (!permissions.includes('database.admin')) {
                    await auth.logout();
                    setUser(null);
                    throw new Error('PERMISSION_DENIED');
                }
                setUser(data.data.user);
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            if ((error as Error).message === 'PERMISSION_DENIED') {
                throw error;
            }
        }
    };

    useEffect(() => {
        // Check if user is already logged in
        const checkAuth = async () => {
            const isAuth = auth.isAuthenticated();
            if (isAuth) {
                try {
                    await fetchProfile();
                } catch {
                    // Ignore errors, user stays logged out
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const data = await auth.login(email, password);
            // Return data so the UI can check for requires_2fa
            if (data.data?.requires_2fa) {
                // Do not set user yet
                return data;
            }

            // Normal login success
            if (data.code === 'auth.login_success') {
                // Fetch full profile to get roles permissions etc
                await fetchProfile();
                router.push('/dashboard');
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
                router.push('/dashboard');
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
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                verify2FA,
                logout,
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
