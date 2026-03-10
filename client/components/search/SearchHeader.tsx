"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HeroSearchBar, SearchFilters } from '@/components/search/HeroSearchBar';
import UserDropdown from "@/components/ui/UserDropdown";
import { authStorage } from "@/services/auth/auth-storage.service";
import { UserData } from "@/types/user/user.type";
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface SearchHeaderProps {
    onSearch?: (filters: SearchFilters) => void;
    onOpenFilter?: () => void;
    className?: string;
    isScrolled?: boolean;
}

import { UserService } from "@/services/user/user.service";


export default function SearchHeader({
    onSearch,
    onOpenFilter,
    className,
    isScrolled
}: SearchHeaderProps) {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(false);
    const [user, setUser] = useState<UserData | null>(null);

    const [internalScrolled, setInternalScrolled] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const isAuthenticated = authStorage.isAuthenticated();
            setIsLogin(isAuthenticated);

            if (isAuthenticated) {
                const accessToken = authStorage.getAccessToken();
                const refreshToken = authStorage.getRefreshToken();
                if (accessToken && refreshToken) {
                    try {
                        const userService = new UserService();
                        const userData = await userService.getUser(accessToken, refreshToken);
                        setUser(userData);
                    } catch (error) {
                        console.error("Failed to fetch user profile:", error);
                        setUser(null);
                    }
                }
            } else {
                setUser(null);
            }
        };

        checkAuth();

        if (isScrolled === undefined) {
            const handleScroll = () => {
                setInternalScrolled(window.scrollY > 50);
            };
            window.addEventListener('scroll', handleScroll);
            return () => window.removeEventListener('scroll', handleScroll);
        }
    }, [isScrolled]);

    const effectiveScrolled = isScrolled !== undefined ? isScrolled : internalScrolled;

    return (
        <div className={cn("search-page__hero-search", className)}>
            <div className="flex items-center justify-between gap-4 w-full max-w-[1920px] mx-auto">
                {/* 1. LOGO */}
                <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
                    <img src="/assets/GenHubv2.svg" alt="GenHub" className="h-9 w-auto transition-transform duration-300 group-hover:scale-105" />
                </Link>

                {/* 2. SEARCH BAR - Centered & Flexible */}
                <div className="flex-1 max-w-[850px] mx-4">
                    <HeroSearchBar
                        onSearch={onSearch}
                        onOpenFilter={onOpenFilter}
                        variant="compact"
                        minified={effectiveScrolled}
                    />
                </div>

                {/* 3. MENU / AUTH - Right Side */}
                <div className="flex-shrink-0 flex items-center gap-6">
                    {/* User Dropdown / Menu */}
                    <div className="flex items-center px-2 py-1 bg-background hover:bg-muted transition-all duration-200 border border-border rounded-full shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_12px_-2px_rgba(0,0,0,0.08)]">
                        <UserDropdown
                            user={isLogin ? {
                                name: user?.user?.name || 'Người dùng',
                                email: user?.user?.email,
                                avatar: user?.user?.avatar || (user?.user?.name ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user?.name)}&background=334155&color=fff` : undefined),
                                roles: user?.roles?.map(r => r.name)
                            } : undefined}
                            onLogout={() => {
                                setIsLogin(false);
                                setUser(null);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
