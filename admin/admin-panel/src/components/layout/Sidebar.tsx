'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Database,
    Users,
    LogOut,
    Loader2,
    Search,
    Menu,
    X,
    RefreshCw,
    Network,
    Terminal,
    Flag,
    Activity,
    ChevronDown,
    Table,
    DatabaseBackup,
    Shield,
    Key,
    Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, LanguageSwitcher } from '@/contexts/LanguageContext';
import { useTables } from '@/contexts/TablesContext';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout, hasPermission } = useAuth();
    const { t } = useLanguage();
    const { tables, isLoading, refreshTables } = useTables();
    const [searchQuery, setSearchQuery] = useState('');

    // Load tables expanded state from localStorage (default: true = open)
    const [isTablesExpanded, setIsTablesExpanded] = useState(() => {
        if (typeof window === 'undefined') return true;
        const saved = localStorage.getItem('sidebar-tables-expanded');
        return saved === null ? true : saved === 'true';
    });

    // Save tables expanded state to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('sidebar-tables-expanded', String(isTablesExpanded));
    }, [isTablesExpanded]);

    // Close sidebar when navigating on mobile
    useEffect(() => {
        if (onClose) {
            onClose();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // Filter tables based on search query - supports searching by individual words in any order
    const filteredTables = useMemo(() => {
        if (!searchQuery.trim()) return tables;

        // Split query into individual words and filter out empty strings
        const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 0);

        return tables.filter((table) => {
            const nameToSearch = `${table.name} ${table.displayName}`.toLowerCase();
            // Check if ALL query words are found in the table name (in any order)
            return queryWords.every(word => nameToSearch.includes(word));
        });
    }, [tables, searchQuery]);

    const isTableActive = (tableName: string) => {
        return pathname === `/database/${tableName}`;
    };

    const handleLinkClick = () => {
        if (onClose) onClose();
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
            <aside className={`
                fixed left-0 top-0 h-screen w-64 bg-[var(--background-secondary)] border-r border-[var(--border-primary)] flex flex-col z-50
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
            `}>
                {/* Logo */}
                <div className="p-6 border-b border-[var(--border-primary)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Database className="w-8 h-8 text-[var(--accent-primary)]" />
                        <div>
                            <h1 className="text-lg font-bold text-white glow-text">GEN-HUB</h1>
                            <p className="text-xs text-[var(--text-muted)]">{t('sidebar.admin')}</p>
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 text-[var(--text-muted)] hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4">
                    {/* Database Panel Section - only show if has database.admin permission */}
                    {hasPermission('database.admin') && (
                        <>
                            <div className="mb-2 px-4 py-2">
                                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                    Database
                                </span>
                            </div>
                            <Link
                                href="/dashboard"
                                onClick={handleLinkClick}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${pathname === '/dashboard'
                                    ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                    }`}
                            >
                                <Database className="w-5 h-5" />
                                <span className="font-medium">{t('sidebar.dashboard')}</span>
                            </Link>

                            {/* Diagram Link */}
                            <Link
                                href="/diagram"
                                onClick={handleLinkClick}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${pathname === '/diagram'
                                    ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                    }`}
                            >
                                <Network className="w-5 h-5" />
                                <span className="font-medium">{t('sidebar.erDiagram')}</span>
                            </Link>

                            {/* SQL Query Link */}
                            <Link
                                href="/query"
                                onClick={handleLinkClick}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${pathname === '/query'
                                    ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                    }`}
                            >
                                <Terminal className="w-5 h-5" />
                                <span className="font-medium">{t('query.title')}</span>
                            </Link>

                            {/* Tables Header with Toggle */}
                            <div className="px-4 py-2 flex items-center justify-between mt-4">
                                <button
                                    onClick={() => setIsTablesExpanded(!isTablesExpanded)}
                                    className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hover:text-white transition-colors"
                                >
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isTablesExpanded ? '' : '-rotate-90'}`} />
                                    {t('sidebar.tables')} ({filteredTables.length})
                                </button>
                                <button
                                    onClick={refreshTables}
                                    disabled={isLoading}
                                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--background-tertiary)] rounded transition-all"
                                    title={t('dashboard.tables.refresh')}
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {/* Collapsible Tables List */}
                            {isTablesExpanded && (
                                <>
                                    {/* Search Tables */}
                                    <div className="relative mb-4 px-4">
                                        <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={t('table.filter.enterValue') + '...'}
                                            className="w-full pl-9 pr-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                                        />
                                    </div>

                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-primary)]" />
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {filteredTables.map((table) => (
                                                <Link
                                                    key={table.name}
                                                    href={`/database/${table.name}`}
                                                    onClick={handleLinkClick}
                                                    prefetch={true}
                                                    className={`block px-4 py-2 rounded-lg text-sm transition-all ${isTableActive(table.name)
                                                        ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                                        : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                                        }`}
                                                >
                                                    {table.displayName}
                                                </Link>
                                            ))}
                                            {filteredTables.length === 0 && (
                                                <p className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                                                    {t('table.noData')}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* User Management Section */}
                    {(hasPermission('user-management.list') || hasPermission('role.read') || hasPermission('permission.read')) && (
                        <>
                            <div className="mt-4 mb-2 px-4 py-2">
                                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                    {t('sidebar.userManagement') || 'User Management'}
                                </span>
                            </div>
                            {hasPermission('user-management.list') && (
                                <Link
                                    href="/users"
                                    onClick={handleLinkClick}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${pathname === '/users' || pathname.startsWith('/users/')
                                        ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                        }`}
                                >
                                    <Users className="w-5 h-5" />
                                    <span className="font-medium">{t('sidebar.users') || 'Users'}</span>
                                </Link>
                            )}
                            {hasPermission('role.read') && (
                                <Link
                                    href="/roles"
                                    onClick={handleLinkClick}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${pathname === '/roles' || pathname.startsWith('/roles/')
                                        ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                        }`}
                                >
                                    <Shield className="w-5 h-5" />
                                    <span className="font-medium">{t('sidebar.roles') || 'Roles'}</span>
                                </Link>
                            )}
                            {hasPermission('permission.read') && (
                                <Link
                                    href="/permissions"
                                    onClick={handleLinkClick}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${pathname === '/permissions'
                                        ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                        }`}
                                >
                                    <Key className="w-5 h-5" />
                                    <span className="font-medium">{t('sidebar.permissions') || 'Permissions'}</span>
                                </Link>
                            )}
                        </>
                    )}

                    {/* Feature Flags Section - only show if has featureflag.admin permission */}
                    {hasPermission('featureflag.admin') && (
                        <>
                            <div className="mt-4 mb-2 px-4 py-2">
                                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                    Feature Flags
                                </span>
                            </div>
                            <Link
                                href="/feature-flags"
                                onClick={handleLinkClick}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${pathname === '/feature-flags' || pathname.startsWith('/feature-flags/')
                                    ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                    }`}
                            >
                                <Flag className="w-5 h-5" />
                                <span className="font-medium">{t('sidebar.featureFlags') || 'Feature Flags'}</span>
                            </Link>
                        </>
                    )}

                    {/* Resources Section - only show if has resources.admin permission */}
                    {hasPermission('resources.admin') && (
                        <>
                            <div className="mt-4 mb-2 px-4 py-2">
                                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                    Resources
                                </span>
                            </div>
                            <Link
                                href="/resources"
                                onClick={handleLinkClick}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${pathname === '/resources' || pathname.startsWith('/resources/')
                                    ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                    }`}
                            >
                                <Activity className="w-5 h-5" />
                                <span className="font-medium">{t('sidebar.resources') || 'Resources'}</span>
                            </Link>

                            <Link
                                href="/status-tracker"
                                onClick={handleLinkClick}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${pathname === '/status-tracker' || pathname.startsWith('/status-tracker/')
                                    ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                    }`}
                            >
                                <Network className="w-5 h-5" />
                                <span className="font-medium">Status Tracker</span>
                            </Link>
                        </>
                    )}

                    {/* Warehouse Visit Section - show if has warehouse-visit.list.all permission */}
                    {hasPermission('warehouse-visit.list.all') && (
                        <>
                            <div className="mt-4 mb-2 px-4 py-2">
                                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                    Lịch tham quan (Visits)
                                </span>
                            </div>
                            <Link
                                href="/warehouse-visit"
                                onClick={handleLinkClick}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${pathname === '/warehouse-visit' || pathname.startsWith('/warehouse-visit/')
                                    ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                    }`}
                            >
                                <Calendar className="w-5 h-5" />
                                <span className="font-medium">Calendar Dashboard</span>
                            </Link>
                        </>
                    )}

                    {/* System Logs Section - only show if has systemlogs.admin permission */}
                    {hasPermission('systemlogs.admin') && (
                        <>
                            <div className="mt-4 mb-2 px-4 py-2">
                                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                    System Logs
                                </span>
                            </div>
                            <Link
                                href="/system-logs"
                                onClick={handleLinkClick}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${pathname === '/system-logs'
                                    ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                    }`}
                            >
                                <Terminal className="w-5 h-5" />
                                <span className="font-medium">{t('systemLogs.consoleView') || 'Console View'}</span>
                            </Link>
                            <Link
                                href="/system-logs/table"
                                onClick={handleLinkClick}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${pathname === '/system-logs/table'
                                    ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                    }`}
                            >
                                <Table className="w-5 h-5" />
                                <span className="font-medium">{t('systemLogs.viewTable') || 'Table View'}</span>
                            </Link>
                        </>
                    )}

                    {/* Backup Section - show if has any backup permission */}
                    {(hasPermission('backup.admin') || hasPermission('backup.list') || hasPermission('backup.trigger')) && (
                        <>
                            <div className="mt-4 mb-2 px-4 py-2">
                                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                    Backup
                                </span>
                            </div>
                            <Link
                                href="/backups"
                                onClick={handleLinkClick}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${pathname === '/backups' || pathname.startsWith('/backups/')
                                    ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                    }`}
                            >
                                <DatabaseBackup className="w-5 h-5" />
                                <span className="font-medium">{t('sidebar.backup') || 'Backup Manager'}</span>
                            </Link>
                        </>
                    )}
                </nav>

                {/* User Info & Language Switcher */}
                <div className="p-4 border-t border-[var(--border-primary)]">
                    {/* Language Switcher */}
                    <div className="mb-3">
                        <LanguageSwitcher className="w-full justify-center" />
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--accent-primary-muted)] flex items-center justify-center">
                            <Users className="w-5 h-5 text-[var(--accent-primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-[var(--status-error)] hover:bg-[rgba(255,82,82,0.1)] transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>{t('sidebar.logout')}</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

// Mobile Header with Menu Button
export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
    return (
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--background-secondary)] border-b border-[var(--border-primary)] z-30 flex items-center px-4">
            <button
                onClick={onMenuClick}
                className="p-2 text-[var(--text-muted)] hover:text-white mr-3"
            >
                <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
                <Database className="w-6 h-6 text-[var(--accent-primary)]" />
                <span className="font-bold text-white">GEN-HUB</span>
            </div>
        </div>
    );
}
