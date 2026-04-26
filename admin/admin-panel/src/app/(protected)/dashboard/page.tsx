'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { Database, Table, List, LayoutGrid, HardDrive, Activity, Loader2, BarChart3, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTables } from '@/contexts/TablesContext';
import { useAuth } from '@/contexts/AuthContext';

interface TableStats {
    name: string;
    displayName: string;
    recordCount: number;
    columnCount: number;
}

interface Statistics {
    summary: {
        totalTables: number;
        totalRecords: number;
        totalColumns: number;
        avgRecordsPerTable: number;
    };
    tables: TableStats[];
}

type QuickAccessSort =
    | 'name-asc'
    | 'name-desc'
    | 'columns-desc'
    | 'columns-asc'
    | 'rows-desc'
    | 'rows-asc'
    | 'avg-records-desc'
    | 'avg-records-asc';

export default function DashboardPage() {
    const { t, language } = useLanguage();
    const { tables, isLoading, refreshTables } = useTables();
    const { hasPermission, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [statsLoaded, setStatsLoaded] = useState(false);
    const [quickAccessSort, setQuickAccessSort] = useState<QuickAccessSort>('name-asc');

    // Redirect based on permission priority: database.admin > backup > featureflag.admin > resources.admin
    useEffect(() => {
        if (isAuthLoading) return;

        if (!hasPermission('database.admin')) {
            if (hasPermission('backup.admin') || hasPermission('backup.list') || hasPermission('backup.trigger')) {
                router.replace('/backups');
            } else if (hasPermission('featureflag.admin')) {
                router.replace('/feature-flags');
            } else if (hasPermission('resources.admin')) {
                router.replace('/resources');
            }
        }
    }, [hasPermission, isAuthLoading, router]);

    // Helper function to format table name (handles both snake_case and camelCase)
    const toTitleCase = (str: string): string => {
        return str
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    // Load statistics on demand
    const loadStatistics = async () => {
        if (isLoadingStats) return;

        setIsLoadingStats(true);
        try {
            // Server returns: [{ tableName, rowCount, sizeBytes, lastUpdated }]
            const rawData = await adminApi.getStatistics();

            // Transform to expected format
            const totalRecords = rawData.reduce((sum: number, t: { rowCount: number }) => sum + t.rowCount, 0);
            const tableStats: TableStats[] = rawData.map((t: { tableName: string; rowCount: number; columnCount?: number }) => ({
                name: t.tableName,
                displayName: toTitleCase(t.tableName),
                recordCount: t.rowCount,
                columnCount: t.columnCount || 0,
            }));

            const transformedData: Statistics = {
                summary: {
                    totalTables: rawData.length,
                    totalRecords: totalRecords,
                    totalColumns: tableStats.reduce((sum, t) => sum + t.columnCount, 0),
                    avgRecordsPerTable: rawData.length > 0 ? Math.round(totalRecords / rawData.length) : 0,
                },
                tables: tableStats,
            };

            setStatistics(transformedData);
            setStatsLoaded(true);
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    // Refresh statistics (force reload)
    const refreshStatistics = async () => {
        setStatsLoaded(false);
        await loadStatistics();
    };

    // Calculate stats from statistics or show placeholder
    const totalTables = tables.length;
    const totalRecords = statistics?.summary?.totalRecords ?? 0;
    const totalColumns = statistics?.summary?.totalColumns ?? 0;
    const avgRecordsPerTable = statistics?.summary?.avgRecordsPerTable ?? 0;

    const stats = [
        {
            label: t('dashboard.stats.totalTables'),
            value: totalTables,
            icon: Table,
            color: 'var(--accent-primary)'
        },
        {
            label: t('dashboard.stats.totalRecords'),
            value: statsLoaded ? totalRecords.toLocaleString() : '-',
            icon: List,
            color: '#3b82f6'
        },
        {
            label: t('dashboard.stats.totalColumns'),
            value: statsLoaded ? totalColumns : '-',
            icon: LayoutGrid,
            color: '#8b5cf6'
        },
        {
            label: t('dashboard.stats.avgRecords'),
            value: statsLoaded ? avgRecordsPerTable : '-',
            icon: HardDrive,
            color: '#f59e0b'
        },
    ];

    const getTableStats = useCallback((tableName: string) => {
        return statistics?.tables?.find(t => t.name === tableName);
    }, [statistics]);

    const sortLabel = language === 'vi' ? 'Sắp xếp theo' : 'Sort by';
    const sortOptions = {
        nameAsc: 'A-Z',
        nameDesc: 'Z-A',
        columnsDesc: language === 'vi' ? 'Số cột nhiều nhất đến ít nhất' : 'Most columns to fewest',
        columnsAsc: language === 'vi' ? 'Số cột ít nhất đến nhiều nhất' : 'Fewest columns to most',
        rowsDesc: language === 'vi' ? 'Số dòng nhiều nhất đến ít nhất' : 'Most rows to fewest',
        rowsAsc: language === 'vi' ? 'Số dòng ít nhất đến nhiều nhất' : 'Fewest rows to most',
        avgRecordsDesc: language === 'vi' ? 'TB Records/Table cao nhất đến thấp nhất' : 'Highest avg records/table to lowest',
        avgRecordsAsc: language === 'vi' ? 'TB Records/Table thấp nhất đến cao nhất' : 'Lowest avg records/table to highest',
    };

    const sortedTables = useMemo(() => {
        const collator = new Intl.Collator(language, { sensitivity: 'base', numeric: true });

        return [...tables].sort((a, b) => {
            const aStats = getTableStats(a.name);
            const bStats = getTableStats(b.name);
            const nameCompare = collator.compare(a.displayName, b.displayName);

            switch (quickAccessSort) {
                case 'name-desc':
                    return collator.compare(b.displayName, a.displayName);
                case 'columns-desc': {
                    const diff = (bStats?.columnCount ?? 0) - (aStats?.columnCount ?? 0);
                    return diff !== 0 ? diff : nameCompare;
                }
                case 'columns-asc': {
                    const diff = (aStats?.columnCount ?? 0) - (bStats?.columnCount ?? 0);
                    return diff !== 0 ? diff : nameCompare;
                }
                case 'rows-desc': {
                    const diff = (bStats?.recordCount ?? 0) - (aStats?.recordCount ?? 0);
                    return diff !== 0 ? diff : nameCompare;
                }
                case 'rows-asc': {
                    const diff = (aStats?.recordCount ?? 0) - (bStats?.recordCount ?? 0);
                    return diff !== 0 ? diff : nameCompare;
                }
                case 'avg-records-desc': {
                    const aAverage = (aStats?.columnCount ?? 0) > 0 ? (aStats?.recordCount ?? 0) / (aStats?.columnCount ?? 0) : 0;
                    const bAverage = (bStats?.columnCount ?? 0) > 0 ? (bStats?.recordCount ?? 0) / (bStats?.columnCount ?? 0) : 0;
                    const diff = bAverage - aAverage;
                    return diff !== 0 ? diff : nameCompare;
                }
                case 'avg-records-asc': {
                    const aAverage = (aStats?.columnCount ?? 0) > 0 ? (aStats?.recordCount ?? 0) / (aStats?.columnCount ?? 0) : 0;
                    const bAverage = (bStats?.columnCount ?? 0) > 0 ? (bStats?.recordCount ?? 0) / (bStats?.columnCount ?? 0) : 0;
                    const diff = aAverage - bAverage;
                    return diff !== 0 ? diff : nameCompare;
                }
                case 'name-asc':
                default:
                    return nameCompare;
            }
        });
    }, [tables, quickAccessSort, language, getTableStats]);

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
                    <p className="text-[var(--text-secondary)]">
                        {t('dashboard.welcome')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {statsLoaded && (
                        <button
                            onClick={refreshStatistics}
                            disabled={isLoadingStats}
                            className="btn btn-secondary"
                            title={t('dashboard.stats.refresh')}
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{t('dashboard.stats.refresh')}</span>
                        </button>
                    )}
                    <button
                        onClick={refreshTables}
                        disabled={isLoading}
                        className="btn btn-secondary"
                        title={t('dashboard.tables.refresh')}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{t('dashboard.tables.refresh')}</span>
                    </button>
                </div>
            </div>

            {/* Stats Grid - With overlay when not loaded */}
            <div className="relative mb-8">
                {!statsLoaded && (
                    <div className="absolute inset-0 bg-[var(--background-primary)]/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                        <button
                            onClick={loadStatistics}
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
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[var(--accent-primary)]" />
                        {t('dashboard.quickAccess.title')} ({tables.length} {t('dashboard.quickAccess.tables')})
                    </h2>

                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <span className="text-sm text-[var(--text-secondary)]">{sortLabel}</span>
                        <select
                            value={quickAccessSort}
                            onChange={(event) => setQuickAccessSort(event.target.value as QuickAccessSort)}
                            className="h-10 min-w-[260px] rounded-lg border border-[var(--border-primary)] bg-[var(--background-tertiary)] px-3 text-sm text-white outline-none transition-colors hover:border-[var(--accent-primary)] focus:border-[var(--accent-primary)] disabled:cursor-not-allowed"
                            aria-label={sortLabel}
                        >
                            <option value="name-asc">{sortOptions.nameAsc}</option>
                            <option value="name-desc">{sortOptions.nameDesc}</option>
                            <option value="columns-desc" disabled={!statsLoaded}>{sortOptions.columnsDesc}</option>
                            <option value="columns-asc" disabled={!statsLoaded}>{sortOptions.columnsAsc}</option>
                            <option value="rows-desc" disabled={!statsLoaded}>{sortOptions.rowsDesc}</option>
                            <option value="rows-asc" disabled={!statsLoaded}>{sortOptions.rowsAsc}</option>
                            <option value="avg-records-desc" disabled={!statsLoaded}>{sortOptions.avgRecordsDesc}</option>
                            <option value="avg-records-asc" disabled={!statsLoaded}>{sortOptions.avgRecordsAsc}</option>
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-8 text-[var(--text-muted)] flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('dashboard.quickAccess.loading')}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {sortedTables.map((table) => {
                            const tableStatsData = getTableStats(table.name);
                            return (
                                <Link
                                    key={table.name}
                                    href={`/database/${table.name}`}
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
