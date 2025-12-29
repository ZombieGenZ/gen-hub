"use client";

import React from "react";
import Link from "next/link";

export function PrimeNestHeader() {
    return (
        <header className="sticky top-4 z-50 px-4 flex justify-center">
            <div className="w-full max-w-[1440px] bg-white rounded-full shadow-sm px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <img src="/assets/GenHub.svg" alt="GenHub" className="h-8 w-auto" />
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-8 text-slate-900 text-sm font-medium">
                    <Link href="#" className="text-[#0F766E]">Trang Chủ</Link>
                    <Link href="#services" className="hover:text-[#0F766E] transition-colors">Dịch Vụ</Link>
                    <Link href="#properties" className="hover:text-[#0F766E] transition-colors">Kho Bãi</Link>
                    <Link href="/dev/routes" className="hover:text-[#0F766E] transition-colors">Routes</Link>
                    <Link href="#about" className="hover:text-[#0F766E] transition-colors">Về Chúng Tôi</Link>
                </nav>

                {/* Right Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-[#0F766E] transition-colors">
                        Đăng Nhập
                    </Link>
                    <Link
                        href="/register"
                        className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0F766E] rounded-full hover:bg-[#0D5A52] transition-colors"
                    >
                        Đăng Ký
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button className="md:hidden text-slate-900 p-2" aria-label="Open menu">
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
        </header>
    );
}
