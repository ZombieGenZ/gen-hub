'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { systemLogsApi, SystemLog } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Activity,
    AlertTriangle,
    AlertCircle,
    Bug,
    Info,
    RefreshCw,
    Loader2,
    Search,
    Filter,
    ChevronDown,
    ChevronRight,
    Terminal,
    ArrowLeft,
} from 'lucide-react';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export default function SystemLogsTablePage() {
    const { t } = useLanguage();
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [stats, setStats] = useState<{ total: number; recentCount: number; byLevel: Record<string, number> } | null>(null);
    const [modules, setModules] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

    // Filters
    const [levelFilter, setLevelFilter] = useState<LogLevel | ''>('');
    const [moduleFilter, setModuleFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await systemLogsApi.getAll({
                page,
                limit: 50,
                level: levelFilter || undefined,
                module: moduleFilter || undefined,
                search: searchQuery || undefined,
            });
            setLogs(response.data);
            setTotalPages(response.meta.totalPages);
            setTotal(response.meta.total);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [page, levelFilter, moduleFilter, searchQuery]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await systemLogsApi.getStats();
            setStats(response);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    const fetchModules = useCallback(async () => {
        try {
            const response = await systemLogsApi.getModules();
            setModules(response);
        } catch (error) {
            console.error('Failed to fetch modules:', error);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
        fetchStats();
        fetchModules();
    }, [fetchLogs, fetchStats, fetchModules]);

    useEffect(() => {
        fetchLogs();
    }, [page, levelFilter, moduleFilter, searchQuery, fetchLogs]);

    const toggleLogExpanded = (logId: string) => {
        setExpandedLogs((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(logId)) {
                newSet.delete(logId);
            } else {
                newSet.add(logId);
            }
            return newSet;
        });
    };

    const getLevelIcon = (level: LogLevel) => {
        switch (level) {
            case 'ERROR':
                return <AlertCircle className="w-4 h-4" />;
            case 'WARN':
                return <AlertTriangle className="w-4 h-4" />;
            case 'DEBUG':
                return <Bug className="w-4 h-4" />;
            default:
                return <Info className="w-4 h-4" />;
        }
    };

    const getLevelColor = (level: LogLevel) => {
        switch (level) {
            case 'ERROR':
                return 'text-red-400 bg-red-500/20';
            case 'WARN':
                return 'text-yellow-400 bg-yellow-500/20';
            case 'DEBUG':
                return 'text-purple-400 bg-purple-500/20';
            default:
                return 'text-blue-400 bg-blue-500/20';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/system-logs"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--background-secondary)] hover:bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('common.back') || 'Back'}
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{t('systemLogs.tableTitle') || 'System Logs Table'}</h1>
                        <p className="text-[var(--text-secondary)] text-sm">
                            {t('systemLogs.tableSubtitle') || 'Browse and search historical logs'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/dashboard/system-logs"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white transition-colors"
                    >
                        <Terminal className="w-4 h-4" />
                        {t('systemLogs.consoleView') || 'Console View'}
                    </Link>
                    <button
                        onClick={() => { fetchLogs(); fetchStats(); }}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--background-secondary)] hover:bg-[var(--background-tertiary)] text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        {t('common.refresh') || 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-4 border border-[var(--border-primary)]">
                        <p className="text-[var(--text-muted)] text-sm">{t('systemLogs.stats.total') || 'Total'}</p>
                        <p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p>
                    </div>
                    <div className="bg-[var(--background-secondary)] rounded-xl p-4 border border-[var(--border-primary)]">
                        <p className="text-[var(--text-muted)] text-sm">{t('systemLogs.stats.last24h') || 'Last 24h'}</p>
                        <p className="text-2xl font-bold text-white">{stats.recentCount.toLocaleString()}</p>
                    </div>
                    <div className="bg-[var(--background-secondary)] rounded-xl p-4 border border-[var(--border-primary)]">
                        <p className="text-[var(--text-muted)] text-sm flex items-center gap-1"><Info className="w-3 h-3 text-blue-400" /> INFO</p>
                        <p className="text-2xl font-bold text-blue-400">{stats.byLevel.INFO?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-[var(--background-secondary)] rounded-xl p-4 border border-[var(--border-primary)]">
                        <p className="text-[var(--text-muted)] text-sm flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-yellow-400" /> WARN</p>
                        <p className="text-2xl font-bold text-yellow-400">{stats.byLevel.WARN?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-[var(--background-secondary)] rounded-xl p-4 border border-[var(--border-primary)]">
                        <p className="text-[var(--text-muted)] text-sm flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-400" /> ERROR</p>
                        <p className="text-2xl font-bold text-red-400">{stats.byLevel.ERROR?.toLocaleString() || 0}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-[var(--background-secondary)] rounded-xl p-4 border border-[var(--border-primary)] mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            placeholder={t('systemLogs.searchPlaceholder') || 'Search messages...'}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                    </div>

                    {/* Level Filter */}
                    <div className="relative">
                        <select
                            value={levelFilter}
                            onChange={(e) => { setLevelFilter(e.target.value as LogLevel | ''); setPage(1); }}
                            className="appearance-none px-4 py-2 pr-8 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)]"
                        >
                            <option value="">{t('systemLogs.filters.allLevels') || 'All Levels'}</option>
                            <option value="INFO">INFO</option>
                            <option value="WARN">WARN</option>
                            <option value="ERROR">ERROR</option>
                            <option value="DEBUG">DEBUG</option>
                        </select>
                        <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                    </div>

                    {/* Module Filter */}
                    <div className="relative">
                        <select
                            value={moduleFilter}
                            onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
                            className="appearance-none px-4 py-2 pr-8 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)]"
                        >
                            <option value="">{t('systemLogs.filters.allModules') || 'All Modules'}</option>
                            {modules.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-[var(--background-secondary)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
                {isLoading && logs.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                        <Activity className="w-12 h-12 mb-4" />
                        <p>{t('systemLogs.noLogs') || 'No logs found'}</p>
                    </div>
                ) : (
                    <div className="max-h-[600px] overflow-y-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-[var(--background-tertiary)]">
                                <tr className="text-left text-sm text-[var(--text-muted)]">
                                    <th className="px-4 py-3 w-8"></th>
                                    <th className="px-4 py-3 w-24">{t('systemLogs.table.level') || 'Level'}</th>
                                    <th className="px-4 py-3 w-32">{t('systemLogs.table.module') || 'Module'}</th>
                                    <th className="px-4 py-3 w-32">{t('systemLogs.table.action') || 'Action'}</th>
                                    <th className="px-4 py-3">{t('systemLogs.table.message') || 'Message'}</th>
                                    <th className="px-4 py-3 w-40">{t('systemLogs.table.time') || 'Time'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-primary)]">
                                {logs.map((log) => (
                                    <>
                                        <tr
                                            key={log.id}
                                            className="hover:bg-[var(--background-tertiary)] cursor-pointer transition-colors"
                                            onClick={() => toggleLogExpanded(log.id)}
                                        >
                                            <td className="px-4 py-3">
                                                {log.meta_data && Object.keys(log.meta_data).length > 0 && (
                                                    expandedLogs.has(log.id) ? (
                                                        <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                                                    )
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(log.level as LogLevel)}`}>
                                                    {getLevelIcon(log.level as LogLevel)}
                                                    {log.level}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{log.module}</td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{log.action}</td>
                                            <td className="px-4 py-3 text-sm text-white truncate max-w-md">{log.message}</td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{formatDate(log.created_at)}</td>
                                        </tr>
                                        {expandedLogs.has(log.id) && log.meta_data && (
                                            <tr key={`${log.id}-details`} className="bg-[var(--background-tertiary)]">
                                                <td colSpan={6} className="px-8 py-4">
                                                    <div className="text-sm">
                                                        <p className="text-[var(--text-muted)] mb-2">{t('systemLogs.metadata') || 'Metadata'}:</p>
                                                        <pre className="bg-[var(--background-primary)] p-3 rounded-lg text-[var(--text-secondary)] overflow-x-auto">
                                                            {JSON.stringify(log.meta_data, null, 2)}
                                                        </pre>
                                                        {log.user_id && (
                                                            <p className="text-[var(--text-muted)] mt-2">{t('systemLogs.userId') || 'User ID'}: <span className="text-white">{log.user_id}</span></p>
                                                        )}
                                                        {log.ip_address && (
                                                            <p className="text-[var(--text-muted)]">{t('systemLogs.ipAddress') || 'IP Address'}: <span className="text-white">{log.ip_address}</span></p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-primary)]">
                        <p className="text-sm text-[var(--text-muted)]">
                            {t('systemLogs.showing') || 'Showing'} {logs.length} {t('systemLogs.of') || 'of'} {total} {t('systemLogs.logs') || 'logs'}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 text-sm bg-[var(--background-tertiary)] text-white rounded hover:bg-[var(--background-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('common.previous') || 'Previous'}
                            </button>
                            <span className="text-sm text-[var(--text-secondary)]">
                                {t('systemLogs.page') || 'Page'} {page} {t('systemLogs.of') || 'of'} {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 text-sm bg-[var(--background-tertiary)] text-white rounded hover:bg-[var(--background-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('common.next') || 'Next'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
