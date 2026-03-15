"use client";

import { useState, useEffect, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { ArticleService } from "@/services/article/article.service";
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
    DocumentTextIcon,
    FunnelIcon,
} from "@heroicons/react/24/outline";
import { ArticleResponse, ArticleType, ArticleStatus } from "@/types/article/article.type";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryService } from "@/services/article/category.service";
import { CategoryResponse } from "@/types/article/category.type";

const articleService = new ArticleService();
const categoryService = new CategoryService();

export default function ArticlesPage() {
    // --- Data States ---
    const [articles, setArticles] = useState<ArticleResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // --- Filters ---
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<ArticleType | "ALL">("ALL");
    const [statusFilter, setStatusFilter] = useState<ArticleStatus | "ALL">("ALL");
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

    // --- Selection & Actions ---
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // --- Dialogs ---
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [targetArticle, setTargetArticle] = useState<ArticleResponse | null>(null);

    // --- Bulk Actions ---
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    const { showToast } = useToast();

    // --- Fetch Categories ---
    const fetchCategories = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if(!token) return;
            const res: any = await categoryService.getAllCategories(token, { limit: 500 });
            let items: CategoryResponse[] = [];
            if (res?.items) items = res.items;
            else if (res?.data?.items) items = res.data.items;
            else if (Array.isArray(res)) items = res;
            else if (Array.isArray(res?.data)) items = res.data;
            setCategories(items);
        } catch(e) { console.error(e) }
    }, []);

    // --- Fetch Data ---
    const fetchArticles = useCallback(async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const params: any = {
                limit: itemsPerPage,
                offset: (currentPage - 1) * itemsPerPage,
                keywords: searchTerm,
            };
            if(typeFilter !== "ALL") params.type = typeFilter;
            if(statusFilter !== "ALL") params.status = statusFilter;
            if(categoryFilter !== "ALL") params.category_id = categoryFilter;

            const res: any = await articleService.getAllArticles(token, params);

            let items: ArticleResponse[] = [];
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

            setArticles(items);
            setTotalItems(total);

        } catch (error: any) {
            console.error("Failed to fetch articles", error);
            showToast(error.message || "Không thể tải danh sách bài viết", "error");
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, typeFilter, statusFilter, categoryFilter, showToast]);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);
    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => { setCurrentPage(1); }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, typeFilter, statusFilter, categoryFilter]);

    // --- Handlers ---
    const handleRefresh = () => {
        fetchArticles();
        setIsDeleteOpen(false);
        setTargetArticle(null);
        setSelectedIds([]);
    };

    const handleDelete = async () => {
        setIsDeleteLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (targetArticle) {
                await articleService.deleteArticle(token, targetArticle.id);
                showToast(`Đã xóa bài viết "${targetArticle.title}" 🗑️`, "success");
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

            await articleService.deleteManyArticles(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} bài viết thành công! 🗑️`, "success");
            
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
        if (selectedIds.length === articles.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(articles.map(c => c.id));
        }
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const translateType = (type: ArticleType) => {
        switch(type) {
             case 'BLOG': return 'Blog';
             case 'NEWS': return 'Tin tức';
             case 'GUIDE': return 'Hướng dẫn';
             case 'ANNOUNCEMENT': return 'Thông báo';
             default: return type;
        }
    };

    const renderStatusBadge = (status: ArticleStatus) => {
        switch(status) {
            case 'PUBLISHED':
                return <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 font-normal">Đã xuất bản</Badge>;
            case 'DRAFT':
                return <Badge variant="secondary" className="font-normal text-muted-foreground">Bản nháp</Badge>;
            case 'HIDDEN':
                return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200 font-normal">Đang ẩn</Badge>;
            case 'ARCHIVED':
                return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 font-normal">Lưu trữ</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[32px] leading-[130%]">
                        Quản Lý Bài Viết
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Quản lý nội dung, tin tức, blog và hướng dẫn trên hệ thống
                    </p>
                </div>
                <Link href="/dashboard/admin/articles/create">
                    <Button
                        className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white transition-all duration-200 active:scale-[0.97] hover:shadow-md"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Viết bài mới
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-premium mb-6 rounded-3xl">
                <CardContent className="p-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[250px]">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm tiêu đề bài viết..."
                                className="pl-9 rounded-xl"
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                        </div>

                        {/* Status Filters */}
                        <div className="flex flex-wrap items-center gap-3">
                             <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                                <SelectTrigger className="w-[140px] rounded-xl h-10 border-gray-200">
                                    <SelectValue placeholder="Loại bài viết" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả loại bài</SelectItem>
                                    <SelectItem value="BLOG">Blog</SelectItem>
                                    <SelectItem value="NEWS">Tin tức</SelectItem>
                                    <SelectItem value="GUIDE">Hướng dẫn</SelectItem>
                                    <SelectItem value="ANNOUNCEMENT">Thông báo</SelectItem>
                                </SelectContent>
                            </Select>

                             <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                                <SelectTrigger className="w-[150px] rounded-xl h-10 border-gray-200">
                                    <SelectValue placeholder="Trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                                    <SelectItem value="PUBLISHED">Đã xuất bản</SelectItem>
                                    <SelectItem value="DRAFT">Bản nháp</SelectItem>
                                    <SelectItem value="ARCHIVED">Lưu trữ</SelectItem>
                                    <SelectItem value="HIDDEN">Đang ẩn</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val)}>
                                <SelectTrigger className="w-[180px] rounded-xl h-10 border-gray-200 bg-muted/20">
                                    <SelectValue placeholder="Danh mục" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                                    {categories.map(c => (
                                         <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                            checked={articles.length > 0 && selectedIds.length === articles.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                        />
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-[40%]">Bài viết</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Loại</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Lượt xem</th>
                                    <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-[120px]">Trạng thái</th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-[100px]">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y relative">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, idx) => (
                                        <tr key={`skeleton-${idx}`}>
                                            <td className="py-4 px-4"><Skeleton className="h-4 w-4 rounded" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-6 w-64 mb-2" /><Skeleton className="h-4 w-32" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-5 w-20 rounded-md" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-4 w-12" /></td>
                                            <td className="py-4 px-4"><div className="flex justify-center"><Skeleton className="h-6 w-24 rounded-full" /></div></td>
                                            <td className="py-4 px-4"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div></td>
                                        </tr>
                                    ))
                                ) : articles.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                    <DocumentTextIcon className="w-8 h-8 text-muted-foreground/50" />
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground font-medium">Không tìm thấy bài viết nào</p>
                                                    <p className="text-sm text-muted-foreground/70 mt-1">
                                                        {searchTerm || typeFilter !== 'ALL' || statusFilter !== 'ALL' || categoryFilter !== 'ALL' ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm" : "Bắt đầu bằng cách viết bài mới"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    articles.map(article => (
                                        <tr key={article.id} className="hover:bg-muted/50 transition-colors group">
                                            <td className="py-4 px-4 align-top pt-5">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(article.id)}
                                                    onChange={() => toggleSelection(article.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                                />
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex gap-4">
                                                    {article.thumbnail ? (
                                                        <div className="h-16 w-16 md:h-16 md:w-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
                                                            <img src={article.thumbnail} alt={article.title} className="h-full w-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-16 w-16 md:h-16 md:w-24 shrink-0 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                                                            <DocumentTextIcon className="h-6 w-6 text-muted-foreground/40" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <Link href={`/dashboard/admin/articles/${article.id}/edit`} className="font-semibold text-base text-gray-900 hover:text-[#0F766E] transition-colors line-clamp-2 leading-tight">
                                                            {article.title}
                                                        </Link>
                                                        <div className="text-sm text-muted-foreground line-clamp-1 mt-1 font-normal">
                                                            {article.excerpt || article.slug}
                                                        </div>
                                                        {article.categories && article.categories.length > 0 && (
                                                             <div className="flex gap-1 mt-2 flex-wrap">
                                                                {article.categories.map(c => (
                                                                     <span key={c.id} className="text-[10px] uppercase font-medium tracking-wide text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{c.name}</span>
                                                                ))}
                                                             </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <Badge variant="outline" className="font-normal bg-white text-gray-600 border-gray-200">
                                                    {translateType(article.type)}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                                                     {new Intl.NumberFormat('en-US').format(article.view_count || 0)} lượt
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {renderStatusBadge(article.status)}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
                                                    <Link href={`/dashboard/admin/articles/${article.id}/edit`}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all duration-200 active:scale-90"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all duration-200 active:scale-90"
                                                        onClick={() => {
                                                            setTargetArticle(article);
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

            {/* Delete Confirmation */}
            <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!isDeleteLoading) setIsDeleteOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa bài viết <strong className="text-foreground">&ldquo;{targetArticle?.title}&rdquo;</strong> không?
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
                            Bạn sắp xóa <strong className="text-foreground">{selectedIds.length}</strong> bài viết. Bạn có chắc chắn không?
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
