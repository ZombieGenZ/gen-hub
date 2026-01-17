'use client';

import { useState, useEffect, useCallback } from 'react';
import { permissionsApi, Permission } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
    Key,
    Search,
    RefreshCw,
    Loader2,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

const PAGE_SIZE_OPTIONS = [25, 50, 75, 100];
const LOCALSTORAGE_PAGE_SIZE_KEY = 'admin-panel-permissions-page-size';

const getInitialPageSize = (): number => {
    if (typeof window === 'undefined') return 25;
    const saved = localStorage.getItem(LOCALSTORAGE_PAGE_SIZE_KEY);
    if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && PAGE_SIZE_OPTIONS.includes(num)) return num;
    }
    return 25;
};

export default function PermissionsPage() {
    const { t } = useLanguage();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(getInitialPageSize);
    const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState<string>('');
    const [modules, setModules] = useState<string[]>([]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter, moduleFilter]);

    // Fetch modules list
    useEffect(() => {
        const fetchModules = async () => {
            try {
                const data = await permissionsApi.getModules();
                setModules(data);
            } catch (error) {
                console.error('Failed to fetch modules:', error);
            }
        };
        fetchModules();
    }, []);

    const fetchPermissions = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await permissionsApi.getPermissions({
                limit: String(limit),
                offset: String((page - 1) * limit),
                keywords: debouncedSearch || undefined,
                status: statusFilter as 'ACTIVE' | 'INACTIVE' | 'ALL' || undefined,
                module: moduleFilter || undefined,
            });
            setPermissions((response as { data: Permission[]; total: number }).data);
            setTotal((response as { data: Permission[]; total: number }).total);
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
            toast.error(t('common.error') || 'Failed to load permissions');
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, debouncedSearch, statusFilter, moduleFilter, t]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    const totalPages = Math.ceil(total / limit);

    // Group permissions by prefix for better visualization
    const groupedPermissions = permissions.reduce((acc, perm) => {
        const parts = perm.key.split('.');
        const group = parts[0] || 'other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    // Count stats
    const activeCount = permissions.filter(p => p.is_active).length;
    const inactiveCount = permissions.filter(p => !p.is_active).length;

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('permissions.title') || 'Permissions'}</h1>
                    <p className="text-[var(--text-secondary)]">
                        {t('permissions.subtitle') || 'View all system permissions'}
                    </p>
                </div>
                <button
                    onClick={() => fetchPermissions()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {t('common.refresh') || 'Refresh'}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-blue-500/20">
                            <Key className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('permissions.stats.total') || 'Total'}</p>
                            <p className="text-2xl font-bold text-white">{total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-green-500/20">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('permissions.stats.active') || 'Active'}</p>
                            <p className="text-2xl font-bold text-green-400">{activeCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-red-500/20">
                            <XCircle className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('permissions.stats.inactive') || 'Inactive'}</p>
                            <p className="text-2xl font-bold text-red-400">{inactiveCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[var(--background-secondary)] rounded-xl p-4 border border-[var(--border-primary)] mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder={t('permissions.searchPlaceholder') || 'Search by key or name...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)] appearance-none cursor-pointer min-w-[140px]"
                    >
                        <option value="ALL">{t('permissions.allStatus') || 'All Status'}</option>
                        <option value="ACTIVE">{t('permissions.active') || 'Active'}</option>
                        <option value="INACTIVE">{t('permissions.inactive') || 'Inactive'}</option>
                    </select>

                    {/* Module Filter */}
                    <select
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value)}
                        className="px-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)] appearance-none cursor-pointer min-w-[160px]"
                    >
                        <option value="">{t('permissions.allModules') || 'All Modules'}</option>
                        {modules.map((mod) => (
                            <option key={mod} value={mod}>
                                {mod}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Permissions Table */}
            <div className="bg-[var(--background-secondary)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                    </div>
                ) : permissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                        <Key className="w-12 h-12 mb-4" />
                        <p>{t('permissions.noPermissions') || 'No permissions found'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border-primary)] bg-[var(--background-tertiary)]">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('permissions.table.key') || 'Key'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('permissions.table.name') || 'Name'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('permissions.table.description') || 'Description'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('permissions.table.status') || 'Status'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('permissions.table.createdAt') || 'Created At'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {permissions.map((permission) => (
                                    <tr
                                        key={permission.id}
                                        className="border-b border-[var(--border-primary)] hover:bg-[var(--background-tertiary)] transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <code className="px-2 py-1 bg-[var(--background-tertiary)] rounded text-[var(--accent-primary)] text-sm">
                                                {permission.key}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-white font-medium">{permission.name}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[var(--text-secondary)] text-sm">{permission.description || '-'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {permission.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {t('permissions.active') || 'Active'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                                                    <XCircle className="w-3 h-3" />
                                                    {t('permissions.inactive') || 'Inactive'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[var(--text-muted)] text-sm">
                                                {formatDate(permission.created_at)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-primary)]">
                        <div className="flex items-center gap-2">
                            <span className="text-[var(--text-muted)] text-sm">
                                {t('common.showing') || 'Showing'} {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} {t('common.of') || 'of'} {total}
                            </span>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    const newLimit = parseInt(e.target.value);
                                    setLimit(newLimit);
                                    localStorage.setItem(LOCALSTORAGE_PAGE_SIZE_KEY, String(newLimit));
                                    setPage(1);
                                }}
                                className="px-2 py-1 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded text-sm text-white appearance-none cursor-pointer"
                            >
                                {PAGE_SIZE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg hover:bg-[var(--background-tertiary)] disabled:opacity-50"
                            >
                                <ChevronLeft className="w-4 h-4 text-white" />
                            </button>
                            <span className="text-white text-sm">
                                {page} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || totalPages === 0}
                                className="p-2 rounded-lg hover:bg-[var(--background-tertiary)] disabled:opacity-50"
                            >
                                <ChevronRight className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
