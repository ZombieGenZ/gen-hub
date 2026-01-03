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
    };
}

export function PrimeNestHeader({ isLogin, user }: HeaderProps) {
    const [active, setActive] = useState<string | null>(null);

    return (
        <header className="sticky top-0 w-full flex justify-center z-50 bg-white shadow-sm">
            <div className="w-full max-w-[1440px] mx-auto py-4  flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 relative z-50">
                    <img src="/assets/GenHubv2.svg" alt="GenHub" className="h-12 w-auto" />
                </Link>

                {/* Navigation */}
                <div className="hidden lg:flex items-center justify-center flex-1">
                    <Menu setActive={setActive}>
                        <Link href="/" className="text-black hover:opacity-90 px-4 text-sm font-medium">Trang Chủ</Link>

                        <MenuItem setActive={setActive} active={active} item="Dịch Vụ">
                            <div className="flex flex-col space-y-4 text-sm w-[200px]">
                                <HoveredLink href="#services">Cho Thuê Kho</HoveredLink>
                                <HoveredLink href="#services">Fulfillment</HoveredLink>
                                <HoveredLink href="#services">Vận Chuyển</HoveredLink>
                                <HoveredLink href="#services">Tư Vấn Setup</HoveredLink>
                            </div>
                        </MenuItem>

                        <MenuItem setActive={setActive} active={active} item="Kho Bãi">
                            <div className="flex flex-col space-y-4 text-sm w-[200px]">
                                <HoveredLink href="/kho-bai">Tất Cả Kho</HoveredLink>
                                <HoveredLink href="/kho-bai?type=kho-mat">Kho Mát</HoveredLink>
                                <HoveredLink href="/kho-bai?type=kho-thuong">Kho Thường</HoveredLink>
                                <HoveredLink href="/kho-bai?type=kho-ngoai-quan">Kho Ngoại Quan</HoveredLink>
                            </div>
                        </MenuItem>

                        <Link href="/dev/routes" className="text-black hover:opacity-90 px-4 text-sm font-medium">Routes</Link>
                        <Link href="#about" className="text-black hover:opacity-90 px-4 text-sm font-medium">Về Chúng Tôi</Link>
                    </Menu>
                </div>

                {/* Right Actions */}
                <div className="relative z-50 flex items-center gap-4">
                    {isLogin ?
                        <div className="hidden md:flex items-center gap-4">
                            <UserDropdown user={user} />
                        </div>
                        :
                        <div className="hidden md:flex items-center gap-4">
                            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-[#0F766E] transition-colors">
                                Đăng Nhập
                            </Link>
                            <Link
                                href="/register"
                                className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0F766E] rounded-full hover:bg-[#0D5A52] transition-colors shadow-sm hover:shadow-md"
                            >
                                Đăng Ký
                            </Link>
                        </div>
                    }

                    {/* Mobile Menu Button - Kept for mobile */}
                    <button className="lg:hidden text-slate-900 p-2" aria-label="Open menu">
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
}
