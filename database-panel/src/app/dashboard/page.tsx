'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Database, Users, Shield, FileText, Package, Activity, TrendingUp } from 'lucide-react';

interface TableInfo {
    name: string;
    displayName: string;
}

export default function DashboardPage() {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await adminApi.getTables();
                setTables(data);
            } catch (error) {
                console.error('Failed to fetch tables:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const stats = [
        { label: 'Tổng số Tables', value: tables.length, icon: Database, color: 'var(--accent-primary)' },
        { label: 'Authentication', value: 8, icon: Shield, color: '#f59e0b' },
        { label: 'Organizations', value: 5, icon: Users, color: '#3b82f6' },
        { label: 'Logs', value: 4, icon: FileText, color: '#8b5cf6' },
    ];

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-[var(--text-secondary)]">
                    Chào mừng bạn đến với GEN-HUB Database Admin Panel
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

            {/* Quick Access */}
            <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[var(--accent-primary)]" />
                    Quick Access - Tables
                </h2>

                {isLoading ? (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                        Đang tải dữ liệu...
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {tables.map((table) => (
                            <a
                                key={table.name}
                                href={`/dashboard/${table.name}`}
                                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[var(--background-tertiary)] hover:bg-[var(--accent-primary-muted)] hover:text-[var(--accent-primary)] text-[var(--text-secondary)] text-sm transition-all group"
                            >
                                <Package className="w-4 h-4 group-hover:text-[var(--accent-primary)]" />
                                <span className="truncate">{table.displayName}</span>
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="mt-8 p-4 rounded-lg border border-[var(--accent-primary)] bg-[var(--accent-primary-muted)]">
                <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-[var(--accent-primary)] mt-0.5" />
                    <div>
                        <h3 className="font-medium text-white mb-1">Lưu ý về Audit Logging</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Mọi thao tác Create, Update, Delete trên panel này đều được ghi log vào{' '}
                            <span className="text-[var(--accent-primary)]">SystemLog</span> và{' '}
                            <span className="text-[var(--accent-primary)]">DatabaseLog</span> để đảm bảo audit trail.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
