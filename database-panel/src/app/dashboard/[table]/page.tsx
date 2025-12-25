'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Search,
    RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

interface RecordData {
    id: string;
    [key: string]: any;
}

interface Meta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function TablePage() {
    const params = useParams();
    const router = useRouter();
    const tableName = params.table as string;

    const [records, setRecords] = useState<RecordData[]>([]);
    const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const fetchRecords = async (page = 1) => {
        setIsLoading(true);
        try {
            const data = await adminApi.getRecords(tableName, { page, limit: 20 });
            setRecords(data.data);
            setMeta(data.meta);
        } catch (error: any) {
            toast.error('Lỗi khi tải dữ liệu: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [tableName]);

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa record này?')) return;

        setIsDeleting(id);
        try {
            await adminApi.deleteRecord(tableName, id);
            toast.success('Đã xóa record thành công');
            fetchRecords(meta.page);
        } catch (error: any) {
            toast.error('Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsDeleting(null);
        }
    };

    const formatTableName = (name: string) => {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
    };

    const formatValue = (value: any, key: string): string => {
        if (value === null || value === undefined) return '—';
        if (value === '********') return '••••••••';
        if (typeof value === 'boolean') return value ? '✓' : '✗';
        if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/))) {
            try {
                return format(new Date(value), 'dd/MM/yyyy HH:mm');
            } catch {
                return String(value);
            }
        }
        if (typeof value === 'object') return JSON.stringify(value).slice(0, 50) + '...';
        return String(value).slice(0, 100);
    };

    const columns = records.length > 0
        ? Object.keys(records[0]).filter(k => !['created_at', 'updated_at', 'deleted_at'].includes(k)).slice(0, 6)
        : [];

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">{formatTableName(tableName)}</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                        {meta.total} records · Page {meta.page} / {meta.totalPages}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchRecords(meta.page)}
                        className="btn btn-secondary"
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/${tableName}/new`)}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Thêm mới</span>
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="input pl-10"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col}>{col}</th>
                            ))}
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--accent-primary)]" />
                                </td>
                            </tr>
                        ) : records.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="text-center py-8 text-[var(--text-muted)]">
                                    Không có dữ liệu
                                </td>
                            </tr>
                        ) : (
                            records.map((record) => (
                                <tr key={record.id}>
                                    {columns.map((col) => (
                                        <td key={col}>
                                            <span className={col === 'id' ? 'font-mono text-xs' : ''}>
                                                {formatValue(record[col], col)}
                                            </span>
                                        </td>
                                    ))}
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => router.push(`/dashboard/${tableName}/${record.id}`)}
                                                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--background-tertiary)] transition-all"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(record.id)}
                                                disabled={isDeleting === record.id}
                                                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--status-error)] hover:bg-[rgba(255,82,82,0.1)] transition-all"
                                            >
                                                {isDeleting === record.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-[var(--text-secondary)]">
                        Hiển thị {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} / {meta.total}
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchRecords(meta.page - 1)}
                            disabled={meta.page <= 1 || isLoading}
                            className="btn btn-secondary disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="px-4 text-sm text-white">
                            {meta.page} / {meta.totalPages}
                        </span>

                        <button
                            onClick={() => fetchRecords(meta.page + 1)}
                            disabled={meta.page >= meta.totalPages || isLoading}
                            className="btn btn-secondary disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
