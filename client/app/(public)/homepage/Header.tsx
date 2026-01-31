"use client";

import React, { useState } from "react";
import Link from "next/link";
import UserDropdown from "@/components/ui/UserDropdown";
import { Menu, MenuItem, HoveredLink } from "@/components/ui/navbar-menu";

interface HeaderProps {
    isLogin: boolean;
    user?: {
        name?: string;
        email?: string;
        avatar?: string;
        roles?: string[];
    };
    onLogout?: () => void;
}

export function PrimeNestHeader({ isLogin, user, onLogout }: HeaderProps) {
    const [active, setActive] = useState<string | null>(null);

    return (
        <header className="sticky top-0 w-full z-[100] bg-background border-b border-border shadow-sm">
            <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-4 h-[80px] flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 relative z-50 shrink-0">
                    <img src="./assets/GenHubv2.svg" alt="GenHub" className="h-9 w-auto" />
                </Link>

                {/* Navigation - Centered */}
                <div className="hidden lg:flex items-center justify-center flex-1 mx-8">
                    <Menu setActive={setActive}>
                        <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 relative group">
                            Trang Chủ
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full" />
                        </Link>

                        <MenuItem setActive={setActive} active={active} item="Dịch Vụ">
                            <div className="flex flex-col space-y-2 text-sm min-w-[200px]">
                                <HoveredLink href="#services">Cho Thuê Kho</HoveredLink>
                                <HoveredLink href="#services">Fulfillment</HoveredLink>
                                <HoveredLink href="#services">Vận Chuyển</HoveredLink>
                                <HoveredLink href="#services">Tư Vấn Setup</HoveredLink>
                            </div>
                        </MenuItem>

                        <MenuItem setActive={setActive} active={active} item="Kho Bãi">
                            <div className="flex flex-col space-y-2 text-sm min-w-[200px]">
                                <HoveredLink href="/kho-bai">Tất Cả Kho</HoveredLink>
                                <HoveredLink href="/kho-bai?type=kho-mat">Kho Mát</HoveredLink>
                                <HoveredLink href="/kho-bai?type=kho-thuong">Kho Thường</HoveredLink>
                                <HoveredLink href="/kho-bai?type=kho-ngoai-quan">Kho Ngoại Quan</HoveredLink>
                                <HoveredLink href="/warehouse-3d">Xem Kho 3D</HoveredLink>
                            </div>
                        </MenuItem>

                        <Link href="/dev/routes" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 relative group">
                            Routes
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full" />
                        </Link>
                        <Link href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 relative group">
                            Về Chúng Tôi
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full" />
                        </Link>
                    </Menu>
                </div>

                {/* Right Actions */}
                <div className="relative z-50 flex items-center gap-5 shrink-0  ">
                    {isLogin ?
                        <div className="hidden md:flex items-center gap-4 ">
                            <UserDropdown user={user} onLogout={onLogout} />
                        </div>
                        :
                        <div className="hidden md:flex items-center gap-5">
                            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200">
                                Đăng Nhập
                            </Link>
                            <Link
                                href="/register"
                                className="px-6 py-3 text-sm font-semibold text-primary-foreground bg-primary rounded-3xl hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                Đăng Ký
                            </Link>
                        </div>
                    }

                    {/* Mobile Menu Button - Kept for mobile */}
                    <button className="lg:hidden text-muted-foreground p-2 hover:bg-accent hover:text-accent-foreground rounded-3xl transition-colors" aria-label="Open menu">
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
}
