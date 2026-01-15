'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { featureFlagApi, FeatureFlag } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
    Flag,
    Search,
    RefreshCw,
    Loader2,
    ToggleLeft,
    ToggleRight,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

const PAGE_SIZE_OPTIONS = [25, 50, 75, 100];
const LOCALSTORAGE_PAGE_SIZE_KEY = 'admin-panel-feature-flags-page-size';

const getInitialPageSize = (): number => {
    if (typeof window === 'undefined') return 25;
    const saved = localStorage.getItem(LOCALSTORAGE_PAGE_SIZE_KEY);
    if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && PAGE_SIZE_OPTIONS.includes(num)) return num;
    }
    return 25;
};

export default function FeatureFlagsPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [modules, setModules] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

    // Stats
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

    // Filters
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(getInitialPageSize);
    const [selectedModule, setSelectedModule] = useState<string>('');
    const [activeFilter, setActiveFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

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

    const fetchStats = useCallback(async () => {
        try {
            const response = await featureFlagApi.getStats();
            setStats(response);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    useEffect(() => {
        fetchFlags();
    }, [fetchFlags]);

    useEffect(() => {
        fetchModules();
        fetchStats();
    }, [fetchModules, fetchStats]);

    const handleToggle = async (id: string, currentState: boolean) => {
        setIsTogglingId(id);
        try {
            await featureFlagApi.toggle(id, !currentState);
            setFlags(prev => prev.map(f =>
                f.id === id ? { ...f, is_active: !currentState } : f
            ));
            toast.success(t('featureFlags.toggleSuccess') || `Flag ${!currentState ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Failed to toggle flag:', error);
            toast.error(t('featureFlags.toggleError') || 'Failed to toggle flag');
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
            toast.success(t('featureFlags.bulkSuccess') || `Updated ${selectedIds.size} flags`);
        } catch (error) {
            console.error('Failed to bulk toggle:', error);
            toast.error(t('featureFlags.bulkError') || 'Failed to update flags');
        } finally {
            setIsBulkToggling(false);
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

    const getMethodBadgeClass = (method: string) => {
        const methodLower = method.toLowerCase();
        return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${methodLower === 'get' ? 'bg-green-500/20 text-green-400' :
            methodLower === 'post' ? 'bg-blue-500/20 text-blue-400' :
                methodLower === 'put' ? 'bg-yellow-500/20 text-yellow-400' :
                    methodLower === 'patch' ? 'bg-orange-500/20 text-orange-400' :
                        methodLower === 'delete' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
            }`;
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('featureFlags.title') || 'Feature Flags'}</h1>
                    <p className="text-[var(--text-secondary)]">
                        {t('featureFlags.subtitle') || 'Manage API feature flags'}
                    </p>
                </div>
                <button
                    onClick={() => { fetchFlags(); fetchStats(); }}
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
                            <Flag className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('featureFlags.stats.total') || 'Total'}</p>
                            <p className="text-2xl font-bold text-white">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-green-500/20">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('featureFlags.stats.active') || 'Active'}</p>
                            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-red-500/20">
                            <XCircle className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('featureFlags.stats.inactive') || 'Inactive'}</p>
                            <p className="text-2xl font-bold text-red-400">{stats.inactive}</p>
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
                            placeholder={t('featureFlags.searchPlaceholder') || 'Search by path or module...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                    </div>

                    {/* Module Filter */}
                    <select
                        value={selectedModule}
                        onChange={(e) => setSelectedModule(e.target.value)}
                        className="px-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)]"
                    >
                        <option value="">{t('featureFlags.allModules') || 'All Modules'}</option>
                        {modules.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value)}
                        className="px-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)]"
                    >
                        <option value="">{t('featureFlags.allStatus') || 'All Status'}</option>
                        <option value="true">{t('featureFlags.active') || 'Active'}</option>
                        <option value="false">{t('featureFlags.inactive') || 'Inactive'}</option>
                    </select>
                </div>

                {/* Bulk Actions */}
                {selectedIds.size > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-primary)] flex items-center gap-4">
                        <span className="text-[var(--text-secondary)]">
                            {selectedIds.size} {t('featureFlags.selected') || 'selected'}
                        </span>
                        <button
                            onClick={() => handleBulkToggle(true)}
                            disabled={isBulkToggling}
                            className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50"
                        >
                            {t('featureFlags.enableAll') || 'Enable All'}
                        </button>
                        <button
                            onClick={() => handleBulkToggle(false)}
                            disabled={isBulkToggling}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50"
                        >
                            {t('featureFlags.disableAll') || 'Disable All'}
                        </button>
                    </div>
                )}
            </div>

            {/* Flags Table */}
            <div className="bg-[var(--background-secondary)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                    </div>
                ) : flags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                        <Flag className="w-12 h-12 mb-4" />
                        <p>{t('featureFlags.noFlags') || 'No feature flags found'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border-primary)] bg-[var(--background-tertiary)]">
                                    <th className="px-4 py-3 text-left">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === flags.length && flags.length > 0}
                                                onChange={() => {
                                                    if (selectedIds.size === flags.length) {
                                                        setSelectedIds(new Set());
                                                    } else {
                                                        setSelectedIds(new Set(flags.map(f => f.id)));
                                                    }
                                                }}
                                                className="sr-only peer"
                                            />
                                            <div className="w-5 h-5 rounded border-2 border-[var(--border-primary)] bg-[var(--background-tertiary)] peer-checked:bg-[var(--accent-primary)] peer-checked:border-[var(--accent-primary)] transition-all duration-200 flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </label>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('featureFlags.table.module') || 'Module'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('featureFlags.table.method') || 'Method'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('featureFlags.table.path') || 'Path'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('featureFlags.table.status') || 'Status'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('featureFlags.table.actions') || 'Actions'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {flags.map((flag) => (
                                    <tr
                                        key={flag.id}
                                        className="border-b border-[var(--border-primary)] hover:bg-[var(--background-tertiary)] cursor-pointer transition-colors"
                                        onClick={() => router.push(`/dashboard/feature-flags/${flag.id}`)}
                                    >
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(flag.id)}
                                                    onChange={() => toggleSelect(flag.id)}
                                                    className="sr-only peer"
                                                />
                                                <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${selectedIds.has(flag.id)
                                                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                                                        : 'border-[var(--border-primary)] bg-[var(--background-tertiary)] hover:border-[var(--accent-primary)]/50'
                                                    }`}>
                                                    <svg className={`w-3 h-3 text-white transition-opacity duration-200 ${selectedIds.has(flag.id) ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            </label>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[var(--text-secondary)]">{flag.module}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={getMethodBadgeClass(flag.method)}>{flag.method}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-white font-mono text-sm">{flag.path}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {flag.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {t('featureFlags.active') || 'Active'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                                                    <XCircle className="w-3 h-3" />
                                                    {t('featureFlags.inactive') || 'Inactive'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleToggle(flag.id, flag.is_active)}
                                                disabled={isTogglingId === flag.id}
                                                className="p-2 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors disabled:opacity-50"
                                                title={flag.is_active ? 'Disable' : 'Enable'}
                                            >
                                                {isTogglingId === flag.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
                                                ) : flag.is_active ? (
                                                    <ToggleRight className="w-5 h-5 text-green-400" />
                                                ) : (
                                                    <ToggleLeft className="w-5 h-5 text-[var(--text-muted)]" />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-primary)]">
                        <div className="flex items-center gap-2">
                            <span className="text-[var(--text-muted)] text-sm">
                                {t('featureFlags.pagination.showing') || 'Showing'} {(page - 1) * limit + 1} - {Math.min(page * limit, total)} {t('featureFlags.pagination.of') || 'of'} {total}
                            </span>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    const newLimit = parseInt(e.target.value);
                                    setLimit(newLimit);
                                    localStorage.setItem(LOCALSTORAGE_PAGE_SIZE_KEY, String(newLimit));
                                    setPage(1);
                                }}
                                className="px-2 py-1 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded text-sm text-white"
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
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
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
