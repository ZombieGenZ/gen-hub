'use client';

import { useState, useEffect, useCallback } from 'react';
import { featureFlagApi, FeatureFlag } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import Link from 'next/link';
import {
    Flag,
    Search,
    RefreshCw,
    Loader2,
    ToggleLeft,
    ToggleRight,
    Filter,
    ChevronLeft,
    ChevronRight,
    History,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

const PAGE_SIZE_OPTIONS = [25, 50, 75, 100];
const LOCALSTORAGE_PAGE_SIZE_KEY = 'feature-flag-panel-page-size';

const getInitialPageSize = (): number => {
    if (typeof window === 'undefined') return 25;
    const saved = localStorage.getItem(LOCALSTORAGE_PAGE_SIZE_KEY);
    if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && PAGE_SIZE_OPTIONS.includes(num)) return num;
    }
    return 25;
};

export default function DashboardPage() {
    const { t } = useLanguage();
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [modules, setModules] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isTogglingId, setIsTogglingId] = useState<string | null>(null);
    const [isReloadingCache, setIsReloadingCache] = useState(false);

    // Stats from API (total counts)
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

    // Filters
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(getInitialPageSize);
    const [selectedModule, setSelectedModule] = useState<string>('');
    const [activeFilter, setActiveFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset page when search changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkToggling, setIsBulkToggling] = useState(false);

    const fetchFlags = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await featureFlagApi.getAll({
                page,
                limit,
                module: selectedModule || undefined,
                isActive: activeFilter === '' ? undefined : activeFilter === 'true',
                search: debouncedSearch || undefined,
            });
            setFlags(response.data);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to fetch feature flags:', error);
            // toast.error(t('common.error')); // Optional: show error on fetch fail
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, selectedModule, activeFilter, debouncedSearch]);

    const fetchModules = useCallback(async () => {
        try {
            const response = await featureFlagApi.getModules();
            setModules(response);
        } catch (error) {
            console.error('Failed to fetch modules:', error);
        }
    }, []);

    useEffect(() => {
        fetchFlags();
    }, [fetchFlags]);

    useEffect(() => {
        fetchModules();
    }, [fetchModules]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await featureFlagApi.getStats();
            setStats(response);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            // Fallback: use total from pagination if stats API fails
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleToggle = async (id: string, currentState: boolean) => {
        setIsTogglingId(id);
        try {
            await featureFlagApi.toggle(id, !currentState);
            setFlags(prev => prev.map(f =>
                f.id === id ? { ...f, is_active: !currentState } : f
            ));
            toast.success(t('dashboard.messages.toggleSuccess', {
                status: !currentState ? t('dashboard.messages.enabled') : t('dashboard.messages.disabled')
            }));
        } catch (error) {
            console.error('Failed to toggle flag:', error);
            toast.error(t('dashboard.messages.toggleError'));
        } finally {
            setIsTogglingId(null);
        }
    };

    const handleBulkToggle = async (isActive: boolean) => {
        if (selectedIds.size === 0) return;

        setIsBulkToggling(true);
        try {
            await featureFlagApi.bulkToggle(Array.from(selectedIds), isActive);
            setFlags(prev => prev.map(f =>
                selectedIds.has(f.id) ? { ...f, is_active: isActive } : f
            ));
            setSelectedIds(new Set());
            toast.success(t('dashboard.messages.bulkSuccess', { count: selectedIds.size }));
        } catch (error) {
            console.error('Failed to bulk toggle:', error);
            toast.error(t('dashboard.messages.bulkError'));
        } finally {
            setIsBulkToggling(false);
        }
    };

    const handleReloadCache = async () => {
        setIsReloadingCache(true);
        try {
            await featureFlagApi.reloadCache();
            toast.success(t('dashboard.messages.cacheReloadSuccess'));
        } catch (error) {
            console.error('Failed to reload cache:', error);
            toast.error(t('dashboard.messages.cacheReloadError'));
        } finally {
            setIsReloadingCache(false);
        }
    };



    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const totalPages = Math.ceil(total / limit);
    const activeCount = stats.active;
    const inactiveCount = stats.inactive;
    const totalCount = stats.total;

    // Use flags directly as they are now filtered on server
    const displayFlags = flags;

    const getMethodBadgeClass = (method: string) => {
        const methodLower = method.toLowerCase();
        return `method-badge method-${methodLower}`;
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
                    <p className="text-[var(--text-secondary)]">
                        {t('sidebar.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReloadCache}
                        disabled={isReloadingCache}
                        className="btn btn-secondary"
                        title={t('dashboard.actions.reloadCache')}
                    >
                        <RefreshCw className={`w-4 h-4 ${isReloadingCache ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{t('dashboard.actions.reloadCache')}</span>
                    </button>
                    <button
                        onClick={() => fetchFlags()}
                        disabled={isLoading}
                        className="btn btn-secondary"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{t('dashboard.actions.refresh')}</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card group hover:border-[var(--accent-primary)] transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] mb-1">{t('dashboard.stats.total')}</p>
                            <p className="text-3xl font-bold text-white">{totalCount}</p>
                        </div>
                        <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(20, 184, 166, 0.2)' }}
                        >
                            <Flag className="w-6 h-6 text-[var(--accent-primary)]" />
                        </div>
                    </div>
                </div>
                <div className="card group hover:border-[var(--status-success)] transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] mb-1">{t('dashboard.stats.active')}</p>
                            <p className="text-3xl font-bold text-[var(--status-success)]">{activeCount}</p>
                        </div>
                        <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
                        >
                            <CheckCircle2 className="w-6 h-6 text-[var(--status-success)]" />
                        </div>
                    </div>
                </div>
                <div className="card group hover:border-[var(--status-error)] transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] mb-1">{t('dashboard.stats.inactive')}</p>
                            <p className="text-3xl font-bold text-[var(--status-error)]">{inactiveCount}</p>
                        </div>
                        <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                        >
                            <XCircle className="w-6 h-6 text-[var(--status-error)]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="card mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder={t('dashboard.filters.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10"
                        />
                    </div>

                    {/* Module Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-[var(--text-muted)]" />
                        <select
                            value={selectedModule}
                            onChange={(e) => {
                                setSelectedModule(e.target.value);
                                setPage(1);
                            }}
                            className="select"
                        >
                            <option value="">{t('dashboard.filters.allModules')}</option>
                            {modules.map(module => (
                                <option key={module} value={module}>{module}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <select
                            value={activeFilter}
                            onChange={(e) => {
                                setActiveFilter(e.target.value);
                                setPage(1);
                            }}
                            className="select"
                        >
                            <option value="">{t('dashboard.filters.allStatus')}</option>
                            <option value="true">{t('dashboard.filters.active')}</option>
                            <option value="false">{t('dashboard.filters.inactive')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <div className="card mb-4 flex items-center justify-between bg-[var(--accent-primary-muted)] border-[var(--accent-primary)]">
                    <span className="text-[var(--accent-primary)] font-medium">
                        {t('dashboard.actions.bulkAction')} ({selectedIds.size})
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleBulkToggle(true)}
                            disabled={isBulkToggling}
                            className="btn btn-success"
                        >
                            {isBulkToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleRight className="w-4 h-4" />}
                            {t('dashboard.actions.enableSelected')}
                        </button>
                        <button
                            onClick={() => handleBulkToggle(false)}
                            disabled={isBulkToggling}
                            className="btn btn-danger"
                        >
                            {isBulkToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleLeft className="w-4 h-4" />}
                            {t('dashboard.actions.disableSelected')}
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="btn btn-secondary"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {/* Flags Table */}
            <div className="table-container">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                    </div>
                ) : displayFlags.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)]">
                        <Flag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{t('dashboard.messages.noFlagsFound')}</p>
                    </div>
                ) : (
                    <table className="data-table" style={{ minWidth: '800px' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === displayFlags.length && displayFlags.length > 0}
                                        onChange={() => {
                                            if (selectedIds.size === displayFlags.length) {
                                                setSelectedIds(new Set());
                                            } else {
                                                setSelectedIds(new Set(displayFlags.map(f => f.id)));
                                            }
                                        }}
                                        className="custom-checkbox"
                                    />
                                </th>
                                <th style={{ width: '80px' }}>Method</th>
                                <th>Path</th>
                                <th style={{ width: '120px' }}>{t('dashboard.table.module')}</th>
                                <th style={{ width: '100px' }}>{t('dashboard.table.status')}</th>
                                <th style={{ width: '80px' }}>{t('dashboard.table.history')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayFlags.map((flag) => (
                                <tr key={flag.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(flag.id)}
                                            onChange={() => toggleSelect(flag.id)}
                                            className="custom-checkbox"
                                        />
                                    </td>
                                    <td>
                                        <span className={getMethodBadgeClass(flag.method)}>
                                            {flag.method}
                                        </span>
                                    </td>
                                    <td>
                                        <code className="text-sm text-[var(--accent-primary)]">{flag.path}</code>
                                    </td>
                                    <td>
                                        <span className="badge badge-module bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 text-xs font-medium rounded-full shadow-sm backdrop-blur-sm">
                                            {flag.module}
                                        </span>
                                    </td>
                                    <td>
                                        <label className="toggle">
                                            <input
                                                type="checkbox"
                                                checked={flag.is_active}
                                                onChange={() => handleToggle(flag.id, flag.is_active)}
                                                disabled={isTogglingId === flag.id}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </td>
                                    <td>
                                        <Link
                                            href={`/dashboard/${flag.id}`}
                                            className="btn btn-secondary py-1 px-2 text-xs"
                                            title="Xem logs"
                                        >
                                            <History className="w-4 h-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-[var(--border-primary)]">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">{t('dashboard.pagination.rows')}:</span>
                    <select
                        value={limit}
                        onChange={(e) => {
                            const newSize = parseInt(e.target.value, 10);
                            localStorage.setItem(LOCALSTORAGE_PAGE_SIZE_KEY, newSize.toString());
                            setLimit(newSize);
                            setPage(1);
                        }}
                        className="bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded px-2 py-1 text-xs text-white cursor-pointer focus:outline-none focus:border-[var(--accent-primary)]"
                    >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>

                {/* Record Info */}
                <p className="text-xs text-[var(--text-secondary)]">
                    {total > 0 ? (
                        <>{(page - 1) * limit + 1} - {Math.min(page * limit, total)} {t('dashboard.pagination.of')} {total}</>
                    ) : (
                        `0 ${t('dashboard.pagination.flags')}`
                    )}
                </p>

                {/* Page Navigation */}
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="btn btn-secondary py-2 px-3 disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[var(--text-secondary)] px-2 text-sm">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="btn btn-secondary py-2 px-3 disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
}
