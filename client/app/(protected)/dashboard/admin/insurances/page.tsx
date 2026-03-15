"use client";

import { useState, useEffect, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { IsuranceService } from "@/services/Insurance/Insurance.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { Insurance } from "@/types/insurance/Insurance.types";
import { InsuranceForm } from "./insurance-form";
import { useToast } from "@/contexts/ToastContext";
import { Skeleton } from "@/components/ui/skeleton";

const insuranceService = new IsuranceService();

export default function InsurancesPage() {
    const { showToast } = useToast();

    // --- Data States ---
    const [insurances, setInsurances] = useState<Insurance[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // --- Filters ---
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

    // --- Stats ---
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

    // --- Selection & Actions ---
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    // --- Dialogs ---
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    // --- Edit/Delete Targets ---
    const [targetInsurance, setTargetInsurance] = useState<Insurance | null>(null);

    // --- Fetch Stats ---
    const fetchStats = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const data: any = await insuranceService.getAllInsurance(token, { limit: 1000 });
            let items: Insurance[] = [];
            if (data?.data?.items) items = data.data.items;
            else if (data?.items) items = data.items;
            else if (Array.isArray(data?.data)) items = data.data;
            else if (Array.isArray(data)) items = data;
            const active = items.filter(a => a.is_active).length;
            const inactive = items.filter(a => !a.is_active).length;
            setStats({ total: items.length, active, inactive });
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    }, []);

    // --- Fetch Data ---
    const fetchInsurances = useCallback(async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const data: any = await insuranceService.getAllInsurance(token, {
                limit: itemsPerPage,
                offset: (currentPage - 1) * itemsPerPage,
                keywords: searchTerm,
                is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
            });

            let items: Insurance[] = [];
            let total = 0;

            if (data?.data?.items) {
                items = data.data.items;
                total = data.data.total || data.data.items.length;
            } else if (data?.items) {
                items = data.items;
                total = data.total || 0;
            } else if (Array.isArray(data?.data)) {
                items = data.data;
                total = data.data.length;
            } else if (Array.isArray(data)) {
                items = data;
                total = data.length;
            }

            setInsurances(items);
            setTotalItems(total);
        } catch (error: any) {
            console.error("Failed to fetch insurances", error);
            showToast(error.message || "Không thể tải danh sách bảo hiểm", "error");
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, statusFilter, showToast]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchInsurances(); }, [fetchInsurances]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // --- Handlers ---
    const handleRefresh = () => {
        fetchInsurances();
        fetchStats();
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setIsDeleteOpen(false);
        setTargetInsurance(null);
        setSelectedIds([]);
    };

    const handleDelete = async () => {
        setIsDeleteLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token || !targetInsurance) return;

            await insuranceService.deleteInsurance(token, targetInsurance.id);
            showToast(`Đã xóa gói bảo hiểm "${targetInsurance.name}" 🗑️`, "success");
            handleRefresh();
        } catch (error: any) {
            console.error("Failed to delete insurance", error);
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

            await insuranceService.deleteManyInsurances(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} gói bảo hiểm thành công! 🗑️`, "success");
            setIsBulkDeleteDialogOpen(false);
            handleRefresh();
        } catch (error: any) {
            console.error("Bulk delete failed", error);
            showToast(error.message || "Xóa nhiều thất bại", "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(item => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === insurances.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(insurances.map(i => i.id));
        }
    };

    const formatCurrency = (amount: string | number) => {
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numericAmount) || numericAmount === 0) return "0 ₫";
        // Using "vi-VN" locale for consistent formatting
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numericAmount);
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-[32px] leading-[130%] font-bold tracking-tight">
                        Bảo hiểm hàng hóa
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Quản lý các gói bảo hiểm và phí liên quan
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setTargetInsurance(null);
                        setIsCreateOpen(true);
                    }}
                    className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white transition-all duration-200 active:scale-[0.97] hover:shadow-md"
                >
                    <PlusIcon className="w-4 h-4" />
                    Thêm bảo hiểm
                </Button>
            </div>

            {/* Filter Tabs with Stats */}
            <Tabs
                value={statusFilter}
                onValueChange={(value) => {
                    setStatusFilter(value as "all" | "active" | "inactive");
                    setCurrentPage(1);
                }}
                className="w-full"
            >
                <TabsList className="rounded-xl bg-muted/50 p-1.5 h-auto">
                    <TabsTrigger value="all" className="rounded-lg gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <ShieldCheckIcon className="w-4 h-4" />
                        Tất cả
                        <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{stats.total}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="active" className="rounded-lg gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <CheckCircleIcon className="w-4 h-4" />
                        Hoạt động
                        <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{stats.active}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="inactive" className="rounded-lg gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <XCircleIcon className="w-4 h-4" />
                        Đã tắt
                        <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{stats.inactive}</Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Search */}
            <Card className="border-0 shadow-premium rounded-3xl">
                <CardContent className="p-6">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm theo tên hoặc mô tả..."
                            className="rounded-xl pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* List */}
            <Card className="border-0 shadow-premium rounded-3xl overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between">
                    <h3 className="font-bold text-lg text-primary">Danh sách gói bảo hiểm</h3>
                    <Badge variant="secondary" className="rounded-full bg-white shadow-sm hover:bg-white text-muted-foreground">
                        {totalItems} gói
                    </Badge>
                </div>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white border-b">
                                    <tr>
                                        <th className="w-12 py-3 px-4 bg-muted/5"><Skeleton className="h-4 w-4 rounded" /></th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase"><Skeleton className="h-4 w-20" /></th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase"><Skeleton className="h-4 w-20" /></th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase"><Skeleton className="h-4 w-20" /></th>
                                        <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase"><Skeleton className="h-4 w-20" /></th>
                                        <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase"><Skeleton className="h-4 w-20" /></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y relative">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <tr key={`skeleton-${index}`}>
                                            <td className="py-4 px-4"><Skeleton className="h-4 w-4 rounded" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-6 w-32 mb-2" /><Skeleton className="h-4 w-48" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-6 w-24" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-5 w-16" /></td>
                                            <td className="py-4 px-4"><div className="flex justify-center"><Skeleton className="h-6 w-24 rounded-full" /></div></td>
                                            <td className="py-4 px-4"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : insurances.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                    <ShieldCheckIcon className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-medium">Không tìm thấy gói bảo hiểm nào</p>
                                    <p className="text-sm text-muted-foreground/70 mt-1">
                                        {searchTerm ? "Thử thay đổi từ khóa tìm kiếm" : "Bắt đầu bằng cách thêm gói bảo hiểm mới"}
                                    </p>
                                </div>
                                {!searchTerm && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { setTargetInsurance(null); setIsCreateOpen(true); }}
                                        className="rounded-xl gap-2 mt-2 transition-all duration-200 active:scale-[0.97]"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Thêm gói đầu tiên
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white border-b">
                                    <tr>
                                        <th className="w-12 py-3 px-4 bg-muted/5">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length === insurances.length && insurances.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                            />
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-[30%]">Tên gói</th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Giá trị / Phí</th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Phí quản lý</th>
                                        <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Trạng thái</th>
                                        <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {insurances.map((item) => (
                                        <tr key={item.id} className="hover:bg-muted/50 transition-colors group">
                                            <td className="py-4 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => toggleSelection(item.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                                />
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-semibold text-base text-gray-900">{item.name}</div>
                                                <div className="text-sm text-muted-foreground/80 line-clamp-1 mt-0.5 font-normal">{item.description}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-bold text-base text-[#0F766E]">
                                                    {formatCurrency(item.price)}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                {item.use_management_fee ? (
                                                    <Badge variant="outline" className="text-xs bg-white text-gray-700 border-gray-200 font-medium">
                                                        {item.management_fee_type === 'PERCENT'
                                                            ? `${item.management_fee_value}%`
                                                            : formatCurrency(Number(item.management_fee_value))}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {item.is_active ? (
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
                                                <div className="flex justify-end gap-1 opacity-100 transition-all duration-200">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-blue-50 text-blue-600/70 hover:text-blue-600 transition-all duration-200 active:scale-90"
                                                        onClick={() => {
                                                            setTargetInsurance(item);
                                                            setIsEditOpen(true);
                                                        }}
                                                        title="Chỉnh sửa"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-red-50 text-red-600/70 hover:text-red-600 transition-all duration-200 active:scale-90"
                                                        onClick={() => {
                                                            setTargetInsurance(item);
                                                            setIsDeleteOpen(true);
                                                        }}
                                                        title="Xóa"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
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
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages)
                                .map((page, index, array) => (
                                    <>
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className="text-gray-400" key={`dots-${index}`}>...</span>
                                        )}
                                        <Button
                                            key={page}
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(page)}
                                            className={`h-8 min-w-[32px] rounded-lg ${currentPage === page ? 'bg-[#0F766E] hover:bg-[#0F766E]/90' : 'text-gray-600'}`}
                                        >
                                            {page}
                                        </Button>
                                    </>
                                ))
                            }
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Floating Action Bar for Selections */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                    <div
                        className="rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-border shadow-2xl px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in"
                    >
                        <span className="text-muted-foreground text-sm font-medium">
                            {selectedIds.length} đã chọn
                        </span>
                        <div className="h-4 w-px bg-border" />
                        <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2 rounded-xl"
                            onClick={() => setIsBulkDeleteDialogOpen(true)}
                        >
                            <TrashIcon className="w-4 h-4" /> Xóa
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedIds([])}
                            className="rounded-full text-muted-foreground hover:text-foreground h-8 w-8"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Create/Edit Sheet (Drawer/Dialog) */}
            <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsCreateOpen(false);
                    setIsEditOpen(false);
                    setTargetInsurance(null);
                }
            }}>
                <DialogContent className="rounded-2xl w-[95vw] max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4 shrink-0 z-10 border-b bg-background">
                        <DialogTitle>
                            {isEditOpen ? 'Chỉnh sửa' : 'Thêm mới'} gói bảo hiểm
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 pt-4">
                        <InsuranceForm
                            initialData={targetInsurance || undefined}
                            isEdit={isEditOpen}
                            onSuccess={handleRefresh}
                            onCancel={() => {
                                setIsCreateOpen(false);
                                setIsEditOpen(false);
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!isDeleteLoading) setIsDeleteOpen(open); }}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa gói bảo hiểm <strong className="text-foreground">&ldquo;{targetInsurance?.name}&rdquo;</strong> không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleteLoading} className="rounded-xl transition-all duration-200">Hủy</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleteLoading} className="rounded-xl gap-2 min-w-[100px] transition-all duration-200">
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

            {/* Bulk Delete Dialog */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={(open) => { if (!isBulkActionLoading) setIsBulkDeleteDialogOpen(open); }}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xác nhận xóa nhiều</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa <strong className="text-foreground">{selectedIds.length} gói bảo hiểm</strong> đã chọn không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkActionLoading} className="rounded-xl transition-all duration-200">Hủy</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkActionLoading} className="rounded-xl gap-2 min-w-[120px] transition-all duration-200">
                            {isBulkActionLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Đang xóa {selectedIds.length}...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2"><TrashIcon className="w-4 h-4" /> Xóa {selectedIds.length} mục</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
