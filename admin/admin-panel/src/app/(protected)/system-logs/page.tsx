'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { systemLogsApi, systemLogsSocket, SystemLog } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Terminal,
    Wifi,
    WifiOff,
    Pause,
    Play,
    Trash2,
    Download,
    ChevronDown,
    ArrowDown,
    X,
    FileDown,
    Loader2,
} from 'lucide-react';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export default function SystemLogsPage() {
    const { t } = useLanguage();
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const consoleRef = useRef<HTMLDivElement>(null);
    const [stats, setStats] = useState<{ total: number; recentCount: number; byLevel: Record<string, number> } | null>(null);
    const [modules, setModules] = useState<string[]>([]);

    // Export Modal State
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [exportLevel, setExportLevel] = useState<LogLevel | ''>('');
    const [exportModule, setExportModule] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // Initial load - fetch 100 most recent logs
    const fetchInitialLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await systemLogsApi.getAll({ page: 1, limit: 100 });
            // Reverse to show oldest first (like terminal)
            setLogs(response.data.reverse());
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
        fetchInitialLogs();
        fetchStats();
        fetchModules();

        // Connect to WebSocket for realtime updates
        const socket = systemLogsSocket.connect();

        socket.on('connect', () => {
            setIsConnected(true);
            systemLogsSocket.subscribe((newLog) => {
                if (!isPaused) {
                    // Add new logs to bottom (oldest first, newest last like terminal)
                    setLogs((prev) => [...prev, newLog].slice(-200)); // Keep max 200 logs

                    // Update stats in real-time
                    setStats((prev) => {
                        if (!prev) return prev;
                        const level = newLog.level as string;
                        return {
                            ...prev,
                            total: prev.total + 1,
                            recentCount: prev.recentCount + 1,
                            byLevel: {
                                ...prev.byLevel,
                                [level]: (prev.byLevel[level] || 0) + 1,
                            },
                        };
                    });
                }
            });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        return () => {
            systemLogsSocket.unsubscribe();
            systemLogsSocket.disconnect();
        };
    }, [fetchInitialLogs, fetchStats, fetchModules, isPaused]);

    // Auto-scroll to bottom when new logs arrive (terminal style)
    useEffect(() => {
        if (autoScroll && consoleRef.current && !isPaused) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs, autoScroll, isPaused]);

    const clearLogs = () => {
        setLogs([]);
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
            // Fetch all logs with filters (up to 10000)
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
            // Reset filters
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

    const scrollToBottom = () => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    };

    const getLevelColor = (level: LogLevel) => {
        switch (level) {
            case 'ERROR': return 'text-red-400';
            case 'WARN': return 'text-yellow-400';
            case 'DEBUG': return 'text-purple-400';
            default: return 'text-cyan-400';
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    return (
        <div className="animate-fadeIn h-full flex flex-col">
            {/* Header */}
            <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                        <Terminal className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{t('systemLogs.title') || 'System Console'}</h1>
                        <p className="text-[var(--text-secondary)] text-sm">
                            {t('systemLogs.subtitle') || 'Real-time server activity'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Stats badges */}
                    {stats && (
                        <div className="hidden lg:flex items-center gap-2 mr-4">
                            <span className="px-2 py-1 rounded text-xs bg-cyan-500/20 text-cyan-400">
                                INFO: {stats.byLevel.INFO || 0}
                            </span>
                            <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">
                                WARN: {stats.byLevel.WARN || 0}
                            </span>
                            <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                                ERROR: {stats.byLevel.ERROR || 0}
                            </span>
                        </div>
                    )}

                    {/* Connection Status */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                        {isConnected ? 'Live' : 'Offline'}
                    </div>

                    {/* Pause/Resume */}
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${isPaused ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:text-white'}`}
                        title={isPaused ? 'Resume' : 'Pause'}
                    >
                        {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>

                    {/* Auto-scroll toggle */}
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${autoScroll ? 'bg-blue-500/20 text-blue-400' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:text-white'}`}
                        title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
                    >
                        <ArrowDown className="w-3.5 h-3.5" />
                        Auto
                    </button>

                    {/* Clear */}
                    <button
                        onClick={clearLogs}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:text-white transition-colors"
                        title="Clear console"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Download (current logs) */}
                    <button
                        onClick={downloadLogs}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:text-white transition-colors"
                        title="Download current logs"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Export with filters */}
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                        title={t('common.export') || 'Export'}
                    >
                        <FileDown className="w-3.5 h-3.5" />
                        {t('common.export') || 'Export'}
                    </button>
                </div>
            </div>

            {/* Console Container - fixed height to prevent page scroll */}
            <div className="bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>
                {/* Console Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                        </div>
                        <span className="text-[#8b949e] text-sm ml-2 font-mono">system-logs — {logs.length} entries</span>
                    </div>
                    <button
                        onClick={scrollToBottom}
                        className="text-[#8b949e] hover:text-white text-xs flex items-center gap-1"
                    >
                        <ChevronDown className="w-3 h-3" />
                        Scroll to bottom
                    </button>
                </div>

                {/* Console Output */}
                <div
                    ref={consoleRef}
                    className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed"
                    style={{ backgroundColor: '#0d1117' }}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-[#8b949e]">Loading logs...</div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-[#8b949e]">No logs available. Waiting for new entries...</div>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {logs.map((log, index) => (
                                <div key={log.id || index} className="flex items-start hover:bg-[#161b22] px-2 py-0.5 rounded group">
                                    {/* Timestamp */}
                                    <span className="text-[#6e7681] w-44 flex-shrink-0">{formatTime(log.created_at)}</span>

                                    {/* Level Badge */}
                                    <span className={`w-14 flex-shrink-0 font-semibold ${getLevelColor(log.level as LogLevel)}`}>
                                        [{log.level}]
                                    </span>

                                    {/* Module:Action */}
                                    <span className="text-[#7ee787] w-40 flex-shrink-0 truncate" title={`${log.module}:${log.action}`}>
                                        [{log.module}:{log.action}]
                                    </span>

                                    {/* Message */}
                                    <span className="text-[#c9d1d9] flex-1">{log.message}</span>

                                    {/* Meta indicator */}
                                    {log.meta_data && Object.keys(log.meta_data).length > 0 && (
                                        <span className="text-[#8b949e] opacity-0 group-hover:opacity-100 transition-opacity text-xs ml-2">
                                            [+meta]
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
