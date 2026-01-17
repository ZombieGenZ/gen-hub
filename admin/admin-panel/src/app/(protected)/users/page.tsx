'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { userManagementApi, UserListItem } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
    Users,
    Search,
    RefreshCw,
    Loader2,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    ShieldCheck,
    ShieldX,
    Wifi,
    UserCheck,
    Ban,
    MoreHorizontal,
    Trash2,
} from 'lucide-react';

const PAGE_SIZE_OPTIONS = [25, 50, 75, 100];
const LOCALSTORAGE_PAGE_SIZE_KEY = 'admin-panel-users-page-size';

interface UserStats {
    total: number;
    online: number;
    active: number;
    warned: number;
    banned: number;
}

const getInitialPageSize = (): number => {
    if (typeof window === 'undefined') return 25;
    const saved = localStorage.getItem(LOCALSTORAGE_PAGE_SIZE_KEY);
    if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && PAGE_SIZE_OPTIONS.includes(num)) return num;
    }
    return 25;
};

export default function UsersPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<UserStats>({ total: 0, online: 0, active: 0, warned: 0, banned: 0 });

    // Filters
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(getInitialPageSize);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkBanModal, setShowBulkBanModal] = useState(false);
    const [bulkBanReason, setBulkBanReason] = useState('');
    const [isBulkBanning, setIsBulkBanning] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter]);

    // Fetch statistics
    const fetchStats = useCallback(async () => {
        try {
            const statsData = await userManagementApi.getStats();
            setStats(statsData);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await userManagementApi.getUsers({
                limit,
                offset: (page - 1) * limit,
                keywords: debouncedSearch || undefined,
                status: statusFilter as 'active' | 'banned' | 'verified' | 'unverified' | undefined || undefined,
            });
            setUsers(response.items);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error(t('common.error') || 'Failed to load users');
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, debouncedSearch, statusFilter, t]);

    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, [fetchUsers, fetchStats]);

    const totalPages = Math.ceil(total / limit);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (user: UserListItem) => {
        if (user.is_banned) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                    <ShieldX className="w-3 h-3" />
                    {t('userManagement.status.banned') || 'Banned'}
                </span>
            );
        }
        if (user.is_verified) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                    <ShieldCheck className="w-3 h-3" />
                    {t('userManagement.status.verified') || 'Verified'}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                <Clock className="w-3 h-3" />
                {t('userManagement.status.unverified') || 'Unverified'}
            </span>
        );
    };

    const handleRefresh = () => {
        fetchUsers();
        fetchStats();
        setSelectedIds(new Set());
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === users.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(users.map(u => u.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkBan = async () => {
        if (selectedIds.size === 0 || !bulkBanReason.trim()) return;
        setIsBulkBanning(true);
        try {
            await userManagementApi.bulkBanUsers({
                user_ids: Array.from(selectedIds),
                reason: bulkBanReason,
                is_permanent: true,
            });
            toast.success(t('userManagement.bulkBanSuccess') || `Banned ${selectedIds.size} users`);
            setShowBulkBanModal(false);
            setBulkBanReason('');
            setSelectedIds(new Set());
            fetchUsers();
            fetchStats();
        } catch (error) {
            console.error('Failed to bulk ban:', error);
            toast.error(t('common.error') || 'Failed to ban users');
        } finally {
            setIsBulkBanning(false);
        }
    };

    const handleBulkUnban = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(t('userManagement.confirmBulkUnban') || 'Unban selected users?')) return;
        try {
            await userManagementApi.bulkUnbanUsers({ user_ids: Array.from(selectedIds) });
            toast.success(t('userManagement.bulkUnbanSuccess') || `Unbanned ${selectedIds.size} users`);
            setSelectedIds(new Set());
            fetchUsers();
            fetchStats();
        } catch (error) {
            console.error('Failed to bulk unban:', error);
            toast.error(t('common.error') || 'Failed to unban users');
        }
    };

    const handleQuickBan = async (userId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const reason = prompt(t('userManagement.enterBanReason') || 'Enter ban reason:');
        if (!reason) return;
        try {
            await userManagementApi.banUser(userId, { reason, is_permanent: true });
            toast.success(t('userManagement.banSuccess') || 'User banned');
            fetchUsers();
            fetchStats();
        } catch (error) {
            console.error('Failed to ban:', error);
            toast.error(t('common.error') || 'Failed to ban user');
        }
    };

    const handleQuickUnban = async (userId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await userManagementApi.unbanUser(userId, {});
            toast.success(t('userManagement.unbanSuccess') || 'User unbanned');
            fetchUsers();
            fetchStats();
        } catch (error) {
            console.error('Failed to unban:', error);
            toast.error(t('common.error') || 'Failed to unban user');
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('userManagement.title') || 'User Management'}</h1>
                    <p className="text-[var(--text-secondary)]">
                        {t('userManagement.subtitle') || 'Manage system users'}
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {t('common.refresh') || 'Refresh'}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {/* Total Users */}
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-blue-500/20">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('userManagement.stats.total') || 'Total Users'}</p>
                            <p className="text-2xl font-bold text-white">{stats.total}</p>
                        </div>
                    </div>
                </div>

                {/* Online Users */}
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-green-500/20">
                            <Wifi className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('userManagement.stats.online') || 'Online'}</p>
                            <p className="text-2xl font-bold text-green-400">{stats.online}</p>
                        </div>
                    </div>
                </div>

                {/* Active Users */}
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-cyan-500/20">
                            <UserCheck className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('userManagement.stats.active') || 'Active'}</p>
                            <p className="text-2xl font-bold text-cyan-400">{stats.active}</p>
                        </div>
                    </div>
                </div>

                {/* Warned Users */}
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-yellow-500/20">
                            <AlertTriangle className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('userManagement.stats.warned') || 'Warned'}</p>
                            <p className="text-2xl font-bold text-yellow-400">{stats.warned}</p>
                        </div>
                    </div>
                </div>

                {/* Banned Users */}
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-red-500/20">
                            <Ban className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('userManagement.stats.banned') || 'Banned'}</p>
                            <p className="text-2xl font-bold text-red-400">{stats.banned}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[var(--background-secondary)] rounded-xl p-4 border border-[var(--border-primary)] mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder={t('userManagement.searchPlaceholder') || 'Search by name or email...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)] appearance-none cursor-pointer"
                    >
                        <option value="">{t('userManagement.allStatus') || 'All Status'}</option>
                        <option value="active">{t('userManagement.status.active') || 'Active'}</option>
                        <option value="banned">{t('userManagement.status.banned') || 'Banned'}</option>
                        <option value="verified">{t('userManagement.status.verified') || 'Verified'}</option>
                        <option value="unverified">{t('userManagement.status.unverified') || 'Unverified'}</option>
                    </select>
                </div>
            </div>

            {/* Bulk Action Toolbar */}
            {selectedIds.size > 0 && (
                <div className="bg-[var(--accent-primary-muted)] border border-[var(--accent-primary)] rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
                    <span className="text-[var(--accent-primary)] font-medium">
                        {selectedIds.size} {t('common.selected') || 'selected'}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowBulkBanModal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
                        >
                            <Ban className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('userManagement.bulkBan') || 'Ban Selected'}</span>
                        </button>
                        <button
                            onClick={handleBulkUnban}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors text-sm"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('userManagement.bulkUnban') || 'Unban Selected'}</span>
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--background-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-muted)] rounded-lg transition-colors text-sm"
                        >
                            <XCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('common.cancel') || 'Cancel'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="bg-[var(--background-secondary)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                        <Users className="w-12 h-12 mb-4" />
                        <p>{t('userManagement.noUsers') || 'No users found'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border-primary)] bg-[var(--background-tertiary)]">
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === users.length && users.length > 0}
                                            onChange={toggleSelectAll}
                                            className="rounded border-[var(--border-primary)]"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('userManagement.table.name') || 'Name'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('userManagement.table.email') || 'Email'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('userManagement.table.status') || 'Status'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('userManagement.table.online') || 'Online'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('userManagement.table.warnings') || 'Warnings'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('userManagement.table.createdAt') || 'Created At'}
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('userManagement.table.actions') || 'Actions'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`border-b border-[var(--border-primary)] hover:bg-[var(--background-tertiary)] cursor-pointer transition-colors ${selectedIds.has(user.id) ? 'bg-[var(--accent-primary-muted)]' : ''}`}
                                        onClick={() => router.push(`/users/${user.id}`)}
                                    >
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(user.id)}
                                                onChange={() => toggleSelect(user.id)}
                                                className="rounded border-[var(--border-primary)]"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-white font-medium">{user.name}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[var(--text-secondary)]">{user.email || '-'}</span>
                                            {user.email_confirmed && (
                                                <CheckCircle2 className="w-3 h-3 text-green-400 inline ml-1" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(user)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.is_online ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                                    {t('userManagement.online') || 'Online'}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--text-muted)] text-xs">
                                                    {user.last_online ? formatDate(user.last_online) : '-'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {(user.warning_count ?? 0) > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {user.warning_count}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--text-muted)] text-xs">0</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[var(--text-muted)] text-sm">
                                                {formatDate(user.created_at)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                {user.is_banned ? (
                                                    <button
                                                        onClick={(e) => handleQuickUnban(user.id, e)}
                                                        className="p-1.5 rounded hover:bg-green-500/20 text-green-400 transition-colors"
                                                        title={t('userManagement.unban') || 'Unban'}
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => handleQuickBan(user.id, e)}
                                                        className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                                                        title={t('userManagement.ban') || 'Ban'}
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => router.push(`/users/${user.id}`)}
                                                    className="p-1.5 rounded hover:bg-[var(--background-tertiary)] text-[var(--text-muted)] transition-colors"
                                                    title={t('common.view') || 'View'}
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-primary)]">
                        <div className="flex items-center gap-2">
                            <span className="text-[var(--text-muted)] text-sm">
                                {t('common.showing') || 'Showing'} {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} {t('common.of') || 'of'} {total}
                            </span>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    const newLimit = parseInt(e.target.value);
                                    setLimit(newLimit);
                                    localStorage.setItem(LOCALSTORAGE_PAGE_SIZE_KEY, String(newLimit));
                                    setPage(1);
                                }}
                                className="px-2 py-1 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded text-sm text-white appearance-none cursor-pointer"
                            >
                                {PAGE_SIZE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg hover:bg-[var(--background-tertiary)] disabled:opacity-50"
                            >
                                <ChevronLeft className="w-4 h-4 text-white" />
                            </button>
                            <span className="text-white text-sm">
                                {page} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || totalPages === 0}
                                className="p-2 rounded-lg hover:bg-[var(--background-tertiary)] disabled:opacity-50"
                            >
                                <ChevronRight className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Ban Modal */}
            {showBulkBanModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-6 w-full max-w-md border border-[var(--border-primary)]">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {t('userManagement.bulkBanTitle') || `Ban ${selectedIds.size} Users`}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-1">
                                    {t('userManagement.reason') || 'Reason'} *
                                </label>
                                <textarea
                                    value={bulkBanReason}
                                    onChange={(e) => setBulkBanReason(e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                                    rows={3}
                                    placeholder={t('userManagement.banReasonPlaceholder') || 'Enter ban reason...'}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => {
                                    setShowBulkBanModal(false);
                                    setBulkBanReason('');
                                }}
                                className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                onClick={handleBulkBan}
                                disabled={isBulkBanning || !bulkBanReason.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isBulkBanning && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('userManagement.confirmBulkBan') || 'Ban Users'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
