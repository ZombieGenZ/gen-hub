"use client";

import { useState, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { IsuranceService } from "@/services/Insurance/Insurance.service";
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

    // --- Selection & Actions ---
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    // --- Dialogs ---
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    // --- Edit/Delete Targets ---
    const [targetInsurance, setTargetInsurance] = useState<Insurance | null>(null);

    // --- Fetch Data ---
    const fetchInsurances = async () => {
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
        } catch (error) {
            console.error("Failed to fetch insurances", error);
            showToast("Không thể tải danh sách bảo hiểm", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsurances();
    }, [currentPage, itemsPerPage, statusFilter]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchInsurances();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // --- Handlers ---
    const handleRefresh = () => {
        fetchInsurances();
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setIsDeleteOpen(false);
        setTargetInsurance(null);
        setSelectedIds([]);
    };

    const handleDelete = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token || !targetInsurance) return;

            await insuranceService.deleteInsurance(token, targetInsurance.id);
            showToast("Đã xóa gói bảo hiểm", "success");
            handleRefresh();
        } catch (error) {
            console.error("Failed to delete insurance", error);
            showToast("Xóa thất bại", "error");
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkActionLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await insuranceService.deleteManyInsurances(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} gói bảo hiểm`, "success");
            setIsBulkDeleteDialogOpen(false);
            handleRefresh();
        } catch (error) {
            console.error("Bulk delete failed", error);
            showToast("Xóa nhiều thất bại", "error");
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
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontSize: "32px", lineHeight: "130%" }}>
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
                    className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                    style={{ borderRadius: "12px" }}
                >
                    <PlusIcon className="w-4 h-4" />
                    Thêm bảo hiểm
                </Button>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardContent className="p-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[250px]">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo tên hoặc mô tả..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>

                        {/* Status Filters */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                                onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                                size="sm"
                                className="rounded-full"
                            >
                                Tất cả
                            </Button>
                            <Button
                                variant={statusFilter === 'active' ? 'secondary' : 'ghost'}
                                onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
                                size="sm"
                                className="rounded-full gap-1"
                            >
                                <CheckCircleIcon className="w-4 h-4 text-green-600" /> hoạt động
                            </Button>
                            <Button
                                variant={statusFilter === 'inactive' ? 'secondary' : 'ghost'}
                                onClick={() => { setStatusFilter('inactive'); setCurrentPage(1); }}
                                size="sm"
                                className="rounded-full gap-1"
                            >
                                <XCircleIcon className="w-4 h-4 text-gray-400" /> Không hoạt động
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* List */}
            <Card className="border-0 shadow-premium overflow-hidden" style={{ borderRadius: "24px" }}>
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
                        <div className="p-12 text-center text-muted-foreground">
                            Không tìm thấy gói bảo hiểm nào phù hợp
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
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-muted"
                                                        onClick={() => {
                                                            setTargetInsurance(item);
                                                            setIsEditOpen(true);
                                                        }}
                                                    >
                                                        <PencilIcon className="w-4 h-4 text-gray-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600"
                                                        onClick={() => {
                                                            setTargetInsurance(item);
                                                            setIsDeleteOpen(true);
                                                        }}
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
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
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-border shadow-2xl px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in"
                        style={{ borderRadius: "24px" }}
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
                <DialogContent className="w-[95vw] max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden" style={{ borderRadius: "16px" }}>
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
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa gói bảo hiểm "{targetInsurance?.name}" không?
                            Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} style={{ borderRadius: "12px" }}>Hủy</Button>
                        <Button variant="destructive" onClick={handleDelete} style={{ borderRadius: "12px" }}>Xóa</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Dialog */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <DialogContent style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa nhiều</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa {selectedIds.length} gói bảo hiểm đã chọn không?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkActionLoading} style={{ borderRadius: "12px" }}>Hủy</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkActionLoading} style={{ borderRadius: "12px" }}>
                            {isBulkActionLoading ? "Đang xóa..." : "Xóa tất cả"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
