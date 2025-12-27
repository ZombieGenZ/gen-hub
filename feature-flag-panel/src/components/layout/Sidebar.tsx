'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    Flag,
    LayoutDashboard,
    LogOut,
    Menu,
    X,
    RefreshCw,
    Users,
} from 'lucide-react';
import { useLanguage, LanguageSwitcher } from '@/contexts/LanguageContext';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout, isLoading } = useAuth();
    const { t } = useLanguage();

    const navItems = [
        {
            name: t('sidebar.dashboard'),
            href: '/dashboard',
            icon: LayoutDashboard,
        },
    ];

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard';
        }
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 z-50 h-full w-64 
                    bg-[var(--background-secondary)] border-r border-[var(--border-primary)]
                    transform transition-transform duration-300 ease-in-out
                    lg:translate-x-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-[var(--border-primary)] flex items-center justify-between">
                        <Link href="/dashboard" className="flex items-center gap-3">
                            <Flag className="w-8 h-8 text-[var(--accent-primary)]" />
                            <div>
                                <h1 className="text-lg font-bold text-white glow-text">{t('sidebar.title')}</h1>
                                <p className="text-xs text-[var(--text-muted)]">{t('sidebar.subtitle')}</p>
                            </div>
                        </Link>
                        <button
                            onClick={onClose}
                            className="lg:hidden p-2 text-[var(--text-muted)] hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-lg
                                        transition-all duration-200
                                        ${active
                                            ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                        }
                                    `}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Info & Logout */}
                    <div className="p-4 border-t border-[var(--border-primary)] space-y-3">
                        <div className="flex justify-center">
                            <LanguageSwitcher />
                        </div>
                        {user && (
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--accent-primary-muted)] flex items-center justify-center">
                                    <Users className="w-5 h-5 text-[var(--accent-primary)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                    <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={logout}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-[var(--status-error)] hover:bg-[rgba(255,82,82,0.1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <LogOut className="w-4 h-4" />
                            )}
                            <span>{t('sidebar.logout')}</span>
                        </button>
                    </div>
                </div>
            </aside >
        </>
    );
}

export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
    return (
        <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-[var(--background-secondary)] border-b border-[var(--border-primary)]">
            <div className="flex items-center justify-between px-4 h-full">
                <button
                    onClick={onMenuClick}
                    className="p-2 hover:bg-[var(--background-tertiary)] rounded-lg"
                >
                    <Menu className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
                <div className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-[var(--accent-primary)]" />
                    <span className="font-bold text-white">Feature Flags</span>
                </div>
                <div className="w-9" /> {/* Spacer for centering */}
            </div>
        </header>
    );
}
