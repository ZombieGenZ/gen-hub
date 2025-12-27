'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { featureFlagApi, FeatureFlag, FeatureFlagLog } from '@/lib/api';
import { toast } from 'sonner';
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
            toast.error('Không thể tải thông tin feature flag');
            router.push('/dashboard');
        } finally {
            setIsLoading(false);
        }
    }, [id, router]);

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
            toast.error('Không thể tải lịch sử thay đổi');
        } finally {
            setIsLoadingLogs(false);
        }
    }, [id, logsPage]);

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
            toast.success(`Feature flag đã được ${!flag.is_active ? 'bật' : 'tắt'}`);
            // Refresh logs
            fetchLogs();
        } catch (error) {
            console.error('Failed to toggle flag:', error);
            toast.error('Không thể thay đổi trạng thái feature flag');
        } finally {
            setIsToggling(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('vi-VN', {
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
        return `method-badge method-${methodLower}`;
    };

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'ENABLED':
                return <span className="badge badge-success">Đã bật</span>;
            case 'DISABLED':
                return <span className="badge badge-error">Đã tắt</span>;
            case 'CREATED':
                return <span className="badge badge-info">Đã tạo</span>;
            case 'DELETED':
                return <span className="badge badge-warning">Đã xóa</span>;
            default:
                return <span className="badge">{action}</span>;
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
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại Dashboard
                </button>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                            <Flag className="w-6 h-6 text-[var(--accent-primary)]" />
                            Chi tiết Feature Flag
                        </h1>
                        <code className="text-[var(--accent-primary)] text-lg">{flag.path}</code>
                    </div>
                    <button
                        onClick={() => fetchLogs()}
                        disabled={isLoadingLogs}
                        className="btn btn-secondary"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                        Refresh Logs
                    </button>
                </div>
            </div>

            {/* Flag Info Card */}
            <div className="card mb-8">
                <h2 className="text-lg font-semibold text-white mb-6">Thông tin Flag</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <p className="text-sm text-[var(--text-muted)] mb-1">Method</p>
                        <span className={getMethodBadgeClass(flag.method)}>{flag.method}</span>
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-muted)] mb-1">Path</p>
                        <code className="text-sm text-[var(--text-primary)]">{flag.path}</code>
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-muted)] mb-1">Module</p>
                        <span className="badge badge-info">{flag.module}</span>
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-muted)] mb-1">Trạng thái</p>
                        <div className="flex items-center gap-3">
                            <label className="toggle">
                                <input
                                    type="checkbox"
                                    checked={flag.is_active}
                                    onChange={handleToggle}
                                    disabled={isToggling}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                            <span className={`text-sm font-medium ${flag.is_active ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
                                {flag.is_active ? 'Đang bật' : 'Đang tắt'}
                            </span>
                            {isToggling && <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-primary)]" />}
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--border-primary)] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Clock className="w-4 h-4" />
                        Tạo lúc: {formatDate(flag.created_at)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Clock className="w-4 h-4" />
                        Cập nhật: {formatDate(flag.updated_at)}
                    </div>
                </div>
            </div>

            {/* Activity Logs */}
            <div className="card">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
                    Lịch sử thay đổi ({totalLogs} logs)
                </h2>

                {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)]">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Chưa có lịch sử thay đổi</p>
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
                                            <ToggleRight className="w-5 h-5 text-[var(--status-success)]" />
                                        ) : log.action === 'DISABLED' ? (
                                            <ToggleLeft className="w-5 h-5 text-[var(--status-error)]" />
                                        ) : (
                                            <Flag className="w-5 h-5 text-[var(--accent-primary)]" />
                                        )}
                                        {getActionBadge(log.action)}
                                        <span className="text-sm text-[var(--text-secondary)]">
                                            {log.previous_state !== null && (
                                                <>
                                                    {log.previous_state ? 'Bật' : 'Tắt'} → {log.new_state ? 'Bật' : 'Tắt'}
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
                                            User: {log.user_id.substring(0, 8)}...
                                        </div>
                                    )}
                                    {log.ip_address && (
                                        <div className="flex items-center gap-1">
                                            <Globe className="w-3 h-3" />
                                            IP: {log.ip_address}
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
                            Trang {logsPage} / {totalLogsPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                                disabled={logsPage === 1 || isLoadingLogs}
                                className="btn btn-secondary py-2 px-3 disabled:opacity-50"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setLogsPage(p => Math.min(totalLogsPages, p + 1))}
                                disabled={logsPage === totalLogsPages || isLoadingLogs}
                                className="btn btn-secondary py-2 px-3 disabled:opacity-50"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
