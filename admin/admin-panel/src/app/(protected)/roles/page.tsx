'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { rolesApi, Role } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
    Shield,
    Search,
    RefreshCw,
    Loader2,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Plus,
    Trash2,
    Edit,
    Star,
} from 'lucide-react';

const PAGE_SIZE_OPTIONS = [25, 50, 75, 100];
const LOCALSTORAGE_PAGE_SIZE_KEY = 'admin-panel-roles-page-size';

const getInitialPageSize = (): number => {
    if (typeof window === 'undefined') return 25;
    const saved = localStorage.getItem(LOCALSTORAGE_PAGE_SIZE_KEY);
    if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && PAGE_SIZE_OPTIONS.includes(num)) return num;
    }
    return 25;
};

export default function RolesPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [roles, setRoles] = useState<Role[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(getInitialPageSize);
    const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // Delete confirmation modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

    const fetchRoles = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await rolesApi.getRoles({
                limit: String(limit),
                offset: String((page - 1) * limit),
                keywords: debouncedSearch || undefined,
                status: statusFilter as 'ACTIVE' | 'INACTIVE' | 'ALL' || undefined,
            });
            setRoles(response.data);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to fetch roles:', error);
            toast.error(t('common.error') || 'Failed to load roles');
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, debouncedSearch, statusFilter, t]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const totalPages = Math.ceil(total / limit);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    const handleDeleteRole = async (id: string) => {
        setIsDeleting(true);
        try {
            await rolesApi.deleteRole(id);
            setRoles(prev => prev.filter(r => r.id !== id));
            setTotal(prev => prev - 1);
            toast.success(t('roles.deleteSuccess') || 'Role deleted successfully');
        } catch (error) {
            console.error('Failed to delete role:', error);
            toast.error(t('roles.deleteError') || 'Failed to delete role');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setDeleteTarget(null);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        setIsDeleting(true);
        try {
            await rolesApi.deleteRoles(Array.from(selectedIds));
            setRoles(prev => prev.filter(r => !selectedIds.has(r.id)));
            setTotal(prev => prev - selectedIds.size);
            setSelectedIds(new Set());
            toast.success(t('roles.bulkDeleteSuccess') || `Deleted ${selectedIds.size} roles`);
        } catch (error) {
            console.error('Failed to delete roles:', error);
            toast.error(t('roles.deleteError') || 'Failed to delete roles');
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    // Count stats
    const activeCount = roles.filter(r => r.is_active).length;
    const inactiveCount = roles.filter(r => !r.is_active).length;

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('roles.title') || 'Roles Management'}</h1>
                    <p className="text-[var(--text-secondary)]">
                        {t('roles.subtitle') || 'Manage system roles and permissions'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchRoles()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--background-tertiary)] hover:bg-[var(--border-primary)] text-white rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        {t('common.refresh') || 'Refresh'}
                    </button>
                    <button
                        onClick={() => router.push('/roles/new')}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('roles.createRole') || 'Create Role'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-blue-500/20">
                            <Shield className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('roles.stats.total') || 'Total Roles'}</p>
                            <p className="text-2xl font-bold text-white">{total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-green-500/20">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('roles.stats.active') || 'Active'}</p>
                            <p className="text-2xl font-bold text-green-400">{activeCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-red-500/20">
                            <XCircle className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('roles.stats.inactive') || 'Inactive'}</p>
                            <p className="text-2xl font-bold text-red-400">{inactiveCount}</p>
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
                            placeholder={t('roles.searchPlaceholder') || 'Search by name or description...'}
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
                        <option value="ALL">{t('roles.allStatus') || 'All Status'}</option>
                        <option value="ACTIVE">{t('roles.active') || 'Active'}</option>
                        <option value="INACTIVE">{t('roles.inactive') || 'Inactive'}</option>
                    </select>
                </div>

                {/* Bulk Actions */}
                {selectedIds.size > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-primary)] flex items-center gap-4">
                        <span className="text-[var(--text-secondary)]">
                            {selectedIds.size} {t('common.selected') || 'selected'}
                        </span>
                        <button
                            onClick={handleDeleteSelected}
                            disabled={isDeleting}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('roles.deleteSelected') || 'Delete Selected'}
                        </button>
                    </div>
                )}
            </div>

            {/* Roles Table */}
            <div className="bg-[var(--background-secondary)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                    </div>
                ) : roles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                        <Shield className="w-12 h-12 mb-4" />
                        <p>{t('roles.noRoles') || 'No roles found'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border-primary)] bg-[var(--background-tertiary)]">
                                    <th className="px-4 py-3 text-left">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === roles.length && roles.length > 0}
                                                onChange={() => {
                                                    if (selectedIds.size === roles.length) {
                                                        setSelectedIds(new Set());
                                                    } else {
                                                        setSelectedIds(new Set(roles.map(r => r.id)));
                                                    }
                                                }}
                                                className="sr-only peer"
                                            />
                                            <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${selectedIds.size === roles.length && roles.length > 0
                                                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                                                : 'border-[var(--border-primary)] bg-[var(--background-tertiary)]'
                                                }`}>
                                                {selectedIds.size === roles.length && roles.length > 0 && (
                                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                        </label>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('roles.table.name') || 'Name'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('roles.table.description') || 'Description'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('roles.table.status') || 'Status'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('roles.table.default') || 'Default'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('roles.table.createdAt') || 'Created At'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                                        {t('roles.table.actions') || 'Actions'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.map((role) => (
                                    <tr
                                        key={role.id}
                                        className="border-b border-[var(--border-primary)] hover:bg-[var(--background-tertiary)] transition-colors cursor-pointer"
                                        onClick={() => router.push(`/roles/${role.id}`)}
                                    >
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(role.id)}
                                                    onChange={() => toggleSelect(role.id)}
                                                    className="sr-only peer"
                                                />
                                                <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${selectedIds.has(role.id)
                                                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                                                    : 'border-[var(--border-primary)] bg-[var(--background-tertiary)] hover:border-[var(--accent-primary)]/50'
                                                    }`}>
                                                    {selectedIds.has(role.id) && (
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    )}
                                                </div>
                                            </label>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-white font-medium">{role.name}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[var(--text-secondary)] text-sm">{role.description || '-'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {role.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {t('roles.active') || 'Active'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                                                    <XCircle className="w-3 h-3" />
                                                    {t('roles.inactive') || 'Inactive'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {role.is_default && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                                                    <Star className="w-3 h-3" />
                                                    {t('roles.default') || 'Default'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[var(--text-muted)] text-sm">
                                                {formatDate(role.created_at)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/roles/${role.id}`)}
                                                    className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--background-tertiary)] rounded-lg transition-colors"
                                                    title={t('roles.edit') || 'Edit'}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDeleteTarget(role.id);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title={t('roles.delete') || 'Delete'}
                                                >
                                                    <Trash2 className="w-4 h-4" />
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

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-6 w-full max-w-md border border-[var(--border-primary)]">
                        <h2 className="text-xl font-bold text-white mb-4">{t('roles.confirmDelete') || 'Confirm Delete'}</h2>
                        <p className="text-[var(--text-secondary)] mb-6">
                            {t('roles.confirmDeleteMessage') || 'Are you sure you want to delete this role? This action cannot be undone.'}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteTarget(null);
                                }}
                                className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                onClick={() => deleteTarget && handleDeleteRole(deleteTarget)}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('roles.delete') || 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
