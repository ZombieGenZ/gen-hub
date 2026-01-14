'use client';

import { useState, useEffect, useCallback } from 'react';
import { resourcesApi, resourcesSocket, ResourcesData, ServiceMetrics } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Activity,
    Cpu,
    HardDrive,
    MemoryStick,
    RefreshCw,
    Loader2,
    Wifi,
    WifiOff,
    Server,
    Clock,
    Network,
} from 'lucide-react';

export default function ResourcesPage() {
    const { t } = useLanguage();
    const [data, setData] = useState<ResourcesData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await resourcesApi.getStats();
            setData(response);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch resources:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        // Connect to socket for real-time updates
        const socket = resourcesSocket.connect();

        socket.on('connect', () => {
            setIsConnected(true);
            resourcesSocket.subscribe((newData) => {
                setData(newData);
                setLastUpdated(new Date());
            });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        return () => {
            resourcesSocket.unsubscribe();
            resourcesSocket.disconnect();
        };
    }, [fetchData]);

    const formatUptime = (seconds: number): string => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    const formatBytes = (bytes: number): string => {
        if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${bytes} B`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-green-400 bg-green-500/20';
            case 'offline': return 'text-red-400 bg-red-500/20';
            default: return 'text-yellow-400 bg-yellow-500/20';
        }
    };

    const getPercentageColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('resources.title') || 'Resources Monitor'}</h1>
                    <p className="text-[var(--text-secondary)]">
                        {t('resources.subtitle') || 'Real-time service monitoring'}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Connection Status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        <span className="text-sm">{isConnected ? (t('resources.live') || 'Live') : (t('resources.disconnected') || 'Disconnected')}</span>
                    </div>

                    {/* Last Updated */}
                    {lastUpdated && (
                        <span className="text-[var(--text-muted)] text-sm">
                            {t('resources.lastUpdated') || 'Updated'}: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}

                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        {t('common.refresh') || 'Refresh'}
                    </button>
                </div>
            </div>

            {isLoading && !data ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                </div>
            ) : !data ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                    <Activity className="w-12 h-12 mb-4" />
                    <p>{t('resources.noData') || 'No data available'}</p>
                </div>
            ) : (
                <>
                    {/* Overview Cards - Row 1: Service Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-blue-500/20">
                                    <Server className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)] text-sm">{t('resources.overview.total') || 'Total Services'}</p>
                                    <p className="text-3xl font-bold text-white">{data.overview.totalServices}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-green-500/20">
                                    <Activity className="w-6 h-6 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)] text-sm">{t('resources.overview.online') || 'Online'}</p>
                                    <p className="text-3xl font-bold text-green-400">{data.overview.onlineServices}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-red-500/20">
                                    <Activity className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)] text-sm">{t('resources.overview.offline') || 'Offline'}</p>
                                    <p className="text-3xl font-bold text-red-400">{data.overview.offlineServices}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Overview Cards - Row 2: System Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-purple-500/20">
                                    <Cpu className="w-6 h-6 text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[var(--text-muted)] text-sm">{t('resources.overview.avgCpu') || 'Avg CPU'}</p>
                                    <p className="text-3xl font-bold text-purple-400">{data.overview.averageCpu.toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-yellow-500/20">
                                    <MemoryStick className="w-6 h-6 text-yellow-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[var(--text-muted)] text-sm">{t('resources.overview.avgMemory') || 'Avg Memory'}</p>
                                    <p className="text-3xl font-bold text-yellow-400">{data.overview.averageMemory.toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-cyan-500/20">
                                    <HardDrive className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[var(--text-muted)] text-sm">{t('resources.overview.avgDisk') || 'Avg Disk'}</p>
                                    <p className="text-3xl font-bold text-cyan-400">{data.overview.averageDisk.toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Services Grid */}
                    <h2 className="text-xl font-bold text-white mb-4">{t('resources.services') || 'Services'}</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {data.services.map((service) => (
                            <div key={service.service} className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                                {/* Service Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Server className="w-5 h-5 text-[var(--accent-primary)]" />
                                        <h3 className="text-lg font-semibold text-white">{service.service}</h3>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                                        {service.status}
                                    </span>
                                </div>

                                {/* Metrics */}
                                <div className="space-y-4">
                                    {/* CPU */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[var(--text-muted)] text-sm flex items-center gap-2">
                                                <Cpu className="w-4 h-4" /> CPU
                                            </span>
                                            <span className="text-white text-sm">{service.cpu.usage.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getPercentageColor(service.cpu.usage)} transition-all duration-300`}
                                                style={{ width: `${Math.min(service.cpu.usage, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Memory */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[var(--text-muted)] text-sm flex items-center gap-2">
                                                <MemoryStick className="w-4 h-4" /> Memory
                                            </span>
                                            <span className="text-white text-sm">
                                                {formatBytes(service.memory.used)} / {formatBytes(service.memory.total)} ({service.memory.percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="h-2 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getPercentageColor(service.memory.percentage)} transition-all duration-300`}
                                                style={{ width: `${Math.min(service.memory.percentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Disk */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[var(--text-muted)] text-sm flex items-center gap-2">
                                                <HardDrive className="w-4 h-4" /> Disk
                                            </span>
                                            <span className="text-white text-sm">
                                                {formatBytes(service.disk.used)} / {formatBytes(service.disk.total)} ({service.disk.percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="h-2 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getPercentageColor(service.disk.percentage)} transition-all duration-300`}
                                                style={{ width: `${Math.min(service.disk.percentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Network & Uptime */}
                                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-primary)] text-sm">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[var(--text-muted)] flex items-center gap-1">
                                                <Network className="w-4 h-4" />
                                                ↑ {formatBytes(service.network.bytesOutPerSec)}/s
                                            </span>
                                            <span className="text-[var(--text-muted)] flex items-center gap-1">
                                                ↓ {formatBytes(service.network.bytesInPerSec)}/s
                                            </span>
                                        </div>
                                        <span className="text-[var(--text-muted)] flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {formatUptime(service.uptime)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
