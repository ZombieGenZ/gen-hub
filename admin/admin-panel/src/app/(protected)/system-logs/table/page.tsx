'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
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
    Download,
    FileDown,
    X,
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

    // Export Modal State
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [exportLevel, setExportLevel] = useState<LogLevel | ''>('');
    const [exportModule, setExportModule] = useState('');
    const [isExporting, setIsExporting] = useState(false);

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

    const downloadLogs = () => {
        const logText = logs.map(log =>
            `[${new Date(log.created_at).toISOString()}] [${log.level}] [${log.module}:${log.action}] ${log.message}`
        ).join('\n');

        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await systemLogsApi.getAll({
                page: 1,
                limit: 10000000,
                level: exportLevel || undefined,
                module: exportModule || undefined,
                startDate: exportStartDate || undefined,
                endDate: exportEndDate || undefined,
            });

            if (response.data.length === 0) {
                toast.warning(t('systemLogs.export.noData') || 'No logs found with selected filters');
                return;
            }

            const logText = response.data.map(log =>
                `[${new Date(log.created_at).toISOString()}] [${log.level}] [${log.module}:${log.action}] ${log.message}`
            ).join('\n');

            const blob = new Blob([logText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            const levelStr = exportLevel ? `-${exportLevel}` : '';
            const moduleStr = exportModule ? `-${exportModule}` : '';
            a.download = `system-logs${levelStr}${moduleStr}-${dateStr}.txt`;
            a.click();
            URL.revokeObjectURL(url);

            setShowExportModal(false);
            setExportStartDate('');
            setExportEndDate('');
            setExportLevel('');
            setExportModule('');
        } catch (error) {
            console.error('Failed to export logs:', error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">{t('systemLogs.tableTitle') || 'System Logs Table'}</h1>
                    <p className="text-[var(--text-secondary)] text-sm">
                        {t('systemLogs.tableSubtitle') || 'Browse and search historical logs'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Quick Download */}
                    <button
                        onClick={downloadLogs}
                        disabled={logs.length === 0}
                        className="flex items-center gap-2 px-3 py-2 bg-[var(--background-secondary)] hover:bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:text-white rounded-lg transition-colors disabled:opacity-50"
                        title="Download current logs"
                    >
                        <Download className="w-4 h-4" />
                    </button>

                    {/* Export with filters */}
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors"
                        title={t('common.export') || 'Export'}
                    >
                        <FileDown className="w-4 h-4" />
                        {t('common.export') || 'Export'}
                    </button>

                    {/* Refresh */}
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

            {/* Export Modal */}
            {showExportModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4 overflow-y-auto"
                    onClick={(e) => e.target === e.currentTarget && setShowExportModal(false)}
                >
                    <div className="bg-gradient-to-b from-[#1a1f2e] to-[#0f1419] rounded-2xl border border-[#30363d] shadow-2xl w-full max-w-lg animate-scaleIn max-h-[90vh] overflow-y-auto my-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/20">
                                    <FileDown className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{t('systemLogs.export.title') || 'Export Logs'}</h2>
                                    <p className="text-xs text-[var(--text-muted)]">Configure export options</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[#30363d] transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-5">
                            {/* Date Range */}
                            <div className="bg-[#0d1117] rounded-xl p-4 border border-[#21262d]">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-sm font-medium text-white">
                                        {t('systemLogs.export.dateRange') || 'Date Range'}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)] ml-auto">Optional</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1.5">
                                            {t('systemLogs.export.startDate') || 'Start Date'}
                                        </label>
                                        <input
                                            type="date"
                                            value={exportStartDate}
                                            onChange={(e) => setExportStartDate(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-[#161b22] border border-[#30363d] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1.5">
                                            {t('systemLogs.export.endDate') || 'End Date'}
                                        </label>
                                        <input
                                            type="date"
                                            value={exportEndDate}
                                            onChange={(e) => setExportEndDate(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-[#161b22] border border-[#30363d] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Level Filter */}
                            <div className="bg-[#0d1117] rounded-xl p-4 border border-[#21262d]">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span className="text-sm font-medium text-white">
                                        {t('systemLogs.export.level') || 'Log Level'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setExportLevel('')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${exportLevel === '' ? 'bg-blue-500 text-white' : 'bg-[#161b22] text-[var(--text-secondary)] hover:bg-[#21262d]'}`}
                                    >
                                        {t('common.all') || 'All'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setExportLevel('INFO')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${exportLevel === 'INFO' ? 'bg-cyan-500 text-white' : 'bg-[#161b22] text-cyan-400 hover:bg-[#21262d]'}`}
                                    >
                                        INFO
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setExportLevel('WARN')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${exportLevel === 'WARN' ? 'bg-yellow-500 text-white' : 'bg-[#161b22] text-yellow-400 hover:bg-[#21262d]'}`}
                                    >
                                        WARN
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setExportLevel('ERROR')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${exportLevel === 'ERROR' ? 'bg-red-500 text-white' : 'bg-[#161b22] text-red-400 hover:bg-[#21262d]'}`}
                                    >
                                        ERROR
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setExportLevel('DEBUG')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${exportLevel === 'DEBUG' ? 'bg-purple-500 text-white' : 'bg-[#161b22] text-purple-400 hover:bg-[#21262d]'}`}
                                    >
                                        DEBUG
                                    </button>
                                </div>
                            </div>

                            {/* Module Filter */}
                            <div className="bg-[#0d1117] rounded-xl p-4 border border-[#21262d]">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <span className="text-sm font-medium text-white">
                                        {t('systemLogs.export.module') || 'Module'}
                                    </span>
                                </div>
                                <select
                                    value={exportModule}
                                    onChange={(e) => setExportModule(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-[#161b22] border border-[#30363d] rounded-lg text-white text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-all appearance-none cursor-pointer"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236e7681'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                                >
                                    <option value="">{t('common.all') || 'All Modules'}</option>
                                    {modules
                                        .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
                                        .sort((a, b) => a.localeCompare(b))
                                        .map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#30363d] bg-[#0d1117]/50 rounded-b-2xl">
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-[#21262d] rounded-lg transition-all"
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-green-500/25"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('systemLogs.export.exporting') || 'Exporting...'}
                                    </>
                                ) : (
                                    <>
                                        <FileDown className="w-4 h-4" />
                                        {t('common.export') || 'Export'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
