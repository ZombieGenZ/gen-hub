'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Database,
    Users,
    Shield,
    Key,
    Building2,
    Warehouse,
    Package,
    CreditCard,
    Bell,
    FileText,
    Settings,
    ChevronDown,
    ChevronRight,
    LogOut,
    Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/api';

interface TableInfo {
    name: string;
    displayName: string;
}

// Icon mapping cho các table groups
const TABLE_ICONS: Record<string, React.ElementType> = {
    // Authentication
    user: Shield,
    role: Shield,
    permission: Shield,
    userRole: Shield,
    userPermission: Shield,
    rolePermission: Shield,
    refreshToken: Key,
    backupCode: Key,

    // Organizations
    organization: Building2,
    organizationMember: Building2,
    organizationRole: Building2,
    organizationPermission: Building2,
    apiKey: Key,
    apiKeyLog: FileText,

    // Warehouses
    warehouseTemplate: Warehouse,
    rowTemplate: Warehouse,
    rackTemplate: Warehouse,
    shelfTemplate: Warehouse,
    blockTemplate: Warehouse,
    amenity: Package,
    warehouse: Warehouse,
    row: Warehouse,
    rack: Warehouse,
    shelf: Warehouse,
    block: Warehouse,

    // Rental
    rentalDurationTier: CreditCard,
    addon: Package,
    coupon: CreditCard,
    couponSchedule: CreditCard,
    rentalContract: CreditCard,
    payment: CreditCard,

    // Notifications
    globalNotification: Bell,
    userNotification: Bell,
    organizationNotification: Bell,

    // Logs
    systemLog: FileText,
    databaseLog: FileText,
    organizationAuditLog: FileText,

    // Location
    province: Package,
    ward: Package,
};

// Nhóm tables theo category
const categorizeTable = (tableName: string): string => {
    const authTables = ['user', 'role', 'permission', 'userRole', 'userPermission', 'rolePermission', 'refreshToken', 'backupCode'];
    const orgTables = ['organization', 'organizationMember', 'organizationRole', 'organizationPermission', 'organizationRolePermission', 'organizationMemberRole', 'organizationMemberPermission', 'apiKey', 'apiKeyRole', 'apiKeyPermission'];
    const warehouseTables = ['warehouseTemplate', 'rowTemplate', 'rackTemplate', 'shelfTemplate', 'blockTemplate', 'amenity', 'warehouse', 'row', 'rack', 'shelf', 'block', 'inventory', 'inventoryTransaction'];
    const rentalTables = ['rentalDurationTier', 'addon', 'coupon', 'couponSchedule', 'couponTargetUser', 'couponScheduleTargetUser', 'rentalContract', 'rentalContractLog', 'rentalContractCoupon', 'payment'];
    const notificationTables = ['globalNotification', 'userNotification', 'organizationNotification'];
    const logTables = ['systemLog', 'databaseLog', 'organizationAuditLog', 'apiKeyLog'];
    const locationTables = ['province', 'ward'];
    const partnerTables = ['partner', 'product', 'batch', 'unit'];

    if (authTables.includes(tableName)) return 'Authentication';
    if (orgTables.includes(tableName)) return 'Organizations';
    if (warehouseTables.includes(tableName)) return 'Warehouses';
    if (rentalTables.includes(tableName)) return 'Rental';
    if (notificationTables.includes(tableName)) return 'Notifications';
    if (logTables.includes(tableName)) return 'Logs';
    if (locationTables.includes(tableName)) return 'Location';
    if (partnerTables.includes(tableName)) return 'Partners';
    return 'Other';
};

const GROUP_ICONS: Record<string, React.ElementType> = {
    Authentication: Shield,
    Organizations: Building2,
    Warehouses: Warehouse,
    Rental: CreditCard,
    Notifications: Bell,
    Logs: FileText,
    Location: Package,
    Partners: Users,
    Other: Database,
};

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['Authentication']);
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [groupedTables, setGroupedTables] = useState<Record<string, TableInfo[]>>({});

    useEffect(() => {
        const fetchTables = async () => {
            try {
                const data = await adminApi.getTables();
                setTables(data);

                // Group tables by category
                const grouped: Record<string, TableInfo[]> = {};
                data.forEach((table: TableInfo) => {
                    const category = categorizeTable(table.name);
                    if (!grouped[category]) {
                        grouped[category] = [];
                    }
                    grouped[category].push(table);
                });
                setGroupedTables(grouped);
            } catch (error) {
                console.error('Failed to fetch tables:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTables();
    }, []);

    const toggleGroup = (groupName: string) => {
        setExpandedGroups((prev) =>
            prev.includes(groupName)
                ? prev.filter((g) => g !== groupName)
                : [...prev, groupName]
        );
    };

    const isTableActive = (tableName: string) => {
        return pathname === `/dashboard/${tableName}`;
    };

    const getTableIcon = (tableName: string) => {
        return TABLE_ICONS[tableName] || Package;
    };

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--background-secondary)] border-r border-[var(--border-primary)] flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-3">
                    <Database className="w-8 h-8 text-[var(--accent-primary)]" />
                    <div>
                        <h1 className="text-lg font-bold text-white glow-text">GEN-HUB</h1>
                        <p className="text-xs text-[var(--text-muted)]">Database Admin</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
                <Link
                    href="/dashboard"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${pathname === '/dashboard'
                            ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white'
                        }`}
                >
                    <Database className="w-5 h-5" />
                    <span className="font-medium">Dashboard</span>
                </Link>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-primary)]" />
                    </div>
                ) : (
                    <div className="mt-4">
                        {Object.entries(groupedTables).map(([groupName, groupTables]) => {
                            const Icon = GROUP_ICONS[groupName] || Database;
                            const isExpanded = expandedGroups.includes(groupName);
                            const hasActiveTable = groupTables.some((t) => isTableActive(t.name));

                            return (
                                <div key={groupName} className="mb-2">
                                    <button
                                        onClick={() => toggleGroup(groupName)}
                                        className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-all ${hasActiveTable
                                                ? 'text-[var(--accent-primary)]'
                                                : 'text-[var(--text-secondary)] hover:text-white'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="w-5 h-5" />
                                            <span className="font-medium text-sm">{groupName}</span>
                                            <span className="text-xs text-[var(--text-muted)]">({groupTables.length})</span>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4" />
                                        )}
                                    </button>

                                    {isExpanded && (
                                        <div className="mt-1 ml-8 space-y-1 animate-fadeIn">
                                            {groupTables.map((table) => (
                                                <Link
                                                    key={table.name}
                                                    href={`/dashboard/${table.name}`}
                                                    className={`block px-4 py-2 rounded-lg text-sm transition-all ${isTableActive(table.name)
                                                            ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                                                            : 'text-[var(--text-muted)] hover:bg-[var(--background-tertiary)] hover:text-white'
                                                        }`}
                                                >
                                                    {table.displayName}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </nav>

            {/* User Info */}
            <div className="p-4 border-t border-[var(--border-primary)]">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent-primary-muted)] flex items-center justify-center">
                        <Users className="w-5 h-5 text-[var(--accent-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-[var(--status-error)] hover:bg-[rgba(255,82,82,0.1)] transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                </button>
            </div>
        </aside>
    );
}
