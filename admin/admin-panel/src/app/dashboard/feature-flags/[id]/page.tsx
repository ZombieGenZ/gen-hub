'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { featureFlagApi, FeatureFlag, FeatureFlagLog } from '@/lib/api';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    ArrowLeft,
    Flag,
    Loader2,
    RefreshCw,
    Clock,
    User,
    Globe,
    Monitor,
    ChevronLeft,
    ChevronRight,
    ToggleRight,
    ToggleLeft,
} from 'lucide-react';

export default function FlagDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { t, language } = useLanguage();

    const [flag, setFlag] = useState<FeatureFlag | null>(null);
    const [logs, setLogs] = useState<FeatureFlagLog[]>([]);
    const [totalLogs, setTotalLogs] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [logsPage, setLogsPage] = useState(1);
    const logsLimit = 10;

    const fetchFlag = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await featureFlagApi.getById(id);
            setFlag(data);
        } catch (error) {
            console.error('Failed to fetch flag:', error);
            toast.error(t('featureFlags.detail.fetchError') || 'Failed to fetch flag');
            router.push('/dashboard/feature-flags');
        } finally {
            setIsLoading(false);
        }
    }, [id, router, t]);

    const fetchLogs = useCallback(async () => {
        setIsLoadingLogs(true);
        try {
            const response = await featureFlagApi.getLogs(id, {
                page: logsPage,
                limit: logsLimit,
            });
            setLogs(response.data);
            setTotalLogs(response.total);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
            toast.error(t('featureFlags.detail.fetchLogsError') || 'Failed to fetch logs');
        } finally {
            setIsLoadingLogs(false);
        }
    }, [id, logsPage, t]);

    useEffect(() => {
        fetchFlag();
    }, [fetchFlag]);

    useEffect(() => {
        if (flag) {
            fetchLogs();
        }
    }, [flag, fetchLogs]);

    const handleToggle = async () => {
        if (!flag) return;
        setIsToggling(true);
        try {
            const updated = await featureFlagApi.toggle(flag.id, !flag.is_active);
            setFlag(updated);
            toast.success(t('featureFlags.toggleSuccess') || `Flag ${!flag.is_active ? 'enabled' : 'disabled'}`);
            fetchLogs();
        } catch (error) {
            console.error('Failed to toggle flag:', error);
            toast.error(t('featureFlags.toggleError') || 'Failed to toggle flag');
        } finally {
            setIsToggling(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

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

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'ENABLED':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">{t('featureFlags.detail.enabled') || 'Enabled'}</span>;
            case 'DISABLED':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">{t('featureFlags.detail.disabled') || 'Disabled'}</span>;
            case 'CREATED':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">{t('featureFlags.detail.created') || 'Created'}</span>;
            case 'DELETED':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">{t('featureFlags.detail.deleted') || 'Deleted'}</span>;
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">{action}</span>;
        }
    };

    const totalLogsPages = Math.ceil(totalLogs / logsLimit);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
            </div>
        );
    }

    if (!flag) {
        return null;
    }

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.push('/dashboard/feature-flags')}
                    className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('featureFlags.detail.backToList') || 'Back to Feature Flags'}
                </button>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                            <Flag className="w-6 h-6 text-[var(--accent-primary)]" />
                            {t('featureFlags.detail.title') || 'Feature Flag Details'}
                        </h1>
                        <code className="text-[var(--accent-primary)] text-lg">{flag.path}</code>
                    </div>
                    <button
                        onClick={() => fetchLogs()}
                        disabled={isLoadingLogs}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--background-tertiary)] hover:bg-[var(--background-secondary)] text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                        {t('featureFlags.detail.refreshLogs') || 'Refresh Logs'}
                    </button>
                </div>
            </div>

            {/* Flag Info Card */}
            <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)] mb-8">
                <h2 className="text-lg font-semibold text-white mb-6">{t('featureFlags.detail.infoTitle') || 'Flag Information'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <p className="text-sm text-[var(--text-muted)] mb-1">{t('featureFlags.table.method') || 'Method'}</p>
                        <span className={getMethodBadgeClass(flag.method)}>{flag.method}</span>
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-muted)] mb-1">{t('featureFlags.table.path') || 'Path'}</p>
                        <code className="text-sm text-white">{flag.path}</code>
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-muted)] mb-1">{t('featureFlags.table.module') || 'Module'}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">{flag.module}</span>
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-muted)] mb-1">{t('featureFlags.table.status') || 'Status'}</p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleToggle}
                                disabled={isToggling}
                                className="p-2 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors disabled:opacity-50"
                            >
                                {isToggling ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
                                ) : flag.is_active ? (
                                    <ToggleRight className="w-6 h-6 text-green-400" />
                                ) : (
                                    <ToggleLeft className="w-6 h-6 text-[var(--text-muted)]" />
                                )}
                            </button>
                            <span className={`text-sm font-medium ${flag.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                {flag.is_active ? (t('featureFlags.active') || 'Active') : (t('featureFlags.inactive') || 'Inactive')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--border-primary)] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Clock className="w-4 h-4" />
                        {t('featureFlags.detail.createdAt') || 'Created'}: {formatDate(flag.created_at)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Clock className="w-4 h-4" />
                        {t('featureFlags.detail.updatedAt') || 'Updated'}: {formatDate(flag.updated_at)}
                    </div>
                </div>
            </div>

            {/* Logs Section */}
            <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
                    {t('featureFlags.detail.historyTitle') || 'Change History'} ({totalLogs} logs)
                </h2>

                {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)]">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{t('featureFlags.detail.noLogs') || 'No logs found'}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="p-4 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border-primary)]"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-3">
                                        {log.action === 'ENABLED' ? (
                                            <ToggleRight className="w-5 h-5 text-green-400" />
                                        ) : log.action === 'DISABLED' ? (
                                            <ToggleLeft className="w-5 h-5 text-red-400" />
                                        ) : (
                                            <Flag className="w-5 h-5 text-[var(--accent-primary)]" />
                                        )}
                                        {getActionBadge(log.action)}
                                        <span className="text-sm text-[var(--text-secondary)]">
                                            {log.previous_state !== null && (
                                                <>
                                                    {log.previous_state ? 'Enabled' : 'Disabled'} → {log.new_state ? 'Enabled' : 'Disabled'}
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <span className="text-sm text-[var(--text-muted)]">
                                        {formatDate(log.created_at)}
                                    </span>
                                </div>

                                {log.description && (
                                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                                        {log.description}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                                    {log.user_id && (
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {t('featureFlags.detail.user') || 'User'}: {log.user_id.substring(0, 8)}...
                                        </div>
                                    )}
                                    {log.ip_address && (
                                        <div className="flex items-center gap-1">
                                            <Globe className="w-3 h-3" />
                                            {t('featureFlags.detail.ip') || 'IP'}: {log.ip_address}
                                        </div>
                                    )}
                                    {log.user_agent && (
                                        <div className="flex items-center gap-1 max-w-xs truncate">
                                            <Monitor className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{log.user_agent}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Logs Pagination */}
                {totalLogsPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--border-primary)]">
                        <p className="text-sm text-[var(--text-secondary)]">
                            {t('featureFlags.detail.page') || 'Page'} {logsPage} / {totalLogsPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                                disabled={logsPage === 1 || isLoadingLogs}
                                className="p-2 rounded-lg hover:bg-[var(--background-tertiary)] disabled:opacity-50"
                            >
                                <ChevronLeft className="w-4 h-4 text-white" />
                            </button>
                            <button
                                onClick={() => setLogsPage(p => Math.min(totalLogsPages, p + 1))}
                                disabled={logsPage === totalLogsPages || isLoadingLogs}
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
