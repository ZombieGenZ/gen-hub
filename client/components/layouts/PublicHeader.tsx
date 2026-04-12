"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import UserDropdown from "@/components/ui/UserDropdown";
import { Menu, MenuItem, HoveredLink } from "@/components/ui/navbar-menu";
import { authStorage } from "@/services/auth/auth-storage.service";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";

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

export function PublicHeader({ isLogin, user, onLogout }: HeaderProps) {
    const [active, setActive] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        setToken(authStorage.getAccessToken());
    }, [isLogin]);

    const showUserSection = isLogin || !!token;

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    return (
        <>
            <header className="sticky top-0 w-full z-[100] bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
                <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-6 h-[80px] flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 relative z-50 shrink-0">
                        <Image
                            src="/assets/GenHub.svg"
                            alt="GenHub"
                            width={180}
                            height={36}
                            priority
                            unoptimized
                            className="h-8 w-auto hover:opacity-80 transition-opacity"
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center justify-center flex-1 mx-8 text-neutral-800">
                        <Menu setActive={setActive}>
                            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 relative group">
                                Trang Chủ
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full" />
                            </Link>
                            <MenuItem setActive={setActive} active={active} item="Kho Bãi">
                                <div className="flex flex-col space-y-2 text-sm min-w-[200px]">
                                    <HoveredLink href="/kho-bai">Tất Cả Kho</HoveredLink>
                                    <HoveredLink href="/kho-bai?type=kho-thuong">Kho Thường</HoveredLink>
                                    <HoveredLink href="/kho-bai?type=kho-chung">Kho Chung</HoveredLink>
                                </div>
                            </MenuItem>
                            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 relative group">
                                Về Chúng Tôi
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full" />
                            </Link>
                            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 relative group">
                                Liên hệ
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full" />
                            </Link>
                        </Menu>
                    </div>

                    {/* Right Actions */}
                    <div className="relative z-50 flex items-center gap-4 shrink-0">
                        {showUserSection ? (
                            <div className="flex items-center gap-4">
                                <UserDropdown user={user} onLogout={onLogout} />
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-5">
                                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200">
                                    Đăng Nhập
                                </Link>
                                <Link
                                    href="/register"
                                    className="px-6 py-3 text-sm font-semibold text-primary-foreground bg-primary rounded-3xl hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                                >
                                    Đăng Ký
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden text-muted-foreground p-2 hover:bg-accent hover:text-accent-foreground rounded-full transition-colors cursor-pointer" 
                            aria-label="Open menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Drawer */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] lg:hidden"
                            />

                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="fixed right-0 top-0 bottom-0 w-[85vw] max-w-[360px] bg-background z-[120] shadow-2xl flex flex-col lg:hidden border-l border-border"
                            >
                                <div className="flex items-center justify-between p-5 border-b border-border">
                                    <span className="font-bold text-foreground text-xl">Menu</span>
                                    <button
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                                    <div className="flex flex-col gap-1">
                                        <Link onClick={() => setIsMobileMenuOpen(false)} href="/" className="text-lg font-medium py-3 border-b border-border/30 hover:text-primary transition-colors">
                                            Trang Chủ
                                        </Link>
                                        <div className="py-3 border-b border-border/30">
                                            <span className="text-lg font-medium block mb-4">Kho Bãi</span>
                                            <div className="flex flex-col gap-4 pl-4 border-l-2 border-primary/20">
                                                <Link onClick={() => setIsMobileMenuOpen(false)} href="/kho-bai" className="text-base text-muted-foreground hover:text-primary">Tất Cả Kho</Link>
                                                <Link onClick={() => setIsMobileMenuOpen(false)} href="/kho-bai?type=kho-thuong" className="text-base text-muted-foreground hover:text-primary">Kho Thường</Link>
                                                <Link onClick={() => setIsMobileMenuOpen(false)} href="/kho-bai?type=kho-chung" className="text-base text-muted-foreground hover:text-primary">Kho Chung</Link>
                                            </div>
                                        </div>
                                        <Link onClick={() => setIsMobileMenuOpen(false)} href="/about" className="text-lg font-medium py-3 border-b border-border/30 hover:text-primary transition-colors">
                                            Về Chúng Tôi
                                        </Link>
                                        <Link onClick={() => setIsMobileMenuOpen(false)} href="/" className="text-lg font-medium py-3 border-b border-border/30 hover:text-primary transition-colors">
                                            Liên hệ
                                        </Link>
                                    </div>
                                    
                                    {showUserSection && (
                                        <div className="mt-2">
                                            <Link onClick={() => setIsMobileMenuOpen(false)} href="/dashboard" className="flex items-center justify-between w-full p-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20">
                                                <span>Bảng điều khiển</span>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Mobile User/Auth Section */}
                                <div className="p-6 border-t border-border mt-auto bg-muted/30">
                                    {showUserSection ? (
                                        <div className="flex flex-row items-center justify-between w-full">
                                            <div className="flex flex-col">
                                                <span className="text-base font-bold text-foreground">{user?.name || "Người dùng"}</span>
                                                <span className="text-sm text-muted-foreground truncate max-w-[180px]">{user?.email || ""}</span>
                                            </div>
                                            <UserDropdown user={user} onLogout={onLogout} />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <Link onClick={() => setIsMobileMenuOpen(false)} href="/login" className="w-full py-3.5 text-center font-semibold text-foreground bg-background border border-border rounded-xl hover:bg-accent transition-colors shadow-sm">
                                                Đăng Nhập
                                            </Link>
                                            <Link onClick={() => setIsMobileMenuOpen(false)} href="/register" className="w-full py-3.5 text-center font-semibold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                                                Đăng Ký
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
