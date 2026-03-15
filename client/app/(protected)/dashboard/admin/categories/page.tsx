"use client";

import { useState, useEffect, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { CategoryService } from "@/services/article/category.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/contexts/ToastContext";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon,
    FolderIcon,
} from "@heroicons/react/24/outline";
import { CategoryResponse } from "@/types/article/category.type";
import { CategoryForm } from "./category-form";
import { Skeleton } from "@/components/ui/skeleton";

const categoryService = new CategoryService();

export default function CategoriesPage() {
    // --- Data States ---
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // --- Filters ---
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

    // --- Selection & Actions ---
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // --- Dialogs ---
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    // --- Edit/Delete Targets ---
    const [targetCategory, setTargetCategory] = useState<CategoryResponse | null>(null);

    // --- Stats ---
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

    // --- Bulk Actions ---
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    const { showToast } = useToast();

    // --- Fetch Stats ---
    const fetchStats = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const data: any = await categoryService.getAllCategories(token, { limit: 1000 });
            let items: CategoryResponse[] = [];
            if (data?.items) items = data.items;
            else if (data?.data?.items) items = data.data.items;
            else if (Array.isArray(data)) items = data;
            else if (Array.isArray(data?.data)) items = data.data;

            const active = items.filter(c => c.is_active).length;
            setStats({ total: items.length, active, inactive: items.length - active });
        } catch (e) { console.error(e); }
    }, []);

    // --- Fetch Data ---
    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const res: any = await categoryService.getAllCategories(token, {
                limit: itemsPerPage,
                offset: (currentPage - 1) * itemsPerPage,
                keywords: searchTerm,
                is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
            });

            let items: CategoryResponse[] = [];
            let total = 0;

            if (res?.items) {
                items = res.items;
                total = res.total || 0;
            } else if (res?.data?.items) {
                items = res.data.items;
                total = res.data.total || 0;
            } else if (Array.isArray(res)) {
                items = res;
                total = res.length;
            } else if (Array.isArray(res?.data)) {
                items = res.data;
                total = res.data.length;
            }

            setCategories(items);
            setTotalItems(total);

        } catch (error: any) {
            console.error("Failed to fetch categories", error);
            showToast(error.message || "Không thể tải danh sách danh mục", "error");
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, statusFilter, showToast]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => { setCurrentPage(1); }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // --- Handlers ---
    const handleRefresh = () => {
        fetchCategories();
        fetchStats();
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setIsDeleteOpen(false);
        setTargetCategory(null);
        setSelectedIds([]);
    };

    const handleDelete = async () => {
        setIsDeleteLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (targetCategory) {
                if(targetCategory.children && targetCategory.children.length > 0) {
                     showToast(`Không thể xóa danh mục đang có danh mục con.`, "error");
                     return;
                }
                await categoryService.deleteCategory(token, targetCategory.id);
                showToast(`Đã xóa danh mục "${targetCategory.name}" 🗑️`, "success");
            }
            handleRefresh();
        } catch (error: any) {
            console.error("Delete failed", error);
            showToast(error.message || "Xóa thất bại, vui lòng thử lại", "error");
        } finally {
            setIsDeleteLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkActionLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await categoryService.deleteManyCategories(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} danh mục thành công! 🗑️`, "success");
            
            setIsBulkDeleteDialogOpen(false);
            handleRefresh();
        } catch (error: any) {
            console.error("Bulk delete failed", error);
            showToast(error.message || "Xóa nhiều thất bại", "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    // --- Helpers ---
    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(item => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === categories.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(categories.map(c => c.id));
        }
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[32px] leading-[130%]">
                        Danh Mục Bài Viết
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Quản lý các chủ đề và danh mục tin tức, blog
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setTargetCategory(null);
                        setIsCreateOpen(true);
                    }}
                    className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white transition-all duration-200 active:scale-[0.97] hover:shadow-md"
                >
                    <PlusIcon className="w-4 h-4" />
                    Thêm danh mục
                </Button>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-premium mb-6 rounded-3xl">
                <CardContent className="p-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[250px]">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm danh mục bài viết..."
                                className="pl-9 rounded-xl"
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                        </div>

                        {/* Status Filters */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                                onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                                size="sm"
                                className="rounded-full gap-1.5"
                            >
                                Tất cả
                                <Badge variant="secondary" className="px-1.5 py-0 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{stats.total}</Badge>
                            </Button>
                            <Button
                                variant={statusFilter === 'active' ? 'secondary' : 'ghost'}
                                onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
                                size="sm"
                                className="rounded-full gap-1.5"
                            >
                                <CheckCircleIcon className="w-4 h-4 text-green-600" /> Hoạt động
                                <Badge variant="secondary" className="px-1.5 py-0 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{stats.active}</Badge>
                            </Button>
                            <Button
                                variant={statusFilter === 'inactive' ? 'secondary' : 'ghost'}
                                onClick={() => { setStatusFilter('inactive'); setCurrentPage(1); }}
                                size="sm"
                                className="rounded-full gap-1.5"
                            >
                                <XCircleIcon className="w-4 h-4 text-gray-400" /> Không hoạt động
                                <Badge variant="secondary" className="px-1.5 py-0 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{stats.inactive}</Badge>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* List */}
            <Card className="border-0 shadow-premium overflow-hidden rounded-3xl">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/30 border-b">
                                <tr>
                                    <th className="w-12 py-3 px-4">
                                        <input
                                            type="checkbox"
                                            checked={categories.length > 0 && selectedIds.length === categories.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                        />
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-[30%]">Tên danh mục</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Slug</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Mô tả</th>
                                    <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-[100px]">Thứ tự</th>
                                    <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-[120px]">Trạng thái</th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-[100px]">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y relative">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, idx) => (
                                        <tr key={`skeleton-${idx}`}>
                                            <td className="py-4 px-4"><Skeleton className="h-4 w-4 rounded" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-6 w-32" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-4 w-24" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-4 w-48" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-5 w-10 mx-auto" /></td>
                                            <td className="py-4 px-4"><div className="flex justify-center"><Skeleton className="h-6 w-24 rounded-full" /></div></td>
                                            <td className="py-4 px-4"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div></td>
                                        </tr>
                                    ))
                                ) : categories.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                    <FolderIcon className="w-8 h-8 text-muted-foreground/50" />
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground font-medium">Không tìm thấy danh mục nào</p>
                                                    <p className="text-sm text-muted-foreground/70 mt-1">
                                                        {searchTerm ? "Thử thay đổi từ khóa tìm kiếm" : "Bắt đầu bằng cách thêm danh mục mới"}
                                                    </p>
                                                </div>
                                                {!searchTerm && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => { setTargetCategory(null); setIsCreateOpen(true); }}
                                                        className="gap-2 mt-2 rounded-xl transition-all duration-200 active:scale-[0.97]"
                                                    >
                                                        <PlusIcon className="w-4 h-4" />
                                                        Thêm danh mục đầu tiên
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    categories.map(cat => (
                                        <tr key={cat.id} className="hover:bg-muted/50 transition-colors group">
                                            <td className="py-4 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(cat.id)}
                                                    onChange={() => toggleSelection(cat.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                                />
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-semibold text-base text-gray-900">{cat.name}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-sm font-medium text-gray-500 bg-gray-100 rounded-md px-2 py-1">{cat.slug}</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="text-sm text-muted-foreground line-clamp-1">{cat.description || '-'}</div>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className="font-medium text-gray-600">{cat.order}</span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {cat.is_active ? (
                                                    <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 gap-1 pl-1 pr-2 rounded-full shadow-none font-normal">
                                                        <CheckCircleIcon className="w-4 h-4" /> Hoạt động
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="gap-1 pl-1 pr-2 rounded-full shadow-none font-normal text-muted-foreground">
                                                        <XCircleIcon className="w-4 h-4" /> Đã tắt
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all duration-200 active:scale-90"
                                                        onClick={() => {
                                                            setTargetCategory(cat);
                                                            setIsEditOpen(true);
                                                        }}
                                                        title="Chỉnh sửa"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all duration-200 active:scale-90"
                                                        onClick={() => {
                                                            setTargetCategory(cat);
                                                            setIsDeleteOpen(true);
                                                        }}
                                                        title="Xóa"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalItems > itemsPerPage && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Hiển thị {(currentPage - 1) * itemsPerPage + 1} đến {Math.min(currentPage * itemsPerPage, totalItems)} trong tổng số {totalItems} kết quả
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1} className="h-8 w-8 p-0 rounded-lg"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages)
                                .map((page, index, array) => (
                                    <div key={`page-wrapper-${page}`}>
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className="text-gray-400" key={`dots-${page}`}>...</span>
                                        )}
                                        <Button
                                            key={`page-${page}`}
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(page)}
                                            className={`h-8 min-w-[32px] rounded-lg ${currentPage === page ? 'bg-[#0F766E] hover:bg-[#0F766E]/90' : 'text-gray-600'}`}
                                        >
                                            {page}
                                        </Button>
                                    </div>
                                ))
                            }
                        </div>
                        <Button
                            variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages} className="h-8 w-8 p-0 rounded-lg"
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Floating Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-border shadow-2xl px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in rounded-3xl">
                        <span className="text-muted-foreground text-sm font-medium">
                            {selectedIds.length} đã chọn
                        </span>
                        <div className="h-4 w-px bg-border" />
                        <Button variant="destructive" size="sm" className="gap-2 rounded-xl" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                            <TrashIcon className="w-4 h-4" /> Xóa
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedIds([])} className="rounded-full text-muted-foreground hover:text-foreground h-8 w-8">
                            <XMarkIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Create/Edit Drawer */}
            <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
                if (!open) { setIsCreateOpen(false); setIsEditOpen(false); setTargetCategory(null); }
            }}>
                <DialogContent className="w-[95vw] max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
                    <DialogHeader className="p-6 pb-4 shrink-0 z-10 border-b bg-background">
                        <DialogTitle>
                            {isEditOpen ? 'Chỉnh sửa' : 'Thêm mới'} danh mục
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 pt-4">
                        <CategoryForm
                            initialData={targetCategory || undefined}
                            isEdit={isEditOpen}
                            onSuccess={handleRefresh}
                            onCancel={() => { setIsCreateOpen(false); setIsEditOpen(false); }}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!isDeleteLoading) setIsDeleteOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa danh mục <strong className="text-foreground">&ldquo;{targetCategory?.name}&rdquo;</strong> không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleteLoading} className="rounded-xl transition-all duration-200">Hủy</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleteLoading} className="gap-2 min-w-[100px] rounded-xl transition-all duration-200">
                            {isDeleteLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Đang xóa...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2"><TrashIcon className="w-4 h-4" /> Xóa</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Options */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={(open) => { if (!isBulkActionLoading) setIsBulkDeleteDialogOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xác nhận xóa nhiều</DialogTitle>
                        <DialogDescription>
                            Bạn sắp xóa <strong className="text-foreground">{selectedIds.length}</strong> danh mục. Bạn có chắc chắn không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkActionLoading} className="rounded-xl transition-all duration-200">Hủy</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkActionLoading} className="gap-2 min-w-[100px] rounded-xl transition-all duration-200">
                            {isBulkActionLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Đang xóa...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2"><TrashIcon className="w-4 h-4" /> Xóa</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
