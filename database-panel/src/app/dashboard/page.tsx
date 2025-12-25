'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Database, Table, List, LayoutGrid, HardDrive, Activity, Loader2, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

interface TableInfo {
    name: string;
    displayName: string;
}

interface TableStats {
    name: string;
    recordCount: number;
    columnCount: number;
}

export default function DashboardPage() {
    const { t } = useLanguage();
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [tableStats, setTableStats] = useState<TableStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [statsLoaded, setStatsLoaded] = useState(false);

    useEffect(() => {
        const fetchTables = async () => {
            try {
                const data = await adminApi.getTables();
                setTables(data);
            } catch (error) {
                console.error('Failed to fetch tables:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTables();
    }, []);

    // Load stats on demand
    const loadStats = async () => {
        if (isLoadingStats || statsLoaded) return;

        setIsLoadingStats(true);
        try {
            const statsPromises = tables.map(async (table: TableInfo) => {
                try {
                    const [records, schema] = await Promise.all([
                        adminApi.getRecords(table.name, { page: 1, limit: 1 }),
                        adminApi.getTableSchema(table.name).catch(() => null)
                    ]);
                    return {
                        name: table.name,
                        recordCount: records.meta?.total || 0,
                        columnCount: schema?.fields?.length || 0
                    };
                } catch {
                    return { name: table.name, recordCount: 0, columnCount: 0 };
                }
            });
            const stats = await Promise.all(statsPromises);
            setTableStats(stats);
            setStatsLoaded(true);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    // Calculate aggregate stats
    const totalTables = tables.length;
    const totalRecords = tableStats.reduce((sum, t) => sum + t.recordCount, 0);
    const totalColumns = tableStats.reduce((sum, t) => sum + t.columnCount, 0);
    const avgRecordsPerTable = totalTables > 0 ? Math.round(totalRecords / totalTables) : 0;

    const stats = [
        { label: t('dashboard.stats.totalTables'), value: totalTables, icon: Table, color: 'var(--accent-primary)' },
        { label: t('dashboard.stats.totalRecords'), value: statsLoaded ? totalRecords.toLocaleString() : '-', icon: List, color: '#3b82f6' },
        { label: t('dashboard.stats.totalColumns'), value: statsLoaded ? totalColumns : '-', icon: LayoutGrid, color: '#8b5cf6' },
        { label: t('dashboard.stats.avgRecords'), value: statsLoaded ? avgRecordsPerTable : '-', icon: HardDrive, color: '#f59e0b' },
    ];

    const getTableStats = (tableName: string) => {
        return tableStats.find(t => t.name === tableName);
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
                <p className="text-[var(--text-secondary)]">
                    {t('dashboard.welcome')}
                </p>
            </div>

            {/* Stats Grid - With overlay when not loaded */}
            <div className="relative mb-8">
                {!statsLoaded && (
                    <div className="absolute inset-0 bg-[var(--background-primary)]/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                        <button
                            onClick={loadStats}
                            disabled={isLoadingStats}
                            className="btn btn-primary px-6 py-3 text-base"
                        >
                            {isLoadingStats ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>{t('dashboard.quickAccess.loading')}</span>
                                </>
                            ) : (
                                <>
                                    <BarChart3 className="w-5 h-5" />
                                    <span>{t('dashboard.stats.loadStats')}</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${!statsLoaded ? 'opacity-30' : ''}`}>
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.label} className="card group hover:border-[var(--accent-primary)] transition-all cursor-pointer">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-[var(--text-secondary)] mb-1">{stat.label}</p>
                                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                                    </div>
                                    <div
                                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: `${stat.color}20` }}
                                    >
                                        <Icon className="w-6 h-6" style={{ color: stat.color }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quick Access */}
            <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[var(--accent-primary)]" />
                    {t('dashboard.quickAccess.title')} ({tables.length} {t('dashboard.quickAccess.tables')})
                </h2>

                {isLoading ? (
                    <div className="text-center py-8 text-[var(--text-muted)] flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('dashboard.quickAccess.loading')}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {tables.map((table) => {
                            const tableStatsData = getTableStats(table.name);
                            return (
                                <Link
                                    key={table.name}
                                    href={`/dashboard/${table.name}`}
                                    className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--background-tertiary)] hover:bg-[var(--accent-primary-muted)] hover:border-[var(--accent-primary)] border border-transparent text-[var(--text-secondary)] text-sm transition-all group"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Database className="w-4 h-4 flex-shrink-0 group-hover:text-[var(--accent-primary)]" />
                                        <span className="truncate">{table.displayName}</span>
                                    </div>
                                    {statsLoaded && (
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] flex-shrink-0 ml-2">
                                            <span title={t('dashboard.quickAccess.records')} className="flex items-center gap-1">
                                                <List className="w-3 h-3" />
                                                {tableStatsData?.recordCount || 0}
                                            </span>
                                            <span className="text-[var(--border-primary)]">|</span>
                                            <span title={t('dashboard.quickAccess.columns')} className="flex items-center gap-1">
                                                <LayoutGrid className="w-3 h-3" />
                                                {tableStatsData?.columnCount || 0}
                                            </span>
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
