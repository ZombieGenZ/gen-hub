'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { resourcesApi, resourcesSocket, type ResourcesData, type ServiceMetrics } from '@/lib/api';
import {
    RefreshCw,
    Loader2,
    Activity,
    Cpu,
    HardDrive,
    Wifi,
    WifiOff,
    Server,
    CheckCircle2,
    XCircle,
    Clock,
    ArrowDown,
    ArrowUp,
} from 'lucide-react';

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${seconds % 60}s`;
}

function ProgressBar({ value, color = 'accent' }: { value: number; color?: string }) {
    const getColorClass = () => {
        if (value > 90) return 'bg-[var(--status-error)]';
        if (value > 70) return 'bg-[var(--status-warning)]';
        return color === 'accent' ? 'bg-[var(--accent-primary)]' : `bg-[var(--status-${color})]`;
    };

    return (
        <div className="w-full bg-[var(--background-tertiary)] rounded-full h-2 overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ${getColorClass()}`}
                style={{ width: `${Math.min(100, value)}%` }}
            />
        </div>
    );
}

function ServiceCard({ service, t }: { service: ServiceMetrics; t: (key: string) => string }) {
    const isOnline = service.status === 'online';

    return (
        <div className={`card group transition-all duration-300 ${isOnline
            ? 'hover:border-[var(--status-success)]'
            : 'hover:border-[var(--status-error)] opacity-75'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOnline
                        ? 'bg-[rgba(16,185,129,0.2)]'
                        : 'bg-[rgba(239,68,68,0.2)]'
                        }`}>
                        <Server className={`w-5 h-5 ${isOnline ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white capitalize">{service.service}</h3>
                        <span className={`text-xs ${isOnline ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
                            {isOnline ? t('dashboard.services.online') : t('dashboard.services.offline')}
                        </span>
                    </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-[var(--status-success)] animate-pulse' : 'bg-[var(--status-error)]'}`} />
            </div>

            {isOnline ? (
                <div className="space-y-4">
                    {/* CPU */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                <Cpu className="w-3 h-3" /> CPU
                            </span>
                            <span className="text-xs font-medium text-white">{service.cpu.usage}%</span>
                        </div>
                        <ProgressBar value={service.cpu.usage} />
                    </div>

                    {/* Memory */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                <Activity className="w-3 h-3" /> {t('dashboard.services.memory')}
                            </span>
                            <span className="text-xs font-medium text-white">{service.memory.percentage}%</span>
                        </div>
                        <ProgressBar value={service.memory.percentage} />
                        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                            <span>{formatBytes(service.memory.used)}</span>
                            <span>{formatBytes(service.memory.total)}</span>
                        </div>
                    </div>

                    {/* Disk */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                <HardDrive className="w-3 h-3" /> {t('dashboard.services.disk')}
                            </span>
                            <span className="text-xs font-medium text-white">{service.disk.percentage}%</span>
                        </div>
                        <ProgressBar value={service.disk.percentage} />
                    </div>

                    {/* Network & Uptime */}
                    <div className="flex justify-between pt-2 border-t border-[var(--border-primary)]">
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <ArrowDown className="w-3 h-3 text-[var(--status-success)]" />
                            <span>{formatBytes(service.network.bytesInPerSec)}/s</span>
                            <ArrowUp className="w-3 h-3 text-[var(--status-info)]" />
                            <span>{formatBytes(service.network.bytesOutPerSec)}/s</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                            <Clock className="w-3 h-3" />
                            <span>{formatUptime(service.uptime)}</span>
                        </div>
                    </div>

                    {/* Response Time */}
                    {service.responseTime !== undefined && (
                        <div className="text-xs text-[var(--text-muted)]">
                            Response: <span className="text-white">{service.responseTime}ms</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
                    <XCircle className="w-8 h-8 mr-2 text-[var(--status-error)]" />
                    <span>Service unavailable</span>
                </div>
            )}
        </div>
    );
}

export default function DashboardPage() {
    const { t } = useLanguage();
    const [data, setData] = useState<ResourcesData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const socketInitialized = useRef(false);

    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const stats = await resourcesApi.getStats();
            setData(stats);
        } catch (error) {
            console.error('Failed to fetch resources:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initialize Socket.io connection
    useEffect(() => {
        if (socketInitialized.current) return;
        socketInitialized.current = true;

        fetchInitialData();

        const socket = resourcesSocket.connect();

        socket.on('connect', () => {
            setIsConnected(true);
            resourcesSocket.subscribe((newData) => {
                setData(newData);
                setIsLoading(false);
            });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err);
            setIsConnected(false);
        });

        return () => {
            resourcesSocket.unsubscribe();
            resourcesSocket.disconnect();
            socketInitialized.current = false;
        };
    }, [fetchInitialData]);

    const handleRefresh = () => {
        fetchInitialData();
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
                    <p className="text-[var(--text-secondary)]">{t('dashboard.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Connection Status */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isConnected
                        ? 'bg-[rgba(16,185,129,0.1)] text-[var(--status-success)] border border-[rgba(16,185,129,0.3)]'
                        : 'bg-[rgba(239,68,68,0.1)] text-[var(--status-error)] border border-[rgba(239,68,68,0.3)]'
                        }`}>
                        {isConnected ? (
                            <>
                                <Wifi className="w-4 h-4" />
                                <span>{t('dashboard.connected')}</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-4 h-4" />
                                <span>{t('dashboard.disconnected')}</span>
                            </>
                        )}
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="btn btn-secondary"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{t('dashboard.refresh')}</span>
                    </button>
                </div>
            </div>

            {/* Overview Stats */}
            {data?.overview && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <div className="card">
                        <p className="text-xs text-[var(--text-secondary)] mb-1">{t('dashboard.overview.totalServices')}</p>
                        <p className="text-2xl font-bold text-white">{data.overview.totalServices}</p>
                    </div>
                    <div className="card border-[var(--status-success)]">
                        <p className="text-xs text-[var(--text-secondary)] mb-1">{t('dashboard.overview.online')}</p>
                        <p className="text-2xl font-bold text-[var(--status-success)]">{data.overview.onlineServices}</p>
                    </div>
                    <div className="card border-[var(--status-error)]">
                        <p className="text-xs text-[var(--text-secondary)] mb-1">{t('dashboard.overview.offline')}</p>
                        <p className="text-2xl font-bold text-[var(--status-error)]">{data.overview.offlineServices}</p>
                    </div>
                    <div className="card">
                        <p className="text-xs text-[var(--text-secondary)] mb-1">{t('dashboard.overview.avgCpu')}</p>
                        <p className="text-2xl font-bold text-white">{data.overview.averageCpu}%</p>
                    </div>
                    <div className="card">
                        <p className="text-xs text-[var(--text-secondary)] mb-1">{t('dashboard.overview.avgMemory')}</p>
                        <p className="text-2xl font-bold text-white">{data.overview.averageMemory}%</p>
                    </div>
                    <div className="card">
                        <p className="text-xs text-[var(--text-secondary)] mb-1">{t('dashboard.overview.avgDisk')}</p>
                        <p className="text-2xl font-bold text-white">{data.overview.averageDisk}%</p>
                    </div>
                </div>
            )}

            {/* Services Grid */}
            <div className="mb-4">
                <h2 className="text-xl font-semibold text-white mb-4">{t('dashboard.services.title')}</h2>
            </div>

            {isLoading && !data ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                </div>
            ) : data?.services ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.services.map((service) => (
                        <ServiceCard key={service.service} service={service} t={t} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-[var(--text-muted)]">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No services data available</p>
                </div>
            )}

            {/* Last Updated */}
            {data?.overview?.timestamp && (
                <div className="mt-8 text-center text-xs text-[var(--text-muted)]">
                    Last updated: {new Date(data.overview.timestamp).toLocaleTimeString()}
                </div>
            )}
        </div>
    );
}
