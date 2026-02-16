"use client";

import React, { useEffect, useState, useCallback } from "react";
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { LocationService } from "@/services/location/location.service";
import { Province } from "@/types/location/provinces.type";
import { toast } from "sonner";

// ── shadcn/ui components ──
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ── Icons ──
import {
    MagnifyingGlassIcon,
    PlusIcon,
    ArrowDownTrayIcon,
    EllipsisHorizontalIcon,
    PencilSquareIcon,
    TrashIcon,
    DocumentDuplicateIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronUpDownIcon,
    XMarkIcon,
    CheckCircleIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";

// ── Services & Constants ──
const warehouseService = new WarehouseTemplateService();
const locationService = new LocationService();
const ITEMS_PER_PAGE = 10;
const IMG_API = process.env.NEXT_PUBLIC_API_URL;

// ────────────────────────────────────────────────
// Helper: format VND
// ────────────────────────────────────────────────
function formatVND(value: string | number): string {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "—";
    return num.toLocaleString("vi-VN") + " ₫";
}

// ────────────────────────────────────────────────
// Helper: badge for warehouse type
// ────────────────────────────────────────────────
function WarehouseTypeBadge({ warehouse }: { warehouse: Warehouse }) {
    if (warehouse.is_cold_storage) {
        return (
            <Badge variant="outline" className="rounded-md font-normal bg-sky-50 text-sky-700 border-sky-200">
                Kho lạnh
            </Badge>
        );
    }
    if (warehouse.is_shared_warehouse) {
        return (
            <Badge variant="outline" className="rounded-md font-normal bg-violet-50 text-violet-700 border-violet-200">
                Chia sẻ
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="rounded-md font-normal bg-white text-gray-600 border-gray-200">
            Tiêu chuẩn
        </Badge>
    );
}

// ════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════
export default function WarehouseTemplatePage() {
    const router = useRouter();

    // ── Data state ──
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Selection state ──
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // ── Dialogs ──
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    // ── Filters ──
    const [searchTerm, setSearchTerm] = useState("");
    const [provinceFilter, setProvinceFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "full">("all");

    // ── Sort ──
    const [sortPriceDir, setSortPriceDir] = useState<"asc" | "desc" | null>(null);

    // ── Pagination ──
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const debouncedKeywords = useDebounce(searchTerm, 500);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // ── Fetch warehouses ──
    const fetchWarehouses = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }

            setLoading(true);
            setError(null);

            const apiParams: Record<string, any> = {
                keywords: debouncedKeywords,
                page: currentPage,
                limit: ITEMS_PER_PAGE,
            };
            if (provinceFilter && provinceFilter !== "all") {
                apiParams.province_id = provinceFilter;
            }
            if (statusFilter === "active") apiParams.is_active = true;
            else if (statusFilter === "inactive") apiParams.is_active = false;
            else if (statusFilter === "full") apiParams.rental_status = "RENTED";

            const data = await warehouseService.getWarehouseTemplates(token, apiParams);

            if (data) {
                let items: Warehouse[] = [];
                let total = 0;
                if (Array.isArray(data)) {
                    items = data;
                    total = data.length;
                } else if (data.items) {
                    items = data.items;
                    total = data.total || 0;
                }
                setWarehouses(items);
                setTotalItems(total);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message === "Unauthorized") { router.push("/login"); return; }
            setError("Không thể tải dữ liệu kho. Vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, provinceFilter, statusFilter, currentPage, router]);

    // ── Fetch provinces ──
    const fetchProvinces = useCallback(async () => {
        try {
            const data = await locationService.getProvinces();
            if (Array.isArray(data)) setProvinces(data);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);
    useEffect(() => { fetchProvinces(); }, [fetchProvinces]);

    // ── Client-side sort ──
    const sortedWarehouses = React.useMemo(() => {
        if (!sortPriceDir) return warehouses;
        return [...warehouses].sort((a, b) => {
            const pa = parseFloat(a.price_per_month) || 0;
            const pb = parseFloat(b.price_per_month) || 0;
            return sortPriceDir === "asc" ? pa - pb : pb - pa;
        });
    }, [warehouses, sortPriceDir]);

    // ── Selection helpers (Array-based like addons) ──
    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(item => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === sortedWarehouses.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(sortedWarehouses.map(w => w.id));
        }
    };

    // ── Delete single ──
    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await warehouseService.deleteWarehouseTemplate(token, deleteTarget.id);
            toast.success(`Đã xóa "${deleteTarget.name}"`);
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
            setSelectedIds([]);
            fetchWarehouses();
        } catch {
            toast.error("Xóa thất bại. Vui lòng thử lại.");
        }
    };

    // ── Bulk delete (matches addons pattern) ──
    const handleBulkDelete = async () => {
        setIsBulkActionLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await warehouseService.deleteManyWarehouseTemplates(token, selectedIds);
            toast.success(`Đã xóa ${selectedIds.length} template`);
            setIsBulkDeleteDialogOpen(false);
            setSelectedIds([]);
            fetchWarehouses();
        } catch {
            toast.error("Xóa thất bại. Vui lòng thử lại.");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // ── Handlers ──
    const handleEdit = (id: string) => router.push(`/dashboard/admin/warehouses/${id}`);
    const handleDuplicate = (warehouse: Warehouse) => {
        router.push(`/dashboard/admin/warehouses/create?duplicate=${warehouse.id}`);
    };
    const handleDelete = (warehouse: Warehouse) => {
        setDeleteTarget(warehouse);
        setDeleteDialogOpen(true);
    };

    // ════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════
    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontSize: "32px", lineHeight: "130%" }}>
                        Quản lý kho
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Quản lý và theo dõi {totalItems} kho hàng trên toàn hệ thống
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2" style={{ borderRadius: "12px" }}>
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Xuất Excel</span>
                    </Button>
                    <Button
                        onClick={() => router.push("/dashboard/admin/warehouses/create")}
                        className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                        style={{ borderRadius: "12px" }}
                    >
                        <PlusIcon className="w-4 h-4" />
                        Thêm kho mới
                    </Button>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardContent className="p-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[250px]">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm kho..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>

                        {/* Province filter */}
                        <Select value={provinceFilter} onValueChange={(v) => { setProvinceFilter(v); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[200px]" style={{ borderRadius: "12px" }}>
                                <SelectValue placeholder="Khu vực: Tất cả" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả khu vực</SelectItem>
                                {provinces.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Status Filters */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant={statusFilter === "all" ? "secondary" : "ghost"}
                                onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
                                size="sm"
                                className="rounded-full"
                            >
                                Tất cả
                            </Button>
                            <Button
                                variant={statusFilter === "active" ? "secondary" : "ghost"}
                                onClick={() => { setStatusFilter("active"); setCurrentPage(1); }}
                                size="sm"
                                className="rounded-full gap-1"
                            >
                                <CheckCircleIcon className="w-4 h-4 text-green-600" /> Hoạt động
                            </Button>
                            <Button
                                variant={statusFilter === "inactive" ? "secondary" : "ghost"}
                                onClick={() => { setStatusFilter("inactive"); setCurrentPage(1); }}
                                size="sm"
                                className="rounded-full gap-1"
                            >
                                <XCircleIcon className="w-4 h-4 text-gray-400" /> Đang bảo trì
                            </Button>
                            <Button
                                variant={statusFilter === "full" ? "secondary" : "ghost"}
                                onClick={() => { setStatusFilter("full"); setCurrentPage(1); }}
                                size="sm"
                                className="rounded-full gap-1"
                            >
                                Đầy kho
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Table ── */}
            <Card className="border-0 shadow-premium overflow-hidden" style={{ borderRadius: "24px" }}>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/30 border-b">
                                <tr>
                                    <th className="w-12 py-3 px-4">
                                        <Checkbox
                                            checked={sortedWarehouses.length > 0 && selectedIds.length === sortedWarehouses.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-[30%]">
                                        Template Info
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Specs
                                    </th>
                                    <th
                                        className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase cursor-pointer select-none"
                                        onClick={() =>
                                            setSortPriceDir(prev =>
                                                prev === null ? "asc" : prev === "asc" ? "desc" : null
                                            )
                                        }
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Price</span>
                                            <ChevronUpDownIcon className="w-4 h-4" />
                                            {sortPriceDir && (
                                                <span className="text-[10px] text-primary">
                                                    {sortPriceDir === "asc" ? "↑" : "↓"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Status
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y relative">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <tr key={`skeleton-${index}`}>
                                            <td className="py-4 px-4"><Skeleton className="h-4 w-4 rounded" /></td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-12 w-12 rounded-lg" />
                                                    <div>
                                                        <Skeleton className="h-5 w-32 mb-2" />
                                                        <Skeleton className="h-4 w-24" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <Skeleton className="h-5 w-24 mb-1" />
                                                <Skeleton className="h-5 w-16 rounded-md" />
                                            </td>
                                            <td className="py-4 px-4"><Skeleton className="h-6 w-28" /></td>
                                            <td className="py-4 px-4"><div className="flex justify-center"><Skeleton className="h-6 w-24 rounded-full" /></div></td>
                                            <td className="py-4 px-4"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-full" /></div></td>
                                        </tr>
                                    ))
                                ) : error ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                                            {error}
                                        </td>
                                    </tr>
                                ) : sortedWarehouses.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                                            Không tìm thấy kho nào phù hợp
                                        </td>
                                    </tr>
                                ) : (
                                    sortedWarehouses.map((w) => (
                                        <tr
                                            key={w.id}
                                            className="hover:bg-muted/50 transition-colors group cursor-pointer"
                                            onClick={() => handleEdit(w.id)}
                                        >
                                            {/* Checkbox */}
                                            <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedIds.includes(w.id)}
                                                    onCheckedChange={() => toggleSelection(w.id)}
                                                />
                                            </td>

                                            {/* Template Info */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                                        {w.images?.[0] ? (
                                                            <img
                                                                src={w.images[0].url?.startsWith("http") ? w.images[0].url : `${IMG_API}${w.images[0].url}`}
                                                                alt={w.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-lg">📦</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-base text-gray-900">{w.name}</div>
                                                        <div className="text-sm text-muted-foreground/80 mt-0.5 font-normal">
                                                            {w.ward?.province?.name || "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Specs */}
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        {w.length} × {w.width} m
                                                    </span>
                                                    <WarehouseTypeBadge warehouse={w} />
                                                </div>
                                            </td>

                                            {/* Price */}
                                            <td className="py-4 px-4">
                                                <div className="font-bold text-base text-[#0F766E]">
                                                    {formatVND(w.price_per_month)}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="py-4 px-4 text-center">
                                                {w.is_active ? (
                                                    <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 gap-1 pl-1 pr-2 rounded-full shadow-none font-normal">
                                                        <CheckCircleIcon className="w-4 h-4" /> Hoạt động
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="gap-1 pl-1 pr-2 rounded-full shadow-none font-normal text-muted-foreground">
                                                        <XCircleIcon className="w-4 h-4" /> Khóa
                                                    </Badge>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                                <EllipsisHorizontalIcon className="w-5 h-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(w.id)}>
                                                                <PencilSquareIcon className="w-4 h-4 mr-2" />
                                                                Chỉnh sửa
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDuplicate(w)}>
                                                                <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                                                                Nhân bản
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => handleDelete(w)}
                                                            >
                                                                <TrashIcon className="w-4 h-4 mr-2" />
                                                                Xóa
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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

            {/* ── Pagination ── */}
            {totalItems > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1} đến {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} trong tổng số {totalItems} kết quả
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
                                    <React.Fragment key={page}>
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className="text-gray-400">...</span>
                                        )}
                                        <Button
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => { setCurrentPage(page); setSelectedIds([]); }}
                                            className={`h-8 min-w-[32px] rounded-lg ${currentPage === page ? "bg-[#0F766E] hover:bg-[#0F766E]/90" : "text-gray-600"}`}
                                        >
                                            {page}
                                        </Button>
                                    </React.Fragment>
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

            {/* ══════════════════════════════════════════
                Floating Bulk Action Bar (Addons Pattern)
               ══════════════════════════════════════════ */}
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

            {/* ── Delete Confirmation Dialog ── */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa kho &quot;{deleteTarget?.name}&quot; không?
                            Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} style={{ borderRadius: "12px" }}>
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} style={{ borderRadius: "12px" }}>
                            Xóa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Bulk Delete Dialog ── */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <DialogContent style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa nhiều</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa {selectedIds.length} template đã chọn không?
                            Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkActionLoading} style={{ borderRadius: "12px" }}>
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkActionLoading} style={{ borderRadius: "12px" }}>
                            {isBulkActionLoading ? "Đang xóa..." : "Xóa tất cả"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}